using ClinicX.Domain.Entities;
using ClinicX.Domain.Enums;
using ClinicX.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicX.Api.Controllers;

[ApiController]
[Route("api/v1/accounts")]
public class AccountsController(ClinicXDbContext db) : ControllerBase
{
    /// <summary>Get the current account (by ID header — MVP, no JWT yet).</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe([FromHeader] string accountId)
    {
        var account = await db.Accounts
            .Include(a => a.ClinicDetails)
            .Include(a => a.TalentDetails)
            .FirstOrDefaultAsync(a => a.Id.ToString() == accountId);

        if (account == null)
            return NotFound(new { error = "Account not found." });

        return Ok(MapAccount(account));
    }

    /// <summary>List all active accounts (admin).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type)
    {
        var query = db.Accounts.AsQueryable();
        if (!string.IsNullOrEmpty(type))
        {
            var accountType = type == "clinic" ? AccountType.Clinic : AccountType.Talent;
            query = query.Where(a => a.Type == accountType);
        }

        var accounts = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(100)
            .ToListAsync();

        return Ok(accounts.Select(MapAccount));
    }

    /// <summary>Update account contact and sharing preferences.</summary>
    [HttpPut("me/contact")]
    public async Task<IActionResult> UpdateContact(
        [FromHeader] string accountId,
        [FromBody] UpdateContactRequest request)
    {
        var account = await db.Accounts.FindAsync(Guid.Parse(accountId));
        if (account == null) return NotFound();

        account.Email = request.Email ?? account.Email;
        account.DisplayPhone = request.DisplayPhone ?? account.DisplayPhone;
        account.ShareEmail = request.ShareEmail ?? account.ShareEmail;
        account.SharePhone = request.SharePhone ?? account.SharePhone;
        account.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapAccount(account));
    }

    /// <summary>Update clinic details.</summary>
    [HttpPut("me/clinic-details")]
    public async Task<IActionResult> UpdateClinicDetails(
        [FromHeader] string accountId,
        [FromBody] UpdateClinicDetailsRequest request)
    {
        var account = await db.Accounts
            .Include(a => a.ClinicDetails)
            .FirstOrDefaultAsync(a => a.Id.ToString() == accountId);

        if (account == null || account.Type != AccountType.Clinic)
            return NotFound();

        account.ClinicDetails ??= new ClinicDetails { AccountId = account.Id };

        account.ClinicDetails.ClinicName = request.ClinicName;
        account.ClinicDetails.Location = request.Location ?? "";
        account.ClinicDetails.City = request.City ?? "";
        account.ClinicDetails.State = request.State ?? "";
        account.ClinicDetails.Website = request.Website ?? "";
        account.ClinicDetails.Specialties = request.Specialties ?? "";
        account.ClinicDetails.About = request.About ?? "";
        account.ClinicDetails.Position = request.Position ?? "";
        account.ClinicDetails.MustHaveSkills = request.MustHaveSkills ?? "";
        account.ClinicDetails.PayRange = request.PayRange ?? "";
        account.ClinicDetails.Benefits = request.Benefits ?? "";
        account.ClinicDetails.Urgency = request.Urgency ?? "";
        account.ClinicDetails.IdealHire = request.IdealHire ?? "";
        account.DisplayName = request.ClinicName;
        account.ProfileComplete = true;
        account.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapAccount(account));
    }

    /// <summary>Update talent details.</summary>
    [HttpPut("me/talent-details")]
    public async Task<IActionResult> UpdateTalentDetails(
        [FromHeader] string accountId,
        [FromBody] UpdateTalentDetailsRequest request)
    {
        var account = await db.Accounts
            .Include(a => a.TalentDetails)
            .FirstOrDefaultAsync(a => a.Id.ToString() == accountId);

        if (account == null || account.Type != AccountType.Talent)
            return NotFound();

        account.TalentDetails ??= new TalentDetails { AccountId = account.Id };

        account.TalentDetails.ProfessionalName = request.ProfessionalName;
        account.TalentDetails.Role = request.Role ?? "";
        account.TalentDetails.Location = request.Location ?? "";
        account.TalentDetails.YearsExperience = request.YearsExperience ?? "";
        account.TalentDetails.ExperienceTimeline = request.ExperienceTimeline ?? "";
        account.TalentDetails.Skills = request.Skills ?? "";
        account.TalentDetails.Availability = request.Availability ?? "";
        account.TalentDetails.SalaryExpectation = request.SalaryExpectation ?? "";
        account.TalentDetails.Languages = request.Languages ?? "";
        account.TalentDetails.PortfolioUrl = request.PortfolioUrl ?? "";
        account.TalentDetails.Introduction = request.Introduction ?? "";
        account.DisplayName = request.ProfessionalName;
        account.ProfileComplete = true;
        account.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapAccount(account));
    }

    /// <summary>Admin: set review status.</summary>
    [HttpPut("{id}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetStatusRequest request)
    {
        var account = await db.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id);
        if (account == null) return NotFound();

        account.Status = request.Status switch
        {
            "approved" => ReviewStatus.Approved,
            "on-hold" => ReviewStatus.OnHold,
            _ => ReviewStatus.UnderReview,
        };
        account.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(MapAccount(account));
    }

    /// <summary>Soft-delete an account.</summary>
    [HttpPut("{id}/delete")]
    public async Task<IActionResult> SoftDelete(Guid id)
    {
        var account = await db.Accounts.FindAsync(id);
        if (account == null) return NotFound();

        account.DeletedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>Restore a soft-deleted account.</summary>
    [HttpPut("{id}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var account = await db.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == id);
        if (account == null) return NotFound();

        account.DeletedAtUtc = null;
        await db.SaveChangesAsync();
        return Ok(MapAccount(account));
    }

    // -- Mapping ------------------------------------------------------------

    private static object MapAccount(Account a) => new
    {
        a.Id, type = a.Type.ToString().ToLower(), a.Phone, a.DisplayPhone,
        a.Email, a.ShareEmail, a.SharePhone,
        status = a.Status.ToString().ToLower(),
        createdAt = a.CreatedAtUtc.ToString("MMM dd, yyyy"),
        a.ProfileComplete, a.DisplayName,
        themePreference = a.ThemePreference.ToString().ToLower(),
        a.Founder, deletedAt = a.DeletedAtUtc?.ToString("MMM dd, yyyy"),
        clinicDetails = a.ClinicDetails == null ? null : MapClinicDetails(a.ClinicDetails),
        talentDetails = a.TalentDetails == null ? null : MapTalentDetails(a.TalentDetails),
    };

    private static object MapClinicDetails(ClinicDetails d) => new
    {
        d.ClinicName, d.Location, d.City, d.State, d.Website,
        d.Specialties, d.About, d.Position,
        d.MustHaveSkills, d.PayRange, d.Benefits, d.Urgency, d.IdealHire,
    };

    private static object MapTalentDetails(TalentDetails d) => new
    {
        d.ProfessionalName, d.PhotoUrl, d.VideoUrl, d.Role,
        d.Location, d.YearsExperience, d.ExperienceTimeline,
        d.Skills, certificateUrls = d.CertificateUrls, d.Availability,
        d.SalaryExpectation, d.Languages, d.PortfolioUrl,
        galleryUrls = d.GalleryUrls, d.Introduction,
    };
}

// -- Request DTOs -----------------------------------------------------------

public record UpdateContactRequest(
    string? Email, string? DisplayPhone, bool? ShareEmail, bool? SharePhone);
public record UpdateClinicDetailsRequest(
    string ClinicName, string? Location, string? City, string? State,
    string? Website, string? Specialties, string? About, string? Position,
    string? MustHaveSkills, string? PayRange, string? Benefits,
    string? Urgency, string? IdealHire);
public record UpdateTalentDetailsRequest(
    string ProfessionalName, string? Role, string? Location,
    string? YearsExperience, string? ExperienceTimeline, string? Skills,
    string? Availability, string? SalaryExpectation, string? Languages,
    string? PortfolioUrl, string? Introduction);
public record SetStatusRequest(string Status);
