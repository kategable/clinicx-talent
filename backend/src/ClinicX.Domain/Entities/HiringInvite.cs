namespace ClinicX.Domain.Entities;

public class HiringInvite
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public Guid OpportunityId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public bool Active { get; set; } = true;
    public DateTime? DeletedAtUtc { get; set; }

    public HiringOpportunity Opportunity { get; set; } = null!;
}
