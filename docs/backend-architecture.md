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
- **Repeatable deployments** -- Infrastructure as Code (Bicep), immutable artifacts, CI/CD with green/blue slot swaps, zero-downtime deployments, approval gates, and automated rollback.

**Why Azure Blob Storage for media, not PostgreSQL:** Cheaper ($0.018 vs $0.115/GB/month), CDN-friendly, designed for large blobs, no database bloat.

**Why Google OAuth first:** Free, higher conversion (85% vs 78%), NIST-approved over SMS OTP.

**Why soft delete everywhere:** Accidental data loss is permanent. Soft delete gives a 90-day safety window for restore. Full permanent deletion requires a two-admin approval workflow.

**Development approach:** Local Docker Compose (PostgreSQL + API), local disk file storage mock, Google test client, SMS mock. No Azure until Phase 10.

**Deployment approach:** Green/blue slot swap with additive-only migrations, health check gates, automated rollback.

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
        AdminApprovalController.cs
        PublicController.cs
      Middleware/
        ExceptionMiddleware.cs
        RequestLoggingMiddleware.cs
      Program.cs
      appsettings*.json

    ClinicX.Application/
      Common/Interfaces/
        ICurrentUserService.cs, IJwtService.cs, ISmsService.cs,
        IGoogleAuthService.cs, IFileStorageService.cs, ISoftDeleteService.cs
      Auth/ ...
      Accounts/ ...
      Files/ ...
      Hiring/ ...
      Founder/ ...
      Admin/ ...

    ClinicX.Domain/
      Common/
        ISoftDeletable.cs
        SoftDeleteBase.cs
        HardDeleteRequest.cs
      Entities/
        Account.cs, ClinicDetails.cs, TalentDetails.cs, AccountFile.cs,
        HiringOpportunity.cs, HiringInvite.cs, TalentPassportShare.cs,
        TalentApplication.cs, PhoneVerification.cs, VerificationSecurityRecord.cs,
        AdminUser.cs, RefreshToken.cs, ExternalLogin.cs
      Enums/ ...
      ValueObjects/ PhoneNumber.cs
      Exceptions/ ...

    ClinicX.Infrastructure/
      Persistence/
        ClinicXDbContext.cs (with ISoftDeletable global query filters)
        Migrations/
        Configurations/
        Seed/ SeedData.cs
      Services/
        SmsService.cs / SmsServiceMock.cs
        JwtService.cs
        GoogleAuthService.cs
        FileStorageService.cs / FileStorageServiceLocal.cs
        SoftDeleteService.cs
        CurrentUserService.cs

  tests/
    ClinicX.UnitTests/
    ClinicX.IntegrationTests/
    ClinicX.Api.Tests/

  infrastructure/                            # NEW: Infrastructure as Code
    main.bicep                               # Top-level orchestration
    modules/
    app-service.bicep                        # App Service + slots
    postgres.bicep                           # PostgreSQL Flexible Server
    blob-storage.bicep                       # Storage account + containers
    key-vault.bicep                          # Key Vault + secrets
    communication-services.bicep             # ACS SMS
    app-insights.bicep                       # Application Insights
    networking.bicep                         # VNet, NSG, private endpoints
    monitoring.bicep                         # Alerts, dashboards
    parameters/
      development.bicepparam
      uat.bicepparam
      production.bicepparam

  scripts/
    deploy.sh                                # Full deployment script (azd up equivalent)
    db-snapshot.sh                           # pg_dump / pg_restore
    db-seed.sh                               # Seed data loading
    db-reset.sh                              # Dev database reset
    smoke-test.sh                            # Post-deployment smoke tests
    rollback.sh                              # Slot swap rollback

  .github/
    workflows/
      ci.yml                                 # Build + test on every PR
      cd.yml                                 # Deploy to UAT + production
```

---

## 3. Database Schema (EF Core with PostgreSQL)

### 3.0 Soft Delete Foundation

Every entity that can be soft-deleted implements:

```csharp
public interface ISoftDeletable
{
    DateTime? DeletedAtUtc { get; set; }
    Guid? DeletedByAccountId { get; set; }
}
```

EF Core global query filters automatically exclude soft-deleted records from all normal queries. Admin queries use `.IgnoreQueryFilters()`.

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
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_Accounts_Phone 
    ON Accounts(Phone) WHERE DeletedAtUtc IS NULL AND Phone <> '';
```

### 3.2 External Logins

```sql
CREATE TABLE ExternalLogins (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId       UUID            NOT NULL REFERENCES Accounts(Id),
    Provider        VARCHAR(50)     NOT NULL,
    ProviderSubject VARCHAR(500)    NOT NULL,
    Email           VARCHAR(320)    NOT NULL DEFAULT '',
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
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
    -- ... all clinic fields ...
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
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);
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
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);
```

### 3.6 Hiring Invites

```sql
CREATE TABLE HiringInvites (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    OpportunityId   UUID            NOT NULL REFERENCES HiringOpportunities(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ExpiresAtUtc    TIMESTAMPTZ     NOT NULL,
    Active          BOOLEAN         NOT NULL DEFAULT TRUE,
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);

CREATE UNIQUE INDEX IX_HiringInvites_Token 
    ON HiringInvites(Token) WHERE DeletedAtUtc IS NULL;
```

### 3.7 Talent Passport Shares

```sql
CREATE TABLE TalentPassportShares (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    TalentAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    Active          BOOLEAN         NOT NULL DEFAULT TRUE,
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
    DeletedAtUtc    TIMESTAMPTZ     NULL,
    DeletedByAccountId UUID         NULL REFERENCES Accounts(Id)
);
```

### 3.9 Hard Delete Requests (approval workflow)

```sql
CREATE TABLE HardDeleteRequests (
    Id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    TargetTable         VARCHAR(100)    NOT NULL,
    TargetId            UUID            NOT NULL,
    RequestedByAccountId UUID           NOT NULL REFERENCES Accounts(Id),
    RequestedAtUtc      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ApprovedByAccountId UUID            NULL REFERENCES Accounts(Id),
    ApprovedAtUtc       TIMESTAMPTZ     NULL,
    Status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
    RejectionReason     TEXT            NULL
);
```

### 3.10 Operational Tables (no soft delete)

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
    RevokedAtUtc TIMESTAMPTZ NULL
);
```

---

## 4. Soft Delete API

### 4.1 Account

```
PUT    /api/v1/accounts/me/delete           -- Self-service soft delete
POST   /api/v1/accounts/{id}/restore        -- Admin restores account
GET    /api/v1/admin/accounts/deleted       -- Admin lists deleted accounts
```

### 4.2 Hiring Resources (Creator-Managed)

```
PUT    /api/v1/hiring/opportunities/{id}/delete     -- Creator soft deletes
PUT    /api/v1/hiring/opportunities/{id}/restore    -- Creator restores
PUT    /api/v1/hiring/invites/{id}/delete            -- Creator deletes invite
PUT    /api/v1/hiring/passports/{id}/delete          -- Creator deletes passport
PUT    /api/v1/hiring/passports/{id}/restore         -- Creator restores passport
```

### 4.3 Files

```
PUT    /api/v1/files/{fileId}/delete    -- Owner soft deletes
PUT    /api/v1/files/{fileId}/restore   -- Owner or admin restores
```

### 4.4 Hard Delete Approval Workflow

```
POST   /api/v1/admin/hard-delete/request            -- Admin requests hard delete
POST   /api/v1/admin/hard-delete/{id}/approve       -- Second admin approves
POST   /api/v1/admin/hard-delete/{id}/reject        -- Admin rejects
GET    /api/v1/admin/hard-delete/pending            -- List pending requests
```

---

## 5. Authentication Architecture

### 5.1 Auth Endpoints

```
POST /api/v1/auth/google          -- Primary: Google OAuth login
POST /api/v1/auth/send-code       -- Secondary: SMS code
POST /api/v1/auth/verify-code     -- Verify SMS code
POST /api/v1/auth/refresh         -- Refresh JWT
POST /api/v1/auth/admin/login     -- Admin login
POST /api/v1/auth/admin/logout
```

### 5.2 JWT Claims

```json
{
  "sub": "account-guid",
  "type": "clinic",
  "status": "approved",
  "role": "user",
  "phoneVerified": true,
  "iat": ...,
  "exp": ...,
  "iss": "clinicx-talent-api",
  "aud": "clinicx-talent-app"
}
```

Access token: 15 minutes. Refresh token: 7 days.

---

## 6. Backend API

### 6.1 Account Endpoints

```
GET    /api/v1/accounts/me
PUT    /api/v1/accounts/me
PUT    /api/v1/accounts/me/profile
PUT    /api/v1/accounts/me/theme
PUT    /api/v1/accounts/me/delete
POST   /api/v1/accounts/{id}/restore
GET    /api/v1/accounts?type=&page=
GET    /api/v1/accounts/{id}
PUT    /api/v1/accounts/{id}/status
```

### 6.2 File Upload Endpoints

```
POST   /api/v1/files/profile-photo     (multipart, max 10MB)
POST   /api/v1/files/intro-video       (multipart, max 200MB, chunked)
POST   /api/v1/files/certificate       (multipart, max 20MB)
POST   /api/v1/files/gallery-image     (multipart, max 10MB)
PUT    /api/v1/files/{fileId}/delete
PUT    /api/v1/files/{fileId}/restore
DELETE /api/v1/files/{fileId}           (admin hard delete)
GET    /api/v1/files/{fileId}/download
```

### 6.3 Hiring Endpoints

```
GET    /api/v1/hiring/opportunities
POST   /api/v1/hiring/opportunities
PUT    /api/v1/hiring/opportunities/{id}
PUT    /api/v1/hiring/opportunities/{id}/status
PUT    /api/v1/hiring/opportunities/{id}/delete
PUT    /api/v1/hiring/opportunities/{id}/restore
POST   /api/v1/hiring/opportunities/{id}/invites
PUT    /api/v1/hiring/invites/{id}/delete
POST   /api/v1/hiring/passports
PUT    /api/v1/hiring/passports/{id}/delete
PUT    /api/v1/hiring/passports/{id}/restore
GET    /api/v1/hiring/applications
POST   /api/v1/hiring/applications
PUT    /api/v1/hiring/applications/{id}/status
```

### 6.4 Public Endpoints (no auth)

```
GET    /api/v1/public/hiring/{clinicSlug}/{positionSlug}?invite={token}
GET    /api/v1/public/talent/{talentSlug}
GET    /api/v1/public/clinic/{clinicSlug}
GET    /api/v1/public/invite/{token}
```

### 6.5 Admin Endpoints

```
GET    /api/v1/admin/accounts/deleted
GET    /api/v1/admin/accounts/verification-security
POST   /api/v1/admin/accounts/verification-security/reset
POST   /api/v1/admin/hard-delete/request
POST   /api/v1/admin/hard-delete/{id}/approve
POST   /api/v1/admin/hard-delete/{id}/reject
GET    /api/v1/admin/hard-delete/pending
GET    /api/v1/admin/stats
```

### 6.6 Response Envelope

```json
{
  "data": { ... },
  "success": true,
  "error": null
}
```

---

## 7. Azure Services

| Resource | SKU / Tier | Purpose |
|----------|-----------|---------|
| App Service | B1 (Linux) -- 2 slots (green + blue) | ASP.NET Core API |
| PostgreSQL Flexible Server | Burstable B1ms (1 vCore, 2 GB, 32 GB) | Relational data |
| Blob Storage | Standard LRS (Hot -> Cool lifecycle) | Videos, photos, certificates |
| Key Vault | Standard | Secrets |
| Communication Services | Pay-as-you-go | SMS (~$0.01/msg US) |
| App Insights | Per-GB | Logging, monitoring |
| App Configuration | Free tier | Feature flags, non-secret config |

---

## 8. Repeatable Deployments -- Industry Standard Approach

### 8.1 Philosophy: Build Once, Deploy Many

A single immutable artifact (the compiled .NET binary + Razor views + static assets) is built once and promoted through every environment without recompilation. The exact SHA that passes CI tests, UAT smoke tests, and approval gates runs in production. This eliminates the classic "works on my machine" gap and guarantees that what was tested is what is deployed.

### 8.2 Infrastructure as Code with Bicep

For an Azure-only shop, **Bicep** is the industry standard IaC tool. It is free, MIT-licensed, has no state file to manage (ARM itself is the source of truth), and supports new Azure features on day one.

Bicep modules for each Azure resource:

```
infrastructure/
  main.bicep                     # Orchestrates all modules
  parameters/
    development.bicepparam       # Dev-specific values (smaller SKUs)
    uat.bicepparam               # UAT-specific values
    production.bicepparam        # Production values (larger SKUs, HA)
  modules/
    app-service.bicep            # App Service plan + green/blue slots + auto-swap
    postgres.bicep               # PostgreSQL Flexible Server + firewall rules
    blob-storage.bicep           # Storage account + containers + lifecycle policies
    key-vault.bicep              # Vault + access policies + secrets
    communication-services.bicep # ACS for SMS
    app-insights.bicep           # Logging + metrics + alerts
    networking.bicep             # Private endpoints, NSG rules
    monitoring.bicep             # Dashboards, alert rules
```

Deploying a full environment:
```bash
az deployment group create \
  --resource-group clinicx-{env} \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/parameters/{env}.bicepparam
```

Or using `azd` for a unified `azd up` experience:
```bash
# Single command: provision infrastructure + build + deploy
azd up --environment production
```

### 8.3 CI/CD Pipeline: GitHub Actions with OIDC

**No static secrets in CI/CD.** GitHub Actions authenticates to Azure via OpenID Connect (OIDC) federated credentials -- short-lived tokens, no service principal passwords, no PAT secrets.

```
File: .github/workflows/ci.yml (Pull Request validation)

Trigger: pull_request to main
Steps:
  1. Checkout code
  2. dotnet restore
  3. dotnet build --configuration Release
  4. dotnet test (unit tests + integration tests with Testcontainers)
  5. dotnet format --verify-no-changes
  6. SonarQube / code quality scan (optional)
  7. Report status on PR
```

```
File: .github/workflows/cd.yml (Deployment)

Trigger: push to main (after PR merge)
Environment: production (requires approval gate)

Jobs:
  1. Build:
      - Checkout
      - dotnet restore
      - dotnet build --configuration Release
      - dotnet test
      - dotnet publish --configuration Release --output ./publish
      - Upload artifact (actions/upload-artifact)

  2. Deploy to UAT (blue slot):
      - Download artifact
      - az webapp deploy --resource-group clinicx-uat --name clinicx-api-uat
                         --slot blue --type zip --src ./publish.zip
      - Run smoke tests against UAT blue slot
      - Run EF Core migrations (dotnet ef database update --connection ...)
      - Swap UAT blue -> UAT production slot
      - Run post-deploy validation

  3. Production approval gate (manual):
      - Requires approval from a designated reviewer in GitHub Environments
      - Shows diff: what is being deployed, what changed since last deploy

  4. Deploy to Production (blue slot):
      - Download artifact (same artifact from job 1, no rebuild)
      - az webapp deploy ... --slot blue
      - Run smoke tests against production blue slot
      - Health check validates (/health endpoint returns 200)
      - Request slot swap

  5. Slot swap:
      - az webapp deployment slot swap --name clinicx-api-prod
                                        --slot blue --target-slot production
      - Automatic: health checks gate the swap (swap aborts if health check fails)
      - Run post-swap validation

  6. Post-deploy:
      - Run E2E tests against production
      - Tag release in GitHub
      - Notify team (Slack, email, etc.)
```

### 8.4 Green/Blue Slot Architecture

```
[Azure Front Door / DNS: api.clinicx-talent.com]
                       |
            [App Service: clinicx-api-prod]
            /                             \
  Slot: production (green)          Slot: blue (staging)
  - Current live traffic            - Incoming new release
  - ASPNETCORE_ENVIRONMENT=Prod     - ASPNETCORE_ENVIRONMENT=Prod
  - Serves all traffic              - No external traffic
```

**Slot-sticky settings** (stay with the slot, not the code):
- `ASPNETCORE_ENVIRONMENT` (always "Production" for both slots)
- Connection strings (each slot points to production DB)
- Logging levels

**Swap process:**
1. Deploy to blue slot (staging)
2. Blue slot auto-warms (calls /health, loads assemblies, opens DB connections)
3. Warmup validates the deployment is healthy before traffic hits it
4. Swap atomically swaps the slot identities: blue becomes production, green becomes staging
5. The old production slot (now green/staging) is available for immediate rollback
6. Auto-rollback: if health checks fail post-swap, swap back automatically

**Rollback:**
```bash
# Immediate rollback -- swap back
az webapp deployment slot swap \
  --name clinicx-api-prod \
  --slot blue \
  --target-slot production

# Takes seconds, no deploy needed
```

### 8.5 Database Migrations: Additive-Only

Database migrations run as part of the deployment pipeline, never manually.

**Rules:**
- Every migration must be **additive only**: ADD COLUMN, CREATE TABLE, CREATE INDEX
- No destructive DDL: DROP COLUMN, ALTER COLUMN, RENAME TABLE
- Breaking changes require two deployments: (1) add new column, write dual code, (2) remove old column reference
- Migrations are **idempotent**: running `dotnet ef database update` multiple times is safe

**When migrations run:**
```
In the deploy pipeline, AFTER the new code is deployed to the staging slot
but BEFORE the slot swap:

  1. Deploy new code to blue slot
  2. Run smoke tests against blue slot
  3. dotnet ef database update --connection "{production-db}"
  4. Verify DB health (new tables/columns exist, old code still works)
  5. Swap slots
```

The old slot (still running old code) is fine because the migration only added new columns/tables -- old code ignores them.

### 8.6 Environment Parity

```
| Aspect               | Local Dev          | UAT                  | Production           |
|---------------------|-------------------|----------------------|----------------------|
| PostgreSQL          | Docker 16-alpine  | Azure Flexible (B1ms)| Azure Flex (B1ms)    |
| File storage        | Local disk        | Azure Blob (Hot)     | Azure Blob (Hot+Cool)|
| SMS                 | Mock (console)    | Azure ACS            | Azure ACS            |
| Google OAuth        | Test client       | Prod client          | Prod client          |
| .NET version        | Same everywhere   | Same                 | Same                 |
| Build artifact      | Same binary       | Same binary          | Same binary          |
| App Insights        | Disabled          | Enabled              | Enabled              |
```

The key constraint: **the same compiled binary runs in all environments.** Only configuration differs.

### 8.7 Secrets Management

```csharp
// Program.cs -- no connection strings in config files for UAT/Production
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}
else
{
    builder.Configuration.AddAzureKeyVault(
        new Uri($"https://clinicx-{environment}-kv.vault.azure.net/"),
        new DefaultAzureCredential());
}
```

**What goes in Key Vault:**
- `Google--ClientId` and `Google--ClientSecret`
- `ConnectionStrings--ClinicXDb` (PostgreSQL connection string)
- `Azure--CommunicationServices--ConnectionString`
- `Azure--Storage--ConnectionString`
- `Jwt--SigningKey`

**What goes in appsettings.json (defaults only):**
- Logging levels
- Feature flags (override via App Configuration)
- Non-sensitive defaults

### 8.8 Quality Gates

| Gate | Where | What Happens on Failure |
|------|-------|------------------------|
| Unit tests | CI (PR) | PR cannot merge |
| Integration tests | CI (PR) | PR cannot merge |
| Code quality | CI (PR) | Warning, optional block |
| Smoke tests | Deploy to UAT | Deploy stops, alert |
| Health check | Pre-swap (both slots) | Swap aborts automatically |
| Post-deploy validation | Post-swap | Auto-rollback if failed |
| Approval gate | Prod deploy | Manual reviewer must approve |

### 8.9 Monitoring and Observability

- **Application Insights** -- request rates, response times, failure rates, dependency tracking
- **Live Metrics** -- watch deployment health in real time during a slot swap
- **Alerts:**
  - HTTP 5xx rate > 1% over 5 minutes -> PagerDuty/Slack
  - Health check endpoint fails -> automated rollback trigger
  - DB connection pool exhaustion -> alert
- **Dashboards:**
  - Deployment dashboard (last N deployments, duration, success/failure)
  - Application dashboard (requests, errors, performance)
  - Business dashboard (accounts created, applications submitted)

### 8.10 Deployment Scripts

```bash
# scripts/deploy.sh
# Usage: ./deploy.sh <environment> <artifact-path>

ENV=$1
ARTIFACT=$2
SLOT="blue"

echo "=== Deploying to $ENV ($SLOT slot) ==="

# 1. Deploy artifact
az webapp deploy --resource-group "clinicx-$ENV" \
                 --name "clinicx-api-$ENV" \
                 --slot $SLOT \
                 --type zip \
                 --src $ARTIFACT

# 2. Warmup and health check
for i in $(seq 1 30); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                "https://clinicx-api-$ENV-$SLOT.azurewebsites.net/health")
    if [ "$STATUS" = "200" ]; then
        echo "Health check passed"
        break
    fi
    sleep 5
done

# 3. Run smoke tests
./scripts/smoke-test.sh "https://clinicx-api-$ENV-$SLOT.azurewebsites.net"
if [ $? -ne 0 ]; then
    echo "Smoke tests failed -- aborting deploy"
    exit 1
fi

# 4. Run migrations
dotnet ef database update --connection "$DB_CONNECTION_STRING"

# 5. Swap slots
az webapp deployment slot swap \
    --resource-group "clinicx-$ENV" \
    --name "clinicx-api-$ENV" \
    --slot $SLOT \
    --target-slot production

echo "=== Deploy to $ENV complete ==="
```

---

## 9. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- Scaffold solution with 5 projects
- Domain entities with `ISoftDeletable` interface
- EF Core + PostgreSQL with global query filters
- `docker-compose.yml` for local PostgreSQL
- `FileStorageServiceLocal`, `SmsServiceMock`
- Initial migration with `DeletedAtUtc` on all entities
- ExceptionMiddleware, /health endpoint
- Testcontainers integration test fixture

### Phase 2: Auth -- Google OAuth (Week 2)
- Google ID token validation
- `POST /api/v1/auth/google`
- ExternalLogin + Account creation
- JWT issuance, Google test client for local dev

### Phase 3: Auth -- SMS Fallback (Week 3)
- Azure Communication Services SMS (or mock)
- `POST /api/v1/auth/send-code`, `/verify-code`
- Phone linking, rate limiting

### Phase 4: Accounts + Soft Delete (Week 3-4)
- Account CRUD, SoftDeleteService with cascade
- Self-service account soft delete
- Admin restore endpoint
- Profile update, founder logic

### Phase 5: File Upload API (Week 4-5)
- IFileStorageService (Blob + Local)
- FilesController with upload/download/delete
- AccountFiles table
- File type/size validation
- Soft delete for files

### Phase 6: Hiring API + Soft Delete (Week 5-6)
- Opportunity CRUD
- Creator-facing delete/restore for opportunities
- Invite/passport management with token
- Creator-facing delete for invites and passports
- Application pipeline with status transitions
- Public endpoints, domain business rules

### Phase 7: Hard Delete Approval Workflow (Week 6)
- HardDeleteRequests table
- Request/approve/reject endpoints
- Two-admin approval enforcement
- Blob purge on hard delete

### Phase 8: Infrastructure as Code (Week 7)
- Write Bicep modules for all Azure resources
- Parameter files for dev, UAT, production
- Validate locally with `az deployment what-if`
- Test resource creation in a throwaway environment

### Phase 9: CI/CD Pipeline (Week 7-8)
- GitHub Actions `ci.yml` -- PR validation workflow
- GitHub Actions `cd.yml` -- deploy workflow with:
  - OIDC federated credentials to Azure
  - Slot deployment + swap
  - Health check gates
  - Approval gate for production
  - Smoke tests
- `scripts/deploy.sh` for local/CI deploy runs
- `scripts/smoke-test.sh` for post-deploy validation

### Phase 10: Frontend Integration (Week 8-10)
- AuthService with Google OAuth
- JwtInterceptor, ErrorInterceptor
- HttpAccountDataSource, HttpHiringDataSource
- File upload components with progress
- Delete/restore buttons on accounts, opportunities, passports, files
- Admin dashboard for deleted accounts and hard-delete approvals
- Remove TEST_CREDENTIALS and hardcoded admin
- Remove localStorage persistence
- End-to-end testing

### Phase 11: Production Deployment (Week 10-11)
- Deploy infrastructure via Bicep (green + blue slots)
- Google Cloud Console production OAuth client
- Run CI/CD pipeline: UAT -> approval -> production
- Verify green/blue swap, rollback, health checks
- Configure monitoring dashboards and alerts
- Apply Blob lifecycle policy (Hot -> Cool -> Archive)

---

## 10. Potential Challenges

| Challenge | Mitigation |
|-----------|-----------|
| Large video uploads (200MB+) | Chunked upload via Azure Blob SDK; progress tracking |
| Orphaned blobs after soft delete | Retention policy (Hot->Cool->Archive); hard-delete purges |
| Google OAuth dependency | SMS fallback + email OTP for users without Google |
| SMS costs | ~$0.01/msg via Azure ACS; only for verification, not login |
| Green/blue DB compatibility | Additive-only migrations; two-deploy breaking changes |
| Concurrent founder assignment | Serializable transaction; first 1000 only |
| Bicep state management | No state file -- ARM is source of truth |
| OIDC credential expiry | Auto-rotated by Azure AD; no manual management |
| Rollback with DB changes | Additive migrations mean old code works with new schema |
| Environment-specific config drift | Same artifact, different `appsettings.{env}.json` + Key Vault |

---

### Critical Files for Implementation

- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account.ts` -- Domain types; add `DeletedAtUtc` to `AccountRecord`
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/hiring.ts` -- Domain types; add `DeletedAtUtc` to hiring entities
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/store/app.reducer.ts` -- Contains all current backend logic
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account-data.source.ts` -- The migration seam
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/app.config.ts` -- Central DI configuration
