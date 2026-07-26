namespace ClinicX.Domain.Entities;

/// <summary>
/// Tracks SMS verification attempts per phone. The plaintext code is never
/// stored; only a bcrypt hash is persisted. Expired records are cleaned up
/// by a background job.
/// </summary>
public class PhoneVerification
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Phone { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }
    public int AttemptCount { get; set; }
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
}
