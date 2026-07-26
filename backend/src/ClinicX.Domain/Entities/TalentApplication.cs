using ClinicX.Domain.Enums;

namespace ClinicX.Domain.Entities;

public class TalentApplication
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid? OpportunityId { get; set; }
    public Guid TalentAccountId { get; set; }
    public Guid ClinicAccountId { get; set; }
    public ApplicationSource Source { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Invited;
    public DateTime AcceptedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public HiringOpportunity? Opportunity { get; set; }
    public Account TalentAccount { get; set; } = null!;
    public Account ClinicAccount { get; set; } = null!;
}
