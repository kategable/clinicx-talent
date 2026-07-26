using ClinicX.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicX.Infrastructure.Persistence;

public class ClinicXDbContext : DbContext
{
    public ClinicXDbContext(DbContextOptions<ClinicXDbContext> options)
        : base(options) { }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<ClinicDetails> ClinicDetails => Set<ClinicDetails>();
    public DbSet<TalentDetails> TalentDetails => Set<TalentDetails>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();
    public DbSet<AccountFile> AccountFiles => Set<AccountFile>();
    public DbSet<HiringOpportunity> HiringOpportunities => Set<HiringOpportunity>();
    public DbSet<HiringInvite> HiringInvites => Set<HiringInvite>();
    public DbSet<TalentPassportShare> TalentPassportShares => Set<TalentPassportShare>();
    public DbSet<TalentApplication> TalentApplications => Set<TalentApplication>();
    public DbSet<PhoneVerification> PhoneVerifications => Set<PhoneVerification>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // -- Account ---------------------------------------------------------
        builder.Entity<Account>(e =>
        {
            // Unique only for non-empty phones (Google accounts skip phone initially)
            e.HasIndex(a => a.Phone).IsUnique().HasFilter("\"Phone\" != ''");
            e.HasIndex(a => a.DeletedAtUtc);
            e.HasQueryFilter(a => a.DeletedAtUtc == null);

            e.HasOne(a => a.ClinicDetails)
                .WithOne(d => d.Account)
                .HasForeignKey<ClinicDetails>(d => d.AccountId);

            e.HasOne(a => a.TalentDetails)
                .WithOne(d => d.Account)
                .HasForeignKey<TalentDetails>(d => d.AccountId);
        });

        // -- ClinicDetails ---------------------------------------------------
        builder.Entity<ClinicDetails>(e =>
        {
            e.ToTable("ClinicDetails");
            e.HasKey(d => d.AccountId);
        });

        // -- TalentDetails ---------------------------------------------------
        builder.Entity<TalentDetails>(e =>
        {
            e.ToTable("TalentDetails");
            e.HasKey(d => d.AccountId);
            e.Property(d => d.CertificateUrls).HasColumnType("jsonb");
            e.Property(d => d.GalleryUrls).HasColumnType("jsonb");
        });

        // -- ExternalLogin ---------------------------------------------------
        builder.Entity<ExternalLogin>(e =>
        {
            e.HasIndex(x => new { x.Provider, x.ProviderKey }).IsUnique();
            e.HasOne(x => x.Account)
                .WithMany(a => a.ExternalLogins)
                .HasForeignKey(x => x.AccountId);
        });

        // -- AccountFile -----------------------------------------------------
        builder.Entity<AccountFile>(e =>
        {
            e.HasIndex(f => f.AccountId);
            e.HasOne(f => f.Account)
                .WithMany(a => a.Files)
                .HasForeignKey(f => f.AccountId);
        });

        // -- HiringOpportunity -----------------------------------------------
        builder.Entity<HiringOpportunity>(e =>
        {
            e.HasIndex(o => new { o.Slug, o.PositionSlug });
            e.HasIndex(o => o.ClinicAccountId);
            e.HasIndex(o => o.DeletedAtUtc);
            e.HasQueryFilter(o => o.DeletedAtUtc == null);

            e.HasOne(o => o.ClinicAccount)
                .WithMany()
                .HasForeignKey(o => o.ClinicAccountId);
        });

        // -- HiringInvite ----------------------------------------------------
        builder.Entity<HiringInvite>(e =>
        {
            e.HasIndex(i => i.Token).IsUnique();
            e.HasIndex(i => i.OpportunityId);
            e.HasIndex(i => i.DeletedAtUtc);
            e.HasQueryFilter(i => i.DeletedAtUtc == null);

            e.HasOne(i => i.Opportunity)
                .WithMany(o => o.Invites)
                .HasForeignKey(i => i.OpportunityId);
        });

        // -- TalentPassportShare ---------------------------------------------
        builder.Entity<TalentPassportShare>(e =>
        {
            e.HasIndex(p => p.Token).IsUnique();
            e.HasIndex(p => p.TalentAccountId);
            e.HasIndex(p => p.DeletedAtUtc);
            e.HasQueryFilter(p => p.DeletedAtUtc == null);

            e.HasOne(p => p.TalentAccount)
                .WithMany()
                .HasForeignKey(p => p.TalentAccountId);
        });

        // -- TalentApplication -----------------------------------------------
        builder.Entity<TalentApplication>(e =>
        {
            e.HasIndex(a => a.TalentAccountId);
            e.HasIndex(a => a.ClinicAccountId);

            e.HasOne(a => a.TalentAccount)
                .WithMany()
                .HasForeignKey(a => a.TalentAccountId);

            e.HasOne(a => a.ClinicAccount)
                .WithMany()
                .HasForeignKey(a => a.ClinicAccountId);

            e.HasOne(a => a.Opportunity)
                .WithMany(o => o.Applications)
                .HasForeignKey(a => a.OpportunityId);
        });

        // -- PhoneVerification -----------------------------------------------
        builder.Entity<PhoneVerification>(e =>
        {
            e.HasIndex(v => v.Phone);
            e.HasIndex(v => v.ExpiresAtUtc);
        });

        // -- AdminUser -------------------------------------------------------
        builder.Entity<AdminUser>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
        });

        // -- RefreshToken ----------------------------------------------------
        builder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(t => t.Token).IsUnique();
            e.HasIndex(t => t.AccountId);
            e.HasOne(t => t.Account)
                .WithMany()
                .HasForeignKey(t => t.AccountId);
        });
    }
}
