namespace ClinicX.Domain.Entities;

/// <summary>
/// Links a Google (or other external) account to a ClinicX account.
/// The `ProviderKey` is the Google `sub` claim.
/// </summary>
public class ExternalLogin
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid AccountId { get; set; }
    public string Provider { get; set; } = "Google";
    public string ProviderKey { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;

    public Account Account { get; set; } = null!;
}
