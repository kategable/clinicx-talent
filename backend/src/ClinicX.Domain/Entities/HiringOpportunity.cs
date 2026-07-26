using ClinicX.Domain.Enums;

namespace ClinicX.Domain.Entities;

public class HiringOpportunity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid ClinicAccountId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string PositionSlug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string PayRange { get; set; } = string.Empty;
    public string MustHaveSkills { get; set; } = string.Empty;
    public string Benefits { get; set; } = string.Empty;
    public string Urgency { get; set; } = string.Empty;
    public string IdealHire { get; set; } = string.Empty;
    public OpportunityStatus Status { get; set; } = OpportunityStatus.Active;
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>ISO 8601 timestamp when soft-deleted by the clinic owner.</summary>
    public DateTime? DeletedAtUtc { get; set; }

    public Account ClinicAccount { get; set; } = null!;
    public ICollection<HiringInvite> Invites { get; set; } = new List<HiringInvite>();
    public ICollection<TalentApplication> Applications { get; set; } = new List<TalentApplication>();
}
