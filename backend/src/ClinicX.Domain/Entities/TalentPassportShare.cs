namespace ClinicX.Domain.Entities;

public class TalentPassportShare
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public Guid TalentAccountId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public bool Active { get; set; } = true;
    public DateTime? DeletedAtUtc { get; set; }

    public Account TalentAccount { get; set; } = null!;
}
