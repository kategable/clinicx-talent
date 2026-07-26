using ClinicX.Domain.Enums;

namespace ClinicX.Domain.Entities;

/// <summary>
/// Core account entity for both clinics and talent. Phone is the primary
/// identifier for SMS auth; Google-linked accounts may omit phone initially.
/// </summary>
public class Account
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public AccountType Type { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string DisplayPhone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool ShareEmail { get; set; }
    public bool SharePhone { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.UnderReview;
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool ProfileComplete { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public ThemePreference ThemePreference { get; set; } = ThemePreference.Auto;
    public bool Founder { get; set; }

    /// <summary>ISO 8601 timestamp when soft-deleted; null means active.</summary>
    public DateTime? DeletedAtUtc { get; set; }

    // Navigation properties
    public ClinicDetails? ClinicDetails { get; set; }
    public TalentDetails? TalentDetails { get; set; }
    public ICollection<ExternalLogin> ExternalLogins { get; set; } = new List<ExternalLogin>();
    public ICollection<AccountFile> Files { get; set; } = new List<AccountFile>();

    // Audit
    public Guid? DeletedByAccountId { get; set; }
}
