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
}

// -- Request DTOs -----------------------------------------------------------

public record SendCodeRequest(string Phone);
public record VerifyCodeRequest(string Phone, string Code);
public record CreateAccountRequest(string Phone, string Type);
public record AdminLoginRequest(string Username, string Password);
