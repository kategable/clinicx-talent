using ClinicX.Domain.Entities;
using ClinicX.Domain.Enums;
using ClinicX.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicX.Api.Controllers;

[ApiController]
[Route("api/v1/hiring")]
public class HiringController(ClinicXDbContext db) : ControllerBase
{
    // -- Opportunities ------------------------------------------------------

    [HttpGet("opportunities")]
    public async Task<IActionResult> GetOpportunities([FromQuery] string? clinicAccountId)
    {
        var query = db.HiringOpportunities.AsQueryable();
        if (!string.IsNullOrEmpty(clinicAccountId))
            query = query.Where(o => o.ClinicAccountId.ToString() == clinicAccountId);

        var opportunities = await query
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();

        return Ok(opportunities.Select(MapOpportunity));
    }

    [HttpPost("opportunities")]
    public async Task<IActionResult> CreateOpportunity(
        [FromHeader] string accountId,
        [FromBody] CreateOpportunityRequest request)
    {
        var slug = GenerateSlug(request.ClinicName);
        var positionSlug = GenerateSlug(request.Position);

        var opportunity = new HiringOpportunity
        {
            ClinicAccountId = Guid.Parse(accountId),
            Slug = slug,
            PositionSlug = positionSlug,
            Title = request.Position,
            Location = request.Location ?? "",
            PayRange = request.PayRange ?? "",
            MustHaveSkills = request.MustHaveSkills ?? "",
            Benefits = request.Benefits ?? "",
            Urgency = request.Urgency ?? "",
            IdealHire = request.IdealHire ?? "",
        };

        db.HiringOpportunities.Add(opportunity);

        var invite = new HiringInvite
        {
            OpportunityId = opportunity.Id,
            Token = GenerateToken(),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(30),
        };
        db.HiringInvites.Add(invite);

        await db.SaveChangesAsync();

        return Ok(new
        {
            opportunity = MapOpportunity(opportunity),
            invite = MapInvite(invite),
            shareUrl = $"/join/{slug}/{positionSlug}?invite={invite.Token}",
        });
    }

    [HttpPut("opportunities/{id}/delete")]
    public async Task<IActionResult> DeleteOpportunity(Guid id)
    {
        var opp = await db.HiringOpportunities.FindAsync(id);
        if (opp == null) return NotFound();
        opp.DeletedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("opportunities/{id}/restore")]
    public async Task<IActionResult> RestoreOpportunity(Guid id)
    {
        var opp = await db.HiringOpportunities.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.Id == id);
        if (opp == null) return NotFound();
        opp.DeletedAtUtc = null;
        await db.SaveChangesAsync();
        return Ok(MapOpportunity(opp));
    }

    // -- Invites ------------------------------------------------------------

    [HttpPost("opportunities/{id}/invites")]
    public async Task<IActionResult> CreateInvite(Guid id)
    {
        var opp = await db.HiringOpportunities.FindAsync(id);
        if (opp == null) return NotFound();

        var invite = new HiringInvite
        {
            OpportunityId = id,
            Token = GenerateToken(),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(30),
        };
        db.HiringInvites.Add(invite);
        await db.SaveChangesAsync();

        return Ok(MapInvite(invite));
    }

    [HttpPut("invites/{id}/delete")]
    public async Task<IActionResult> DeleteInvite(Guid id)
    {
        var invite = await db.HiringInvites.FindAsync(id);
        if (invite == null) return NotFound();
        invite.DeletedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // -- Passports ----------------------------------------------------------

    [HttpPost("passports")]
    public async Task<IActionResult> CreatePassport([FromHeader] string accountId)
    {
        var passport = new TalentPassportShare
        {
            TalentAccountId = Guid.Parse(accountId),
            Token = GenerateToken(),
        };
        db.TalentPassportShares.Add(passport);
        await db.SaveChangesAsync();

        return Ok(MapPassport(passport));
    }

    [HttpPut("passports/{id}/delete")]
    public async Task<IActionResult> DeletePassport(Guid id)
    {
        var passport = await db.TalentPassportShares.FindAsync(id);
        if (passport == null) return NotFound();
        passport.DeletedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("passports/{id}/restore")]
    public async Task<IActionResult> RestorePassport(Guid id)
    {
        var passport = await db.TalentPassportShares.IgnoreQueryFilters().FirstOrDefaultAsync(o => o.Id == id);
        if (passport == null) return NotFound();
        passport.DeletedAtUtc = null;
        await db.SaveChangesAsync();
        return Ok(MapPassport(passport));
    }

    // -- Applications -------------------------------------------------------

    [HttpGet("applications")]
    public async Task<IActionResult> GetApplications(
        [FromQuery] string? clinicAccountId, [FromQuery] string? talentAccountId)
    {
        var query = db.TalentApplications.AsQueryable();
        if (!string.IsNullOrEmpty(clinicAccountId))
            query = query.Where(a => a.ClinicAccountId.ToString() == clinicAccountId);
        if (!string.IsNullOrEmpty(talentAccountId))
            query = query.Where(a => a.TalentAccountId.ToString() == talentAccountId);

        var apps = await query
            .OrderByDescending(a => a.SubmittedAtUtc)
            .ToListAsync();

        return Ok(apps.Select(MapApplication));
    }

    [HttpPost("applications")]
    public async Task<IActionResult> CreateApplication(
        [FromHeader] string accountId,
        [FromBody] CreateApplicationRequest request)
    {
        var app = new TalentApplication
        {
            TalentAccountId = Guid.Parse(request.TalentAccountId ?? accountId),
            ClinicAccountId = Guid.Parse(request.ClinicAccountId ?? accountId),
            OpportunityId = request.OpportunityId != null ? Guid.Parse(request.OpportunityId) : null,
            Source = request.Source == "talent-passport"
                ? ApplicationSource.TalentPassport
                : ApplicationSource.ClinicHiringLink,
            Status = ApplicationStatus.Invited,
        };

        db.TalentApplications.Add(app);
        await db.SaveChangesAsync();
        return Ok(MapApplication(app));
    }

    [HttpPut("applications/{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var app = await db.TalentApplications.FindAsync(id);
        if (app == null) return NotFound();

        app.Status = request.Status switch
        {
            "interested" => ApplicationStatus.Interested,
            "profile-in-progress" => ApplicationStatus.ProfileInProgress,
            "under-review" => ApplicationStatus.UnderReview,
            "ready-to-review" => ApplicationStatus.ReadyToReview,
            "interview-requested" => ApplicationStatus.InterviewRequested,
            "closed" => ApplicationStatus.Closed,
            _ => ApplicationStatus.Invited,
        };
        app.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(MapApplication(app));
    }

    // -- Public endpoints ---------------------------------------------------

    [HttpGet("public/opportunity/{clinicSlug}/{positionSlug}")]
    public async Task<IActionResult> GetPublicOpportunity(string clinicSlug, string positionSlug)
    {
        var opp = await db.HiringOpportunities
            .Include(o => o.ClinicAccount)
            .FirstOrDefaultAsync(o => o.Slug == clinicSlug && o.PositionSlug == positionSlug);

        if (opp == null) return NotFound();

        return Ok(new
        {
            opportunity = MapOpportunity(opp),
            clinic = new { opp.ClinicAccount.DisplayName, opp.ClinicAccount.Phone },
        });
    }

    [HttpGet("public/passport/{talentSlug}")]
    public async Task<IActionResult> GetPublicPassport(string talentSlug)
    {
        var accounts = await db.Accounts.ToListAsync();
        var account = accounts.FirstOrDefault(a =>
            GenerateSlug(a.DisplayName) == talentSlug);

        if (account == null) return NotFound();

        await db.Entry(account).Reference(a => a.TalentDetails).LoadAsync();

        return Ok(MapAccount(account));
    }

    // -- Helpers ------------------------------------------------------------

    private static string GenerateSlug(string text) =>
        System.Text.RegularExpressions.Regex.Replace(
            text.ToLower().Replace("'", ""), @"[^a-z0-9]+", "-")
            .Trim('-');

    private static string GenerateToken() =>
        $"{DateTime.UtcNow.Ticks:x}-{Guid.NewGuid().ToString("N")[..8]}";

    private static object MapOpportunity(HiringOpportunity o) => new
    {
        o.Id, o.ClinicAccountId, o.Slug, o.PositionSlug,
        o.Title, o.Location, o.PayRange, o.MustHaveSkills,
        o.Benefits, o.Urgency, o.IdealHire,
        status = o.Status.ToString().ToLower(),
        createdAt = o.CreatedAtUtc.ToString("MMM dd, yyyy"),
        deletedAt = o.DeletedAtUtc?.ToString("MMM dd, yyyy"),
    };

    private static object MapInvite(HiringInvite i) => new
    {
        i.Id, i.OpportunityId, i.Token,
        createdAt = i.CreatedAtUtc.ToString("MMM dd, yyyy"),
        expiresAt = i.ExpiresAtUtc.ToString("MMM dd, yyyy"),
        i.Active, deletedAt = i.DeletedAtUtc?.ToString("MMM dd, yyyy"),
    };

    private static object MapPassport(TalentPassportShare p) => new
    {
        p.Id, p.TalentAccountId, p.Token,
        createdAt = p.CreatedAtUtc.ToString("MMM dd, yyyy"),
        p.Active, deletedAt = p.DeletedAtUtc?.ToString("MMM dd, yyyy"),
    };

    private static object MapApplication(TalentApplication a) => new
    {
        a.Id, a.OpportunityId, a.TalentAccountId, a.ClinicAccountId,
        source = a.Source == ApplicationSource.ClinicHiringLink
            ? "clinic-hiring-link"
            : a.Source == ApplicationSource.TalentPassport ? "talent-passport" : "clinicx-match",
        status = a.Status.ToString().ToLower().Replace("profileinprogress", "profile-in-progress")
            .Replace("underreview", "under-review").Replace("readytoreview", "ready-to-review")
            .Replace("interviewrequested", "interview-requested"),
        acceptedAt = a.AcceptedAtUtc.ToString("MMM dd, yyyy"),
        submittedAt = a.SubmittedAtUtc.ToString("MMM dd, yyyy"),
    };

    // Reuse the account mapping from AccountsController
    private static object MapAccount(Account a) => new
    {
        a.Id, type = a.Type.ToString().ToLower(), a.Phone, a.DisplayPhone,
        a.Email, status = a.Status.ToString().ToLower(),
        createdAt = a.CreatedAtUtc.ToString("MMM dd, yyyy"),
        a.ProfileComplete, a.DisplayName, a.Founder,
        talentDetails = a.TalentDetails == null ? null : new
        {
            a.TalentDetails.ProfessionalName, a.TalentDetails.Role,
            a.TalentDetails.Location, a.TalentDetails.YearsExperience,
            a.TalentDetails.Skills, a.TalentDetails.Introduction,
        },
    };
}

// -- Request DTOs -----------------------------------------------------------

public record CreateOpportunityRequest(
    string ClinicName, string Position, string? Location, string? PayRange,
    string? MustHaveSkills, string? Benefits, string? Urgency, string? IdealHire);
public record CreateApplicationRequest(
    string? TalentAccountId, string? ClinicAccountId, string? OpportunityId, string? Source);
public record UpdateStatusRequest(string Status);
