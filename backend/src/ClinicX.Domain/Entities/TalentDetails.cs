namespace ClinicX.Domain.Entities;

public class TalentDetails
{
    public Guid AccountId { get; set; }
    public string ProfessionalName { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public string VideoUrl { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string YearsExperience { get; set; } = string.Empty;
    public string ExperienceTimeline { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public List<string> CertificateUrls { get; set; } = new();
    public string Availability { get; set; } = string.Empty;
    public string SalaryExpectation { get; set; } = string.Empty;
    public string Languages { get; set; } = string.Empty;
    public string PortfolioUrl { get; set; } = string.Empty;
    public List<string> GalleryUrls { get; set; } = new();
    public string Introduction { get; set; } = string.Empty;

    public Account Account { get; set; } = null!;
}
