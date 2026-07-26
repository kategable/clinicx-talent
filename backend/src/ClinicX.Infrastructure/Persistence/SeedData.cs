using ClinicX.Domain.Entities;
using ClinicX.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ClinicX.Infrastructure.Persistence;

public static class SeedData
{
    public static async Task InitializeAsync(ClinicXDbContext db)
    {
        if (await db.Accounts.AnyAsync()) return;

        var now = DateTime.UtcNow;

        // -- Admin user ------------------------------------------------------
        db.AdminUsers.Add(new AdminUser
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
        });

        // -- Seed accounts (matching frontend SEEDED_ACCOUNTS) ---------------
        var radiance = new Account
        {
            Type = AccountType.Clinic,
            Phone = "3125550101",
            DisplayPhone = "(312) 555-0101",
            Status = ReviewStatus.Approved,
            CreatedAtUtc = now,
            ProfileComplete = true,
            DisplayName = "Radiance Med Clinic",
            Founder = true,
        };

        var sophia = new Account
        {
            Type = AccountType.Talent,
            Phone = "3125550102",
            DisplayPhone = "(312) 555-0102",
            Status = ReviewStatus.Approved,
            CreatedAtUtc = now,
            ProfileComplete = true,
            DisplayName = "Sophia Chen, RN",
            Founder = true,
        };

        db.Accounts.AddRange(radiance, sophia);
        await db.SaveChangesAsync();

        // -- Details (separate save so FKs are populated) --------------------
        db.ClinicDetails.Add(new ClinicDetails
        {
            AccountId = radiance.Id,
            ClinicName = "Radiance Med Clinic",
            Location = "Lincoln Park, Chicago, IL",
            City = "Chicago",
            State = "IL",
            Website = "https://radiancemed.example",
            Specialties = "Injectables, laser resurfacing, medical-grade peels",
            About = "A physician-led clinic focused on natural-looking results.",
            Position = "RN Injector",
            MustHaveSkills = "Injectables, laser treatments, patient education",
            PayRange = "$90,000–$120,000",
            Benefits = "Health, dental, 401k, CME allowance",
            Urgency = "Within 30 days",
            IdealHire = "Detail-oriented RN who prioritizes safety and natural aesthetics.",
        });

        db.TalentDetails.Add(new TalentDetails
        {
            AccountId = sophia.Id,
            ProfessionalName = "Sophia Chen, RN",
            Role = "Aesthetic RN",
            Location = "Chicago, IL",
            YearsExperience = "4 years",
            ExperienceTimeline = "2022–Present · Aesthetic RN\n2020–2022 · ICU RN",
            Skills = "Injectables, microneedling, PRP, patient consultations",
            CertificateUrls = new List<string> { "Illinois RN License.pdf" },
            Availability = "Full time",
            SalaryExpectation = "$85,000–$105,000",
            Languages = "English, Mandarin",
            Introduction = "Transitioned from critical care to aesthetics. Passionate about safe, evidence-based treatments.",
        });

        await db.SaveChangesAsync();
    }
}
