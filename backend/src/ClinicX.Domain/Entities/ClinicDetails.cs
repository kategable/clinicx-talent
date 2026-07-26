namespace ClinicX.Domain.Entities;

public class ClinicDetails
{
    public Guid AccountId { get; set; }
    public string ClinicName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string Specialties { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string MustHaveSkills { get; set; } = string.Empty;
    public string PayRange { get; set; } = string.Empty;
    public string Benefits { get; set; } = string.Empty;
    public string Urgency { get; set; } = string.Empty;
    public string IdealHire { get; set; } = string.Empty;

    public Account Account { get; set; } = null!;
}
