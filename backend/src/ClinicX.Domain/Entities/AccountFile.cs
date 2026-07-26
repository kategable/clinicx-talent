namespace ClinicX.Domain.Entities;

/// <summary>
/// Tracks every uploaded file (certificates, photos, videos) with its
/// Azure Blob Storage path. Soft-deleted files are not purged from Blob
/// until a hard-delete is approved by two admins.
/// </summary>
public class AccountFile
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public Guid AccountId { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string OriginalName { get; set; } = string.Empty;
    public string Category { get; set; } = "other"; // photo, video, certificate, gallery
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public DateTime? DeletedAtUtc { get; set; }

    public Account Account { get; set; } = null!;
}
