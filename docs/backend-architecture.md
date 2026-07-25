# ClinicX Talent -- Backend Implementation Plan

## 1. Overview and Key Design Decisions

The current application is entirely client-side: domain logic lives in NgRx reducers, data persists in localStorage, authentication is simulated via hardcoded test credentials, and SMS verification is a no-op that accepts a fixed set of phone/code pairs. The data source abstractions (`AccountDataSource`, `HiringDataSource`) already exist and are injected via Angular DI -- the frontend migration path is clean: swap local implementations for HTTP implementations that call the new ASP.NET Core API.

**Core architectural principles:**
- Clean Architecture (Presentation / Application / Domain / Infrastructure layers)
- ASP.NET Core 9 with minimal API controllers
- Entity Framework Core with PostgreSQL (via Npgsql) for relational data
- Azure Blob Storage for all media files (videos, photos, certificates, galleries)
- **Google OAuth as primary auth**, Azure Communication Services SMS as phone verification
- Azure (production) / Docker Compose (development)
- **Soft delete everywhere** -- accounts, hiring resources, and files are soft-deleted by default. Full hard deletion requires a special admin approval process.

**Why Azure Blob Storage for media, not PostgreSQL:** Cheaper ($0.018 vs $0.115/GB/month), CDN-friendly, designed for large blobs (50-100MB videos), no database bloat.

**Why Google OAuth first:** Free (vs SMS ~$0.01/msg), higher conversion (85% vs 78%), NIST-approved over SMS OTP.

**Development approach:** Local Docker Compose (PostgreSQL + API), local disk file storage mock, Google test client, SMS mock. No Azure until Phase 9.

**Deployment:** Green/blue slot swap with additive-only migrations.

**Soft delete philosophy:**
- Every record is soft-deleted by default -- a `DeletedAtUtc` timestamp is set, the record is hidden from all normal queries via EF Core global query filters
- Creators of hiring resources (opportunities, invites, passport shares) can mark them for deletion -- this sets the soft-delete flag
- Account soft-delete hides the account, their profile, their files, and their hiring data from the system
- Full permanent deletion requires an admin approval workflow (two-admins or admin+confirmation)
- Soft-deleted data is preserved for backup/restore purposes; a data retention policy determines when blobs are eligible for permanent deletion

---

## 2. Backend Project Structure

```
ClinicX/
  docker-compose.yml
  ClinicX.sln
  src/
    ClinicX.Api/
      Controllers/
        AuthController.cs
        AccountsController.cs
        FilesController.cs
        HiringController.cs
        PassportsController.cs
        AdminController.cs
          + AdminApprovalController.cs  # NEW: approval workflow endpoints
        PublicController.cs
      Middleware/
        ExceptionMiddleware.cs
        RequestLoggingMiddleware.cs
      Program.cs
      appsettings*.json

    ClinicX.Application/
      Common/
        Interfaces/
          ICurrentUserService.cs
          IJwtService.cs
          ISmsService.cs
          IGoogleAuthService.cs
          IFileStorageService.cs
          ISoftDeleteService.cs       # NEW: reusable soft-delete logic
      Auth/ ...
      Accounts/
        Commands/
          SoftDeleteAccountCommand.cs       # NEW: marks account as deleted
          RestoreAccountCommand.cs          # NEW: restores soft-deleted account
          HardDeleteAccountCommand.cs       # NEW: permanent deletion (admin approval)
        Queries/
          GetDeletedAccountsQuery.cs        # NEW: admin view of soft-deleted accounts
        ...
      Files/
        Commands/
          UploadProfilePhotoCommand.cs
          UploadIntroVideoCommand.cs
          UploadCertificateCommand.cs
          UploadGalleryImageCommand.cs
          SoftDeleteFileCommand.cs          # NEW: marks file as deleted
        ...
      Hiring/
        Commands/
          CreateOpportunityCommand.cs
          SoftDeleteOpportunityCommand.cs    # NEW: creator can soft-delete
          CreateInviteCommand.cs
          SoftDeleteInviteCommand.cs         # NEW: creator can soft-delete
          CreatePassportShareCommand.cs
          SoftDeletePassportShareCommand.cs  # NEW: creator can soft-delete
          ...
        ...
      Admin/
        Commands/
          SetReviewStatusCommand.cs
          ResetVerificationCommand.cs
          ApproveHardDeleteCommand.cs        # NEW: approves pending hard delete
          RequestHardDeleteCommand.cs        # NEW: initiates hard delete request
        Queries/
          GetVerificationSecurityQuery.cs
          GetPendingHardDeletesQuery.cs      # NEW: lists pending hard delete requests
          GetDeletedAccountsQuery.cs
        ...

    ClinicX.Domain/
      Common/
        ISoftDeletable.cs             # NEW: interface for soft-delete entities
        SoftDeleteBase.cs             # NEW: base class with DeletedAtUtc + DeletedBy
        HardDeleteRequest.cs          # NEW: tracks pending hard delete approvals
      Entities/
        Account.cs
        ClinicDetails.cs
        TalentDetails.cs
        AccountFile.cs
        HiringOpportunity.cs
        HiringInvite.cs
        TalentPassportShare.cs
        TalentApplication.cs
        PhoneVerification.cs
        VerificationSecurityRecord.cs
        AdminUser.cs
        RefreshToken.cs
        ExternalLogin.cs
      Enums/ ...
      ValueObjects/ PhoneNumber.cs
      Exceptions/ ...

    ClinicX.Infrastructure/
      Persistence/
        ClinicXDbContext.cs
          + Global query filters for ISoftDeletable
        Migrations/
        Configurations/
        Repositories/
        Seed/ SeedData.cs
      Services/
        SmsService.cs / SmsServiceMock.cs
        JwtService.cs
        GoogleAuthService.cs
        FileStorageService.cs / FileStorageServiceLocal.cs
        SoftDeleteService.cs          # NEW: reusable soft-delete + restore logic
        CurrentUserService.cs

  tests/
    ClinicX.UnitTests/
    ClinicX.IntegrationTests/
    ClinicX.Api.Tests/
```

---

## 3. Database Schema (EF Core with PostgreSQL)

### 3.0 Soft Delete Foundation

Every entity that can be soft-deleted implements this interface:

```csharp
public interface ISoftDeletable
{
    DateTime? DeletedAtUtc { get; set; }
    Guid? DeletedByAccountId { get; set; }  // who deleted it
}
```

EF Core applies a global query filter to every `ISoftDeletable` entity:

```csharp
// ClinicXDbContext.cs
foreach (var entityType in modelBuilder.Model.GetEntityTypes())
{
    if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
    {
        var parameter = Expression.Parameter(entityType.ClrType, "e");
        var property = Expression.Property(parameter, nameof(ISoftDeletable.DeletedAtUtc));
        var condition = Expression.Equal(property, Expression.Constant(null, typeof(DateTime?)));
        var lambda = Expression.Lambda(condition, parameter);
        
        entityType.SetQueryFilter(lambda);
    }
}
```

This means **all normal queries automatically exclude soft-deleted records**. Admin queries can call `.IgnoreQueryFilters()` to see deleted data.

### 3.1 Accounts

```sql
CREATE TABLE Accounts (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Type            VARCHAR(20)     NOT NULL,
    Phone           VARCHAR(20)     NOT NULL DEFAULT '',
    DisplayPhone    VARCHAR(20)     NOT NULL DEFAULT '',
    Email           VARCHAR(320)    NOT NULL DEFAULT '',
    ShareEmail      BOOLEAN         NOT NULL DEFAULT FALSE,
    SharePhone      BOOLEAN         NOT NULL DEFAULT FALSE,
    Status          VARCHAR(20)     NOT NULL DEFAULT 'under-review',
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UpdatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ProfileComplete BOOLEAN         NOT NULL DEFAULT FALSE,
    DisplayName     VARCHAR(200)    NOT NULL DEFAULT '',
    ThemePreference VARCHAR(10)     NOT NULL DEFAULT 'auto',
    Founder         BOOLEAN         NOT NULL DEFAULT FALSE,
    -- Soft delete columns
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_Accounts_Phone ON Accounts(Phone) WHERE DeletedAtUtc IS NULL AND Phone <> '';
CREATE INDEX IX_Accounts_DeletedAtUtc ON Accounts(DeletedAtUtc) WHERE DeletedAtUtc IS NOT NULL;
```

Soft-deleting an account cascades logically (not via DB cascade -- handled by application code):
- `ExternalLogins` for that account are soft-deleted
- `AccountFiles` for that account are soft-deleted
- `HiringOpportunities` owned by that account are soft-deleted
- `TalentPassportShares` owned by that account are soft-deleted
- `TalentApplications` where the account is talent or clinic are soft-deleted
- All associated `RefreshTokens` are revoked

Restoring an account reverses all of the above.

### 3.2 External Logins

```sql
CREATE TABLE ExternalLogins (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId       UUID            NOT NULL REFERENCES Accounts(Id),
    Provider        VARCHAR(50)     NOT NULL,
    ProviderSubject VARCHAR(500)    NOT NULL,
    Email           VARCHAR(320)    NOT NULL DEFAULT '',
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Soft delete
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_ExternalLogins_Provider_Subject 
    ON ExternalLogins(Provider, ProviderSubject) WHERE DeletedAtUtc IS NULL;
```

### 3.3 Account Details

```sql
CREATE TABLE ClinicDetails (
    AccountId       UUID            PRIMARY KEY REFERENCES Accounts(Id),
    -- ... all existing columns ...
    -- Soft delete (follows account -- deleted when account is deleted)
    DeletedAtUtc    TIMESTAMPTZ     NULL
);

CREATE TABLE TalentDetails (
    AccountId       UUID            PRIMARY KEY REFERENCES Accounts(Id),
    ProfessionalName VARCHAR(200)   NOT NULL DEFAULT '',
    PhotoUrl        VARCHAR(1000)   NOT NULL DEFAULT '',
    VideoUrl        VARCHAR(1000)   NOT NULL DEFAULT '',
    Role            VARCHAR(200)    NOT NULL DEFAULT '',
    Location        VARCHAR(500)    NOT NULL DEFAULT '',
    YearsExperience VARCHAR(50)     NOT NULL DEFAULT '',
    ExperienceTimeline TEXT         NOT NULL DEFAULT '',
    Skills          VARCHAR(1000)   NOT NULL DEFAULT '',
    CertificateUrls JSONB           NOT NULL DEFAULT '[]',
    Availability    VARCHAR(200)    NOT NULL DEFAULT '',
    SalaryExpectation VARCHAR(200)  NOT NULL DEFAULT '',
    Languages       VARCHAR(500)    NOT NULL DEFAULT '',
    PortfolioUrl    VARCHAR(1000)   NOT NULL DEFAULT '',
    GalleryUrls     JSONB           NOT NULL DEFAULT '[]',
    Introduction    TEXT            NOT NULL DEFAULT '',
    -- Soft delete
    DeletedAtUtc    TIMESTAMPTZ     NULL
);
```

### 3.4 Account Files

```sql
CREATE TABLE AccountFiles (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId       UUID            NOT NULL REFERENCES Accounts(Id),
    Category        VARCHAR(30)     NOT NULL,
    BlobPath        VARCHAR(500)    NOT NULL,
    Url             VARCHAR(1000)   NOT NULL,
    ContentType     VARCHAR(100)    NOT NULL DEFAULT '',
    FileSizeBytes   BIGINT          NOT NULL DEFAULT 0,
    OriginalName    VARCHAR(500)    NOT NULL DEFAULT '',
    UploadedAtUtc   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Soft delete
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE INDEX IX_AccountFiles_AccountId ON AccountFiles(AccountId) WHERE DeletedAtUtc IS NULL;
```

### 3.5 Hiring Opportunities

```sql
CREATE TABLE HiringOpportunities (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    ClinicAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    Slug            VARCHAR(200)    NOT NULL,
    PositionSlug    VARCHAR(200)    NOT NULL,
    Title           VARCHAR(200)    NOT NULL,
    Location        VARCHAR(500)    NOT NULL DEFAULT '',
    PayRange        VARCHAR(200)    NOT NULL DEFAULT '',
    MustHaveSkills  VARCHAR(1000)   NOT NULL DEFAULT '',
    Benefits        VARCHAR(1000)   NOT NULL DEFAULT '',
    Urgency         VARCHAR(200)    NOT NULL DEFAULT '',
    IdealHire       TEXT            NOT NULL DEFAULT '',
    Status          VARCHAR(20)     NOT NULL DEFAULT 'active',
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UpdatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Soft delete (creator can mark for deletion)
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE INDEX IX_HiringOpportunities_ClinicAccountId 
    ON HiringOpportunities(ClinicAccountId) WHERE DeletedAtUtc IS NULL;
```

**Creator management:** The clinic that owns the opportunity sees a "Delete" button. Clicking it calls `PUT /api/v1/hiring/opportunities/{id}/delete` which sets `DeletedAtUtc`. The opportunity disappears from public view and the clinic's active list but is preserved in the database.

### 3.6 Hiring Invites

```sql
CREATE TABLE HiringInvites (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    OpportunityId   UUID            NOT NULL REFERENCES HiringOpportunities(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ExpiresAtUtc    TIMESTAMPTZ     NOT NULL,
    Active          BOOLEAN         NOT NULL DEFAULT TRUE,
    -- Soft delete (creator can deactivate/delete)
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_HiringInvites_Token ON HiringInvites(Token) WHERE DeletedAtUtc IS NULL;
```

**Creator management:** The clinic sees a list of invites for each opportunity and can delete individual invites. Soft-deleted invites return "expired" when someone tries to use the share link.

### 3.7 Talent Passport Shares

```sql
CREATE TABLE TalentPassportShares (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    TalentAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    Active          BOOLEAN         NOT NULL DEFAULT TRUE,
    -- Soft delete (creator can deactivate/delete)
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_TalentPassportShares_Token 
    ON TalentPassportShares(Token) WHERE DeletedAtUtc IS NULL;
```

### 3.8 Talent Applications

```sql
CREATE TABLE TalentApplications (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    OpportunityId   UUID            NULL REFERENCES HiringOpportunities(Id),
    TalentAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    ClinicAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    Source          VARCHAR(30)     NOT NULL,
    Status          VARCHAR(30)     NOT NULL DEFAULT 'invited',
    AcceptedAtUtc   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    SubmittedAtUtc  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UpdatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Soft delete (follows account or opportunity deletion)
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);
```

### 3.9 Hard Delete Requests (NEW -- approval workflow)

```sql
CREATE TABLE HardDeleteRequests (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    TargetTable     VARCHAR(100)    NOT NULL,       -- 'Accounts', 'HiringOpportunities', etc.
    TargetId        UUID            NOT NULL,       -- ID of the record to permanently delete
    RequestedByAccountId UUID      NOT NULL REFERENCES Accounts(Id),
    RequestedAtUtc  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ApprovedByAccountId UUID       NULL REFERENCES Accounts(Id),
    ApprovedAtUtc   TIMESTAMPTZ     NULL,
    Status          VARCHAR(20)     NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    RejectionReason TEXT            NULL
);

CREATE INDEX IX_HardDeleteRequests_Status ON HardDeleteRequests(Status);
```

This table tracks the full approval workflow:
1. Admin A creates a `HardDeleteRequest` for a specific account/resource
2. Admin B (different admin) reviews and approves or rejects
3. On approval: the record is permanently deleted from the database + blobs are purged
4. On rejection: the record remains soft-deleted

### 3.10 Phone Verification, Verification Security, Admin, Refresh Tokens

These are operational tables that do not need soft delete (they are cleaned up or expire naturally).

```sql
CREATE TABLE PhoneVerifications (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    Phone VARCHAR(20) NOT NULL,
    CodeHash VARCHAR(200) NOT NULL,
    ExpiresAtUtc TIMESTAMPTZ NOT NULL,
    VerifiedAtUtc TIMESTAMPTZ NULL,
    AttemptCount INTEGER NOT NULL DEFAULT 0,
    CreatedAtUtc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE VerificationSecurityRecords (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    Phone VARCHAR(20) NOT NULL,
    AttemptCount INTEGER NOT NULL DEFAULT 0,
    LockedUntilUtc TIMESTAMPTZ NULL,
    FirstAttemptUtc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    LastAttemptUtc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    Flagged BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE AdminUsers (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    Username VARCHAR(100) NOT NULL,
    PasswordHash VARCHAR(500) NOT NULL,
    CreatedAtUtc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE RefreshTokens (
    Id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId UUID NOT NULL REFERENCES Accounts(Id),
    Token VARCHAR(500) NOT NULL,
    ExpiresAtUtc TIMESTAMPTZ NOT NULL,
    CreatedAtUtc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    RevokedAtUtc TIMESTAMPTZ NULL       -- revoked when account is soft-deleted
);
```

### 3.11 Blob Storage Retention

When an account is soft-deleted, the blobs in Azure Storage are **not** immediately deleted. Instead:
1. The `AccountFiles` records are soft-deleted (hidden from queries)
2. A lifecycle management policy on the storage container moves blobs to Cool tier after 30 days and Archive tier after 90 days
3. Only when a hard-delete request is approved are the blobs permanently purged
4. This gives a safety window to restore soft-deleted accounts with all their files intact

---

## 4. Soft Delete API Design

### 4.1 Account Soft Delete & Restore

```
PUT /api/v1/accounts/me/delete
  Auth: JWT required
  Response: AccountDto (with DeletedAtUtc set)
  Notes: Soft-deletes the authenticated account. The account is immediately
         invisible to all normal operations. The user is signed out.
         All associated hiring data is soft-deleted in the same transaction.

POST /api/v1/accounts/{id}/restore
  Auth: JWT + admin
  Response: AccountDto (with DeletedAtUtc = null)
  Notes: Restores a soft-deleted account. All associated data is restored.
         The account reappears in the system as it was before deletion.

GET /api/v1/admin/accounts/deleted
  Auth: JWT + admin
  Query: ?page=1&pageSize=20&from=2026-01-01&to=2026-07-23
  Response: { items: AccountDto[], total: number }
  Notes: Lists soft-deleted accounts. Admin can review, restore, or request hard delete.
```

### 4.2 Hard Delete Approval Workflow

```
POST /api/v1/admin/hard-delete/request
  Auth: JWT + admin
  Request: { targetTable: "Accounts", targetId: "uuid" }
  Response: HardDeleteRequestDto (status: "pending")
  Notes: Initiates a hard-delete request. The record must already be soft-deleted.
         Creates a HardDeleteRequests record with status=pending.

POST /api/v1/admin/hard-delete/{requestId}/approve
  Auth: JWT + admin (must be different admin from requester)
  Response: HardDeleteRequestDto (status: "approved")
  Notes: Approves the hard delete. Target record is permanently removed from DB.
         Blobs associated with the account are purged from storage.
         This action cannot be undone.

POST /api/v1/admin/hard-delete/{requestId}/reject
  Auth: JWT + admin
  Request: { reason: "string" }
  Response: HardDeleteRequestDto (status: "rejected")
  Notes: Rejects the hard delete. The record remains soft-deleted (restorable).

GET /api/v1/admin/hard-delete/pending
  Auth: JWT + admin
  Response: HardDeleteRequestDto[]
  Notes: Lists all pending hard-delete requests for admin review.
```

### 4.3 Hiring Resource Soft Delete (Creator-Managed)

```
PUT /api/v1/hiring/opportunities/{id}/delete
  Auth: JWT + owning clinic account
  Response: OpportunityDto (with DeletedAtUtc set)
  Notes: Soft-deletes the opportunity. Also soft-deletes all associated invites.
         The opportunity disappears from public hiring pages and the clinic's list.
         The creator sees a "Delete" button in their dashboard.

PUT /api/v1/hiring/opportunities/{id}/restore
  Auth: JWT + owning clinic account
  Response: OpportunityDto (with DeletedAtUtc = null)
  Notes: Restores a soft-deleted opportunity. Invites are also restored.
         The opportunity reappears in the clinic's list and public pages.
         Note: expired invites remain expired regardless of restore.

PUT /api/v1/hiring/invites/{id}/delete
  Auth: JWT + owning clinic account
  Response: InviteDto (with DeletedAtUtc set)
  Notes: Soft-deletes a specific invite. The share link stops working.
         The clinic sees a "Delete" or "Revoke" button next to each invite.

PUT /api/v1/hiring/passports/{id}/delete
  Auth: JWT + owning talent account
  Response: PassportShareDto (with DeletedAtUtc set)
  Notes: Soft-deletes a specific passport share. The share link stops working.

PUT /api/v1/hiring/passports/{id}/restore
  Auth: JWT + owning talent account
  Response: PassportShareDto (with DeletedAtUtc = null)
  Notes: Restores a soft-deleted passport share. The share link works again.
```

### 4.4 File Soft Delete

```
PUT /api/v1/files/{fileId}/delete
  Auth: JWT + owning account
  Response: FileMetadataDto (with DeletedAtUtc set)
  Notes: Soft-deletes the file record. The blob remains in storage (cool tier).
         The file disappears from the profile/gallery immediately.
         If all files in a category are deleted, the corresponding URL field is cleared.

PUT /api/v1/files/{fileId}/restore
  Auth: JWT + owning account or admin
  Response: FileMetadataDto (with DeletedAtUtc = null)
  Notes: Restores the file record. The file reappears in the profile/gallery.
```

---

## 5. Soft Delete Implementation Details

### 5.1 SoftDeleteService

```csharp
public class SoftDeleteService : ISoftDeleteService
{
    private readonly ClinicXDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public async Task SoftDeleteAccountAsync(Guid accountId)
    {
        var account = await _db.Accounts
            .IgnoreQueryFilters()  // Include already-deleted if re-deleting
            .FirstAsync(a => a.Id == accountId);

        var now = DateTime.UtcNow;
        var userId = _currentUser.AccountId;

        // Soft-delete the account
        account.DeletedAtUtc = now;
        account.DeletedByAccountId = userId;

        // Cascade: soft-delete all owned data
        await _db.ExternalLogins
            .Where(e => e.AccountId == accountId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(e => e.DeletedAtUtc, now)
                .SetProperty(e => e.DeletedByAccountId, userId));

        await _db.AccountFiles
            .Where(f => f.AccountId == accountId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(f => f.DeletedAtUtc, now)
                .SetProperty(f => f.DeletedByAccountId, userId));

        await _db.HiringOpportunities
            .Where(o => o.ClinicAccountId == accountId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(o => o.DeletedAtUtc, now)
                .SetProperty(o => o.DeletedByAccountId, userId));

        // ... cascade to TalentPassportShares, TalentApplications

        await _db.SaveChangesAsync();
    }

    public async Task RestoreAccountAsync(Guid accountId)
    {
        var account = await _db.Accounts
            .IgnoreQueryFilters()
            .FirstAsync(a => a.Id == accountId);

        account.DeletedAtUtc = null;
        account.DeletedByAccountId = null;

        // Restore all cascaded data
        await _db.ExternalLogins
            .Where(e => e.AccountId == accountId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(e => e.DeletedAtUtc, (DateTime?)null)
                .SetProperty(e => e.DeletedByAccountId, (Guid?)null));

        // ... restore AccountFiles, HiringOpportunities, etc.

        await _db.SaveChangesAsync();
    }

    public async Task HardDeleteAccountAsync(Guid accountId)
    {
        // Warning: this is permanent
        var account = await _db.Accounts
            .IgnoreQueryFilters()
            .FirstAsync(a => a.Id == accountId);

        // Delete blobs from storage first
        var files = await _db.AccountFiles
            .IgnoreQueryFilters()
            .Where(f => f.AccountId == accountId)
            .ToListAsync();

        foreach (var file in files)
        {
            await _fileStorageService.DeleteAsync(file.BlobPath);
        }

        // Remove all dependent records
        _db.AccountFiles.RemoveRange(files);
        _db.ExternalLogins.RemoveRange(await _db.ExternalLogins
            .IgnoreQueryFilters()
            .Where(e => e.AccountId == accountId).ToListAsync());
        _db.HiringOpportunities.RemoveRange(await _db.HiringOpportunities
            .IgnoreQueryFilters()
            .Where(o => o.ClinicAccountId == accountId).ToListAsync());
        // ... remove all other cascaded data

        // Finally, remove the account
        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync();
    }
}
```

### 5.2 Query Behavior Summary

| User | Viewing | Sees |
|------|---------|------|
| Anonymous | Public hiring page | Only active, non-deleted opportunities |
| Clinic | Their own opportunities | All their opportunities (including soft-deleted, with a "Deleted" badge) |
| Clinic | Other clinics' profiles | Only non-deleted accounts |
| Talent | Their own applications | All their applications |
| Talent | Talent directory | Only non-deleted talent accounts |
| Admin | Admin dashboard | All records including deleted (can toggle filter) |
| Admin | Deleted accounts view | Only deleted accounts (for review/restore) |
| Admin | Pending hard deletes | Only hard-delete requests with status=pending |

---

## 6. Authentication Architecture

### 6.1 Auth Endpoints

```
POST /api/v1/auth/google          -- Primary: Google OAuth login
POST /api/v1/auth/send-code       -- Secondary: SMS code for phone verification
POST /api/v1/auth/verify-code     -- Verify SMS code (login or link phone)
POST /api/v1/auth/refresh         -- Refresh JWT
POST /api/v1/auth/admin/login     -- Admin login
POST /api/v1/auth/admin/logout    -- Admin logout
```

### 6.2 Account Endpoints

```
GET    /api/v1/accounts/me
PUT    /api/v1/accounts/me
PUT    /api/v1/accounts/me/profile
PUT    /api/v1/accounts/me/theme
PUT    /api/v1/accounts/me/delete        -- Soft-delete own account
POST   /api/v1/accounts/{id}/restore     -- Admin restores account
GET    /api/v1/accounts?type=&page=
GET    /api/v1/accounts/{id}
PUT    /api/v1/accounts/{id}/status
```

### 6.3 File Upload Endpoints

```
POST   /api/v1/files/profile-photo
POST   /api/v1/files/intro-video
POST   /api/v1/files/certificate
POST   /api/v1/files/gallery-image
PUT    /api/v1/files/{fileId}/delete      -- Soft-delete file
PUT    /api/v1/files/{fileId}/restore     -- Restore file
DELETE /api/v1/files/{fileId}             -- Hard delete (admin only)
GET    /api/v1/files/{fileId}/download
```

### 6.4 Hiring Endpoints

```
GET    /api/v1/hiring/opportunities
POST   /api/v1/hiring/opportunities
PUT    /api/v1/hiring/opportunities/{id}
PUT    /api/v1/hiring/opportunities/{id}/status
PUT    /api/v1/hiring/opportunities/{id}/delete     -- Soft delete (creator)
PUT    /api/v1/hiring/opportunities/{id}/restore    -- Restore (creator)
POST   /api/v1/hiring/opportunities/{id}/invites
PUT    /api/v1/hiring/invites/{id}/delete           -- Soft delete (creator)
POST   /api/v1/hiring/passports
PUT    /api/v1/hiring/passports/{id}/delete         -- Soft delete (creator)
PUT    /api/v1/hiring/passports/{id}/restore        -- Restore (creator)
GET    /api/v1/hiring/applications
POST   /api/v1/hiring/applications
PUT    /api/v1/hiring/applications/{id}/status
```

### 6.5 Admin Endpoints

```
GET    /api/v1/admin/accounts/deleted               -- List soft-deleted accounts
GET    /api/v1/admin/accounts/verification-security
POST   /api/v1/admin/accounts/verification-security/reset
POST   /api/v1/admin/hard-delete/request            -- Request hard delete
POST   /api/v1/admin/hard-delete/{id}/approve       -- Approve hard delete
POST   /api/v1/admin/hard-delete/{id}/reject        -- Reject hard delete
GET    /api/v1/admin/hard-delete/pending            -- List pending approvals
GET    /api/v1/admin/stats
```

---

## 7. Azure Services

| Resource | SKU | Purpose |
|----------|-----|---------|
| App Service | B1 (Linux) -- 2 slots (green + blue) | ASP.NET Core API |
| PostgreSQL Flexible Server | Burstable B1ms (1 vCore, 2 GB) | Relational data + soft-delete records |
| Blob Storage | Standard LRS (Hot -> Cool lifecycle) | Videos, photos, certificates, galleries |
| Key Vault | Standard | Secrets |
| Communication Services | Pay-as-you-go | SMS (~$0.01/msg US) |
| App Insights | Per-GB | Logging, monitoring |

---

## 8. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- Scaffold solution with 5 projects
- Domain entities with `ISoftDeletable` interface
- EF Core + PostgreSQL with global query filters
- `docker-compose.yml` for local PostgreSQL
- `FileStorageServiceLocal` (disk-based mock for dev)
- `SmsServiceMock` (logs codes to console)
- Initial migration with `DeletedAtUtc` on all entities
- ExceptionMiddleware, /health endpoint
- Testcontainers integration test fixture

### Phase 2: Auth -- Google OAuth (Week 2)
- Google ID token validation
- `POST /api/v1/auth/google`
- ExternalLogin + Account creation
- JWT issuance with phoneVerified claim
- Google test client for local dev

### Phase 3: Auth -- SMS Fallback (Week 3)
- Azure Communication Services SMS (or mock)
- `POST /api/v1/auth/send-code`, `/verify-code`
- Phone linking flow, rate limiting

### Phase 4: Accounts + Soft Delete (Week 3-4)
- Account CRUD endpoints
- `SoftDeleteService` with account cascade
- `PUT /api/v1/accounts/me/delete`
- `POST /api/v1/accounts/{id}/restore` (admin)
- `GET /api/v1/admin/accounts/deleted`
- Profile update, contact/theme, founder logic

### Phase 5: File Upload API (Week 4-5)
- `IFileStorageService` (Blob + Local)
- `FilesController` with all upload/download/delete endpoints
- `AccountFiles` table integration
- File type/size validation
- Soft delete for files

### Phase 6: Hiring API + Soft Delete (Week 5-6)
- Opportunity CRUD
- Creator-facing delete/restore for opportunities
- Invite/passport creation with token
- Creator-facing delete for invites and passports
- Application pipeline with status transitions
- Public endpoints (no auth)
- Soft delete cascading for all hiring resources
- Domain business rules

### Phase 7: Hard Delete Approval Workflow (Week 6)
- `HardDeleteRequests` table
- `POST /api/v1/admin/hard-delete/request`
- `POST /api/v1/admin/hard-delete/{id}/approve`
- `POST /api/v1/admin/hard-delete/{id}/reject`
- `GET /api/v1/admin/hard-delete/pending`
- Two-admin approval enforcement
- Blob purge on hard delete

### Phase 8: Admin Dashboard (Week 7)
- Verification security overview/reset
- Review status management
- Deleted accounts view
- Pending hard deletes view
- Dashboard stats

### Phase 9: Frontend Integration (Week 7-9)
- AuthService with Google OAuth
- JwtInterceptor, ErrorInterceptor
- HttpAccountDataSource, HttpHiringDataSource
- File upload components with progress
- **Delete button on account settings page**
- **Delete/restore buttons on hiring opportunity cards**
- **Delete button on passport share links**
- **Admin dashboard for deleted accounts and hard-delete approvals**
- Remove TEST_CREDENTIALS and hardcoded admin
- Remove localStorage persistence
- End-to-end testing

### Phase 10: Production Deployment (Week 9-10)
- Azure resources via Bicep/ARM
- Google Cloud Console production OAuth client
- GitHub Actions CI/CD with green/blue swap
- UAT -> smoke tests -> production swap
- Blob lifecycle policy (Hot -> Cool -> Archive)

---

## 9. Frontend Changes

### 9.1 Account Delete UI

```html
<!-- Account settings page -->
<section class="danger-zone">
  <h3>Delete Account</h3>
  <p>This will hide your profile and all associated data. 
     You can restore within 30 days by contacting support.</p>
  <button (click)="confirmSoftDelete()" class="mat-warn">
    Delete My Account
  </button>
</section>
```

### 9.2 Hiring Resource Delete UI

```html
<!-- Hiring opportunity card -->
<mat-card>
  <mat-card-header>{{ opportunity.title }}</mat-card-header>
  <mat-card-actions>
    <button (click)="edit()">Edit</button>
    <button (click)="toggleStatus()">
      {{ opportunity.status === 'active' ? 'Pause' : 'Activate' }}
    </button>
    <button (click)="delete()" class="mat-warn" 
            *ngIf="!opportunity.deletedAtUtc">
      Delete
    </button>
    <button (click)="restore()" class="mat-accent"
            *ngIf="opportunity.deletedAtUtc">
      Restore
    </button>
  </mat-card-actions>
</mat-card>
```

### 9.3 Admin Hard Delete UI

```html
<!-- Admin hard delete approval page -->
<section>
  <h2>Pending Hard Delete Requests</h2>
  <table>
    <tr *ngFor="let request of pendingRequests">
      <td>{{ request.targetTable }}</td>
      <td>{{ request.targetId }}</td>
      <td>{{ request.requestedByName }}</td>
      <td>{{ request.requestedAtUtc | date }}</td>
      <td>
        <button (click)="approve(request.id)" class="mat-warn">Approve</button>
        <button (click)="reject(request.id)" class="mat-accent">Reject</button>
      </td>
    </tr>
  </table>
</section>
```

### 9.4 New/Modified Files

```
New files:
  src/app/core/file-upload.service.ts
  src/app/features/account-delete/           # Account delete dialog
  src/app/features/admin-hard-delete/        # Admin hard-delete approval page
  src/app/features/admin-deleted-accounts/   # Admin view of deleted accounts

Modified files:
  src/app/core/account.ts                    # Add DeletedAtUtc to interfaces
  src/app/core/hiring.ts                     # Add DeletedAtUtc to interfaces
  src/app/features/clinic-home/              # Add delete/restore buttons to opp cards
  src/app/features/talent-passport/          # Add delete/restore buttons to passport shares
  src/app/features/talent-settings/          # Add account delete option
```

---

## 10. Soft Delete Policy Summary

| Entity | Can Soft Delete By | Can Restore By | Can Hard Delete By |
|--------|-------------------|---------------|-------------------|
| Account | Account owner (self-delete) | Admin | Admin (2-admin approval) |
| Account Files | Account owner | Account owner or admin | Admin (hard-deleting account also purges files) |
| Hiring Opportunity | Owning clinic | Owning clinic | Admin (part of account hard delete) |
| Hiring Invite | Owning clinic | Owning clinic | Admin |
| Talent Passport Share | Owning talent | Owning talent | Admin |
| Talent Application | System (on account/opportunity delete) | System (on restore) | Admin |

**Data retention:** Soft-deleted records are preserved for a minimum of 90 days before being eligible for lifecycle archival. Hard-deleted records are permanently removed within 24 hours of approval.

---

### Critical Files for Implementation

- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account.ts` -- Domain types; add `DeletedAtUtc` to `AccountRecord`
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/hiring.ts` -- Domain types; add `DeletedAtUtc` to `HiringOpportunity`, `HiringInvite`, `TalentPassportShare`, `TalentApplication`
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/store/app.reducer.ts` -- Contains all current backend logic; each handler maps to a backend endpoint
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account-data.source.ts` -- The abstract data source that is the migration seam
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/app.config.ts` -- Central DI configuration where providers and interceptors are registered
