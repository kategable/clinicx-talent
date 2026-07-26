using ClinicX.Domain.Entities;
using ClinicX.Domain.Enums;
using ClinicX.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicX.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(ClinicXDbContext db) : ControllerBase
{
    /// <summary>
    /// Send a 6-digit SMS verification code. In dev mode, the code is always
    /// "123456" and is returned in the response (bypasses Twilio/ACS).
    /// </summary>
    [HttpPost("send-code")]
    public async Task<IActionResult> SendCode([FromBody] SendCodeRequest request)
    {
        var phone = NormalizePhone(request.Phone);
        if (phone.Length != 10)
            return BadRequest(new { error = "Enter a 10-digit US phone number." });

        // Rate limit: max 3 attempts per phone
        var recentAttempts = await db.PhoneVerifications
            .CountAsync(v => v.Phone == phone && v.CreatedAtUtc > DateTime.UtcNow.AddMinutes(-15));

        if (recentAttempts >= 3)
            return StatusCode(429, new { error = "This phone number has been temporarily locked." });

        // In dev mode, always use 123456
        var code = "123456";
        var codeHash = BCrypt.Net.BCrypt.HashPassword(code);

        db.PhoneVerifications.Add(new PhoneVerification
        {
            Phone = phone,
            CodeHash = codeHash,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(5),
        });
        await db.SaveChangesAsync();

        return Ok(new { success = true, code = code }); // code returned for dev convenience
    }

    /// <summary>
    /// Verify SMS code and return account info. Creates account if new phone.
    /// </summary>
    [HttpPost("verify-code")]
    public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeRequest request)
    {
        var phone = NormalizePhone(request.Phone);

        var verification = await db.PhoneVerifications
            .Where(v => v.Phone == phone && v.VerifiedAtUtc == null)
            .OrderByDescending(v => v.CreatedAtUtc)
            .FirstOrDefaultAsync();

        if (verification == null || verification.ExpiresAtUtc < DateTime.UtcNow)
            return BadRequest(new { error = "Code expired. Request a new one." });

        verification.AttemptCount++;

        if (!BCrypt.Net.BCrypt.Verify(request.Code, verification.CodeHash))
        {
            await db.SaveChangesAsync();
            return BadRequest(new { error = "The code does not match this phone number." });
        }

        verification.VerifiedAtUtc = DateTime.UtcNow;

        // Check for existing account
        var account = await db.Accounts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Phone == phone);

        if (account != null)
        {
            await db.SaveChangesAsync();
            return Ok(MapExistingAccount(account));
        }

        // New account — return isNewAccount flag
        await db.SaveChangesAsync();
        return Ok(new
        {
            isNewAccount = true,
            phone = request.Phone,
            token = "mock-jwt", // TODO: real JWT
        });
    }

    /// <summary>
    /// Create a new account after phone verification.
    /// </summary>
    [HttpPost("create-account")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        var phone = NormalizePhone(request.Phone);

        var account = new Account
        {
            Type = request.Type == "clinic" ? AccountType.Clinic : AccountType.Talent,
            Phone = phone,
            DisplayPhone = request.Phone,
            DisplayName = request.Type == "clinic" ? "New clinic" : "New talent",
            Status = ReviewStatus.UnderReview,
            Founder = await db.Accounts.IgnoreQueryFilters().CountAsync() < 1000,
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync();

        return Ok(MapAccount(account));
    }

    /// <summary>
    /// Google OAuth sign-in. Accepts a Google ID token.
    /// In dev mode: accepts any token and returns a demo account.
    /// In production: validates the token with Google's API.
    /// </summary>
    [HttpPost("google")]
    public async Task<IActionResult> GoogleSignIn([FromBody] GoogleSignInRequest request)
    {
        // In dev mode, accept a demo token and return a mock account
        if (request.IdToken == "mock-google-id-token" || request.IdToken.StartsWith("mock"))
        {
            return Ok(MapExistingAccount(BuildDemoTalent()));
        }

        // Production: validate with Google
        try
        {
            using var http = new HttpClient();
            var response = await http.GetAsync(
                $"https://oauth2.googleapis.com/tokeninfo?id_token={request.IdToken}");

            if (!response.IsSuccessStatusCode)
                return BadRequest(new { error = "Invalid Google token." });

            var payload = await response.Content.ReadFromJsonAsync<GoogleTokenPayload>();
            if (payload == null || string.IsNullOrEmpty(payload.Sub))
                return BadRequest(new { error = "Invalid Google token payload." });

            // Find existing ExternalLogin or create new account
            var login = await db.ExternalLogins
                .Include(l => l.Account)
                .FirstOrDefaultAsync(l => l.Provider == "Google" && l.ProviderKey == payload.Sub);

            if (login != null)
            {
                var account = await db.Accounts
                    .Include(a => a.ClinicDetails)
                    .Include(a => a.TalentDetails)
                    .FirstOrDefaultAsync(a => a.Id == login.AccountId);

                return account != null
                    ? Ok(MapExistingAccount(account))
                    : BadRequest(new { error = "Linked account not found." });
            }

            // New Google user — need phone verification
            var newAccount = new Account
            {
                Type = AccountType.Talent,
                Email = payload.Email ?? "",
                DisplayName = payload.Name ?? "New talent",
                Status = ReviewStatus.UnderReview,
                Founder = await db.Accounts.IgnoreQueryFilters().CountAsync() < 1000,
            };

            db.Accounts.Add(newAccount);
            db.ExternalLogins.Add(new ExternalLogin
            {
                AccountId = newAccount.Id,
                Provider = "Google",
                ProviderKey = payload.Sub,
            });
            await db.SaveChangesAsync();

            return Ok(new
            {
                isNewAccount = true,
                phoneRequired = true,
                token = "mock-jwt",
                account = MapAccount(newAccount),
            });
        }
        catch
        {
            return BadRequest(new { error = "Failed to validate Google token." });
        }
    }

    /// <summary>Admin login (hardcoded dev credentials).</summary>
    [HttpPost("admin/login")]
    public async Task<IActionResult> AdminLogin([FromBody] AdminLoginRequest request)
    {
        var admin = await db.AdminUsers
            .FirstOrDefaultAsync(a => a.Username == request.Username);

        if (admin == null || !BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
            return Unauthorized(new { error = "Incorrect admin credentials." });

        return Ok(new { token = "mock-admin-jwt", username = admin.Username });
    }

    // -- Helpers ------------------------------------------------------------

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return digits.PadLeft(10, '0')[^10..];
    }

    private static object MapAccount(Account a) => new
    {
        a.Id, type = a.Type.ToString().ToLower(), a.Phone, a.DisplayPhone,
        a.Email, a.ShareEmail, a.SharePhone,
        status = a.Status.ToString().ToLower(),
        createdAt = a.CreatedAtUtc.ToString("MMM dd, yyyy"),
        a.ProfileComplete, a.DisplayName,
        themePreference = a.ThemePreference.ToString().ToLower(),
        a.Founder,
    };

    private object MapExistingAccount(Account a) => new
    {
        isNewAccount = false,
        token = "mock-jwt",
        account = MapAccount(a),
    };

    private static Account BuildDemoTalent() => new()
    {
        Type = AccountType.Talent,
        Email = "demo@gmail.com",
        DisplayName = "Demo User",
        Status = ReviewStatus.Approved,
        ProfileComplete = true,
        Founder = false,
    };
}

// -- Request DTOs -----------------------------------------------------------

public record SendCodeRequest(string Phone);
public record VerifyCodeRequest(string Phone, string Code);
public record CreateAccountRequest(string Phone, string Type);
public record AdminLoginRequest(string Username, string Password);
public record GoogleSignInRequest(string IdToken);

// -- Google token payload ---------------------------------------------------

public class GoogleTokenPayload
{
    public string Sub { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Picture { get; set; }
}
