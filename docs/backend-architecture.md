# ClinicX Talent -- Backend Implementation Plan

## 1. Overview and Key Design Decisions

The current application is entirely client-side: domain logic lives in NgRx reducers, data persists in localStorage, authentication is simulated via hardcoded test credentials, and SMS verification is a no-op that accepts a fixed set of phone/code pairs. The data source abstractions (`AccountDataSource`, `HiringDataSource`) already exist and are injected via Angular DI -- the frontend migration path is clean: swap local implementations for HTTP implementations that call the new ASP.NET Core API.

**Core architectural principles:**
- Clean Architecture (Presentation / Application / Domain / Infrastructure layers)
- ASP.NET Core 9 with minimal API controllers
- Entity Framework Core with PostgreSQL (via Npgsql)
- JWT bearer tokens for authentication
- Twilio Verify API for phone verification (with local SMS mock during development)
- Azure (production) / Docker Compose (development)

**Database choice: PostgreSQL over SQL Server:**
- Native JSONB columns for `CertificateNames` and `GalleryNames` arrays, avoiding string serialization and enabling real JSON queries at the database level if needed later
- Better free/developer-tier options (Neon, Supabase, Railway) during early development
- Azure Database for PostgreSQL Flexible Server is a fully managed Azure service for production
- EF Core support via Npgsql is first-class with code-first approach, migrations, LINQ

**Development approach: local-first, free until production:**
- Development uses Docker Compose to run PostgreSQL locally + the API + the Angular app
- SMS verification uses a local mock (logs code to console / writes to file) during dev, Twilio in production
- No Azure deployment until Phase 9 when the system is proven and ready
- Free managed Postgres (Neon, Supabase) can substitute for the Docker Postgres if a shared dev DB is needed
- Azure Free Trial covers production deployment costs for the first 12 months

**Deployment approach: green/blue swap:**
- Two App Service slots (green and blue) -- one active, one staging
- Deploy to the inactive slot, run smoke tests, then swap
- Database migrations are additive-only (no destructive changes) to support backward compatibility during swap
- Rollback = swap back to the previous slot

**Environments:**
| Environment | Postgres Host | API Host | Purpose |
|------------|--------------|----------|---------|
| Local dev | Docker Compose (localhost:5432) | localhost:5000 | Daily development |
| Dev | Neon/Supabase free tier | Optional cloud host | Shared integration testing |
| UAT (blue) | Azure PostgreSQL Flexible Server | Azure App Service slot | Pre-production validation |
| Production (green) | Azure PostgreSQL Flexible Server | Azure App Service slot | Live traffic |

---

## 2. Backend Project Structure

```
ClinicX/
  docker-compose.yml               # Postgres + API + pgadmin (local dev)
  docker-compose.prod.yml          # Production overrides
  ClinicX.sln
  src/
    ClinicX.Api/
      Controllers/
        AuthController.cs
        AccountsController.cs
        HiringController.cs
        PassportsController.cs
        AdminController.cs
        PublicController.cs
      Middleware/
        ExceptionMiddleware.cs
        RequestLoggingMiddleware.cs
      Program.cs
      appsettings.json
      appsettings.Development.json  # Local PostgreSQL connection
      appsettings.Uat.json         # UAT PostgreSQL connection
      appsettings.Production.json  # Production PostgreSQL connection

    ClinicX.Application/
      Common/
        Interfaces/
          ICurrentUserService.cs
          IJwtService.cs
          ISmsService.cs
          IFileStorageService.cs
      Auth/
        Commands/
        Dtos/
        Services/
      Accounts/
        Commands/
        Queries/
        Dtos/
      Hiring/
        Commands/
        Queries/
        Dtos/
      Founder/
        Queries/
        Dtos/
      Admin/
        Commands/
        Queries/

    ClinicX.Domain/
      Entities/
        Account.cs
        ClinicDetails.cs
        TalentDetails.cs
        HiringOpportunity.cs
        HiringInvite.cs
        TalentPassportShare.cs
        TalentApplication.cs
        PhoneVerification.cs
        VerificationSecurityRecord.cs
        AdminUser.cs
        RefreshToken.cs
      Enums/
        AccountType.cs
        ReviewStatus.cs
        OpportunityStatus.cs
        ApplicationSource.cs
        ApplicationStatus.cs
        ThemePreference.cs
      ValueObjects/
        PhoneNumber.cs
      Exceptions/
        DomainException.cs
        NotFoundException.cs
        UnauthorizedException.cs

    ClinicX.Infrastructure/
      Persistence/
        ClinicXDbContext.cs
        Migrations/
        Configurations/
        Repositories/
        Seed/
          SeedData.cs               # Test/dev seed data (runs via config switch)
      Services/
        SmsService.cs               # Twilio implementation
        SmsServiceMock.cs           # Local dev mock (logs to console)
        JwtService.cs
        FileStorageService.cs
        CurrentUserService.cs

  tests/
    ClinicX.UnitTests/
      Auth/
      Accounts/
      Hiring/
      Founder/
    ClinicX.IntegrationTests/
      DatabaseFixture.cs            # Spin up test Postgres via Testcontainers
      AuthTests/
      AccountsTests/
      HiringTests/
    ClinicX.Api.Tests/
      AuthControllerTests.cs
      AccountsControllerTests.cs
```

---

## 3. Database Schema (EF Core with PostgreSQL)

### Type mapping (SQL Server -> PostgreSQL):

| SQL Server | PostgreSQL | Reason |
|-----------|-----------|--------|
| UNIQUEIDENTIFIER | UUID | Guid in .NET maps natively to PostgreSQL uuid |
| NEWSEQUENTIALID() | gen_random_uuid() | Built-in UUID v4 generation (no extension needed) |
| NVARCHAR(n) | VARCHAR(n) | Same semantics; PostgreSQL is UTF-8 natively |
| NVARCHAR(MAX) for JSON | JSONB | Allows JSON queries and indexing |
| DATETIME2 | TIMESTAMPTZ | Timezone-aware timestamp (always UTC) |
| BIT | BOOLEAN | Cleaner semantics |
| INT | INTEGER | Identical |
| SYSUTCDATETIME() | NOW() | PostgreSQL NOW() returns current transaction time |

### 3.1 Accounts

```sql
CREATE TABLE Accounts (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Type            VARCHAR(20)     NOT NULL,       -- 'clinic' | 'talent'
    Phone           VARCHAR(20)     NOT NULL,       -- normalized (digits only)
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
    Founder         BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IX_Accounts_Phone ON Accounts(Phone);
```

### 3.2 Account Details (1:1 with Accounts)

```sql
CREATE TABLE ClinicDetails (
    AccountId       UUID            PRIMARY KEY REFERENCES Accounts(Id),
    ClinicName      VARCHAR(200)    NOT NULL,
    Location        VARCHAR(500)    NOT NULL DEFAULT '',
    City            VARCHAR(200)    NOT NULL DEFAULT '',
    State           VARCHAR(100)    NOT NULL DEFAULT '',
    Website         VARCHAR(500)    NOT NULL DEFAULT '',
    Specialties     VARCHAR(1000)   NOT NULL DEFAULT '',
    About           TEXT            NOT NULL DEFAULT '',
    Position        VARCHAR(200)    NOT NULL DEFAULT '',
    MustHaveSkills  VARCHAR(1000)   NOT NULL DEFAULT '',
    PayRange        VARCHAR(200)    NOT NULL DEFAULT '',
    Benefits        VARCHAR(1000)   NOT NULL DEFAULT '',
    Urgency         VARCHAR(200)    NOT NULL DEFAULT '',
    IdealHire       TEXT            NOT NULL DEFAULT ''
);

CREATE TABLE TalentDetails (
    AccountId           UUID            PRIMARY KEY REFERENCES Accounts(Id),
    ProfessionalName    VARCHAR(200)    NOT NULL DEFAULT '',
    PhotoName           VARCHAR(500)    NOT NULL DEFAULT '',
    VideoName           VARCHAR(500)    NOT NULL DEFAULT '',
    Role                VARCHAR(200)    NOT NULL DEFAULT '',
    Location            VARCHAR(500)    NOT NULL DEFAULT '',
    YearsExperience     VARCHAR(50)     NOT NULL DEFAULT '',
    ExperienceTimeline  TEXT            NOT NULL DEFAULT '',
    Skills              VARCHAR(1000)   NOT NULL DEFAULT '',
    CertificateNames    JSONB           NOT NULL DEFAULT '[]',  -- native JSON array
    Availability        VARCHAR(200)    NOT NULL DEFAULT '',
    SalaryExpectation   VARCHAR(200)    NOT NULL DEFAULT '',
    Languages           VARCHAR(500)    NOT NULL DEFAULT '',
    PortfolioUrl        VARCHAR(500)    NOT NULL DEFAULT '',
    GalleryNames        JSONB           NOT NULL DEFAULT '[]',  -- native JSON array
    Introduction        TEXT            NOT NULL DEFAULT ''
);
```

### 3.3 Hiring Opportunities

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
    UpdatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IX_HiringOpportunities_ClinicAccountId ON HiringOpportunities(ClinicAccountId);
CREATE INDEX IX_HiringOpportunities_Slug ON HiringOpportunities(Slug, PositionSlug);
```

### 3.4 Hiring Invites

```sql
CREATE TABLE HiringInvites (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    OpportunityId   UUID            NOT NULL REFERENCES HiringOpportunities(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ExpiresAtUtc    TIMESTAMPTZ     NOT NULL,
    Active          BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IX_HiringInvites_Token ON HiringInvites(Token);
CREATE INDEX IX_HiringInvites_OpportunityId ON HiringInvites(OpportunityId);
```

### 3.5 Talent Passport Shares

```sql
CREATE TABLE TalentPassportShares (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    TalentAccountId UUID            NOT NULL REFERENCES Accounts(Id),
    Token           VARCHAR(100)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    Active          BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IX_TalentPassportShares_Token ON TalentPassportShares(Token);
CREATE INDEX IX_TalentPassportShares_TalentAccountId ON TalentPassportShares(TalentAccountId);
```

### 3.6 Talent Applications

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
    UpdatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IX_TalentApplications_TalentAccountId ON TalentApplications(TalentAccountId);
CREATE INDEX IX_TalentApplications_ClinicAccountId ON TalentApplications(ClinicAccountId);

-- Prevent duplicate applications (PostgreSQL partial unique index)
CREATE UNIQUE INDEX IX_TalentApplications_Unique 
    ON TalentApplications(TalentAccountId, ClinicAccountId, OpportunityId)
    WHERE OpportunityId IS NOT NULL;
CREATE UNIQUE INDEX IX_TalentApplications_UniqueNoOpp
    ON TalentApplications(TalentAccountId, ClinicAccountId)
    WHERE OpportunityId IS NULL;
```

### 3.7 Phone Verification

```sql
CREATE TABLE PhoneVerifications (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Phone           VARCHAR(20)     NOT NULL,
    CodeHash        VARCHAR(200)    NOT NULL,       -- bcrypt hash of code
    ExpiresAtUtc    TIMESTAMPTZ     NOT NULL,
    VerifiedAtUtc   TIMESTAMPTZ     NULL,
    AttemptCount    INTEGER         NOT NULL DEFAULT 0,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IX_PhoneVerifications_Phone ON PhoneVerifications(Phone);
```

### 3.8 Verification Security (rate limiting)

```sql
CREATE TABLE VerificationSecurityRecords (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Phone           VARCHAR(20)     NOT NULL,
    AttemptCount    INTEGER         NOT NULL DEFAULT 0,
    LockedUntilUtc  TIMESTAMPTZ     NULL,
    FirstAttemptUtc TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    LastAttemptUtc  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    Flagged         BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IX_VerificationSecurityRecords_Phone ON VerificationSecurityRecords(Phone);
```

### 3.9 Admin Users

```sql
CREATE TABLE AdminUsers (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Username        VARCHAR(100)    NOT NULL,
    PasswordHash    VARCHAR(500)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IX_AdminUsers_Username ON AdminUsers(Username);
```

### 3.10 Refresh Tokens

```sql
CREATE TABLE RefreshTokens (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId       UUID            NOT NULL REFERENCES Accounts(Id),
    Token           VARCHAR(500)    NOT NULL,
    ExpiresAtUtc    TIMESTAMPTZ     NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    RevokedAtUtc    TIMESTAMPTZ     NULL
);

CREATE INDEX IX_RefreshTokens_AccountId ON RefreshTokens(AccountId);
CREATE UNIQUE INDEX IX_RefreshTokens_Token ON RefreshTokens(Token);
```

### 3.11 Bulletproof Database -- Movable Data

The database is designed so data can be moved between environments safely. Key principles:

1. **All schema changes are additive migrations.** No destructive DDL (DROP, ALTER COLUMN that removes data). New columns are nullable or have defaults. Old columns are deprecated via code, not removed. This enables safe green/blue swap: the old slot continues to work with the new schema.

2. **Seed data is a configurable concern.** Three seed data profiles:
   - `Development`: loads `SEEDED_ACCOUNTS`, `SEEDED_OPPORTUNITIES`, etc. from the frontend -- mirrors what localStorage currently has, so developers have a known baseline.
   - `Test`: minimal essential seeds (admin user, one clinic, one talent).
   - `Production`: production admin user only. No demo accounts.

   The seed profile is controlled by `appsettings.{Environment}.json`:
   ```json
   {
     "SeedData": {
       "Profile": "Development" // or "Test" or "Production"
     }
   }
   ```

3. **Database snapshots for testing.** A CLI dotnet tool (or a simple script in `scripts/`) can dump and restore a full database snapshot:
   ```bash
   # Save state before a risky migration test
   ./scripts/db-snapshot.sh save pre-migration-test
   
   # Run migration
   dotnet ef database update
   
   # Test...
   
   # Restore clean state
   ./scripts/db-snapshot.sh restore pre-migration-test
   ```
   This uses `pg_dump` / `pg_restore` under the hood.

4. **Testcontainers for integration tests.** Unit tests against a real PostgreSQL spun up in Docker:
   ```csharp
   public class DatabaseFixture : IAsyncLifetime
   {
       private readonly PostgreSqlContainer _container = 
           new PostgreSqlBuilder()
               .WithImage("postgres:16-alpine")
               .Build();
       
       public string ConnectionString => _container.GetConnectionString();
       
       public async Task InitializeAsync() => await _container.StartAsync();
       public async Task DisposeAsync() => await _container.DisposeAsync();
   }
   ```
   Each test run starts fresh, no shared state, no cleanup needed.

---

## 4. API Design

### 4.1 Base URL

```
Dev:   http://localhost:5000/api/v1/
Prod:  https://api.clinicx-talent.com/api/v1/
UAT:   https://uat-api.clinicx-talent.com/api/v1/
```

### 4.2 Authentication Endpoints

```
POST /api/v1/auth/send-code
  Request:  { phone: string }
  Response: { success: boolean, message: string }
  Notes:    Normalizes phone, sends code via Twilio (or mock). Returns 429 if rate-limited.

POST /api/v1/auth/verify-code
  Request:  { phone: string, code: string }
  Response: { token: string, refreshToken: string, account: AccountDto | null,
              isNewAccount: boolean }

POST /api/v1/auth/sign-in
  Request:  { phone: string, code: string }
  Response: { token: string, refreshToken: string, account: AccountDto }

POST /api/v1/auth/refresh
  Request:  { refreshToken: string }
  Response: { token: string, refreshToken: string }

POST /api/v1/auth/admin/login
  Request:  { username: string, password: string }
  Response: { token: string, adminUser: AdminUserDto }

POST /api/v1/auth/admin/logout
```

### 4.3 Account Endpoints

```
GET    /api/v1/accounts/me               -> AccountDto
PUT    /api/v1/accounts/me               -> AccountDto (displayName, email, etc.)
PUT    /api/v1/accounts/me/profile       -> AccountDto (ClinicDetails / TalentDetails)
PUT    /api/v1/accounts/me/theme         -> AccountDto (themePreference)
GET    /api/v1/accounts?type=&page=      -> paginated list (admin)
GET    /api/v1/accounts/{id}             -> AccountDto (admin or own)
PUT    /api/v1/accounts/{id}/status      -> AccountDto (admin only)
```

### 4.4 Hiring Endpoints

```
GET    /api/v1/hiring/opportunities              -> OpportunityDto[]
POST   /api/v1/hiring/opportunities              -> OpportunityDto (creates + invite)
PUT    /api/v1/hiring/opportunities/{id}         -> OpportunityDto
PUT    /api/v1/hiring/opportunities/{id}/status  -> OpportunityDto
POST   /api/v1/hiring/opportunities/{id}/invites -> { invite, shareUrl }
POST   /api/v1/hiring/passports                  -> { passport, shareUrl }
PUT    /api/v1/hiring/passports/{id}/deactivate  -> PassportShareDto
GET    /api/v1/hiring/applications               -> ApplicationDto[]
POST   /api/v1/hiring/applications               -> ApplicationDto
PUT    /api/v1/hiring/applications/{id}/status   -> ApplicationDto
```

### 4.5 Public Endpoints (no auth)

```
GET    /api/v1/public/hiring/{clinicSlug}/{positionSlug}?invite={token}
GET    /api/v1/public/talent/{talentSlug}
GET    /api/v1/public/clinic/{clinicSlug}
GET    /api/v1/public/invite/{token}
```

### 4.6 Admin Endpoints

```
GET    /api/v1/admin/accounts/verification-security
POST   /api/v1/admin/accounts/verification-security/reset
GET    /api/v1/admin/stats
```

### 4.7 Response Envelope

```json
{
  "data": { ... },
  "success": true,
  "error": null
}
```

Error response:
```json
{
  "data": null,
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "The verification code does not match.",
    "details": { "remainingAttempts": 2 }
  }
}
```

Error codes: `PHONE_LOCKED`, `INVALID_CODE`, `RATE_LIMITED`, `DUPLICATE_APPLICATION`, `INVALID_STATUS_TRANSITION`, `INVITE_EXPIRED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`.

---

## 5. Auth and Security

### 5.1 Phone Verification Flow

```
1. User enters phone number
2. Frontend POSTs to /api/v1/auth/send-code
3. Backend:
   a. Normalizes phone
   b. Checks VerificationSecurityRecords for lockout
   c. Generates 6-digit code
   d. Stores bcrypt hash in PhoneVerifications
   e. Sends code via Twilio (production) or logs to console (dev mock)
   f. Increments attempt counter in VerificationSecurityRecords
   g. If >3 attempts, locks phone for 15 minutes
   h. If >5 distinct phones in last hour, sets flagged=true
4. Frontend shows code input
5. User enters code
6. Frontend POSTs to /api/v1/auth/verify-code
7. Backend:
   a. Finds PhoneVerification by phone
   b. Checks expiration (< 5 minutes)
   c. Verifies code hash
   d. On success: issues JWT + refresh token
   e. On failure: increments attempt count
```

### 5.2 SMS Mock for Local Development

Instead of calling Twilio, the mock SMS service logs the verification code:

```csharp
public class SmsServiceMock : ISmsService
{
    public Task SendVerificationCodeAsync(string phone, string code)
    {
        Console.WriteLine($"[SMS MOCK] Code for {phone}: {code}");
        // Also write to a file the Angular dev server can poll
        File.AppendAllText("sms-codes.log", $"{phone}:{code}{Environment.NewLine}");
        return Task.CompletedTask;
    }
}
```

The DI registration switches based on environment:
```csharp
if (builder.Environment.IsDevelopment())
    builder.Services.AddScoped<ISmsService, SmsServiceMock>();
else
    builder.Services.AddScoped<ISmsService, SmsService>();
```

In development, the Angular app can display the code from the mock log on screen (useful for manual testing). In UAT/production, the real Twilio API is used.

### 5.3 JWT Claims

```json
{
  "sub": "account-guid",
  "type": "clinic",
  "status": "approved",
  "role": "user",
  "iat": 1721836800,
  "exp": 1721923200,
  "iss": "clinicx-talent-api",
  "aud": "clinicx-talent-app"
}
```

- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Admin tokens include `"role": "admin"`
- Signing key in Azure Key Vault (production) / appsettings.Development.json (local dev)

### 5.4 Authorization Policies

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ClinicOnly", policy =>
        policy.RequireClaim("type", "clinic"));
    options.AddPolicy("TalentOnly", policy =>
        policy.RequireClaim("type", "talent"));
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("role", "admin"));
    options.AddPolicy("ApprovedClinic", policy =>
        policy.RequireClaim("type", "clinic")
              .RequireClaim("status", "approved"));
});
```

### 5.5 Rate Limiting

- 3 failed verification attempts per phone -> 15-minute lockout
- 5 distinct phones in 60 minutes -> admin flag
- General API: 100 requests/minute per IP
- SMS: 1 per 30 seconds per phone number

---

## 6. Azure Services (Production / UAT)

### 6.1 Resource Table

| Resource | SKU / Tier | Purpose |
|----------|-----------|---------|
| App Service | B1 (Linux) -- 2 slots (green + blue) | Host ASP.NET Core API |
| PostgreSQL Flexible Server | Burstable B1ms (1 vCore, 2 GB) | Primary data store |
| Key Vault | Standard | JWT signing key, Twilio creds, connection strings |
| Storage Account | Standard LRS (Blob) | Certificates, photos, videos |
| App Insights | Per-GB | Logging, exceptions, perf monitoring |

All resources fit within the Azure Free Trial (12 months) except PostgreSQL Flexible Server which has a free tier of its own (Burstable B1ms, 32 GB storage, 12 months).

### 6.2 Green/Blue Deployment Architecture

```
[Azure Front Door / DNS]
        |
        v
   [App Service]
   /            \
  Slot: green    Slot: blue
  (production)   (staging)
       |              |
       +---- DB ------+
       (single PostgreSQL instance, same schema)
```

**Deployment flow:**
1. Deploy new build to the inactive slot (e.g., blue while green serves traffic)
2. Run smoke tests against the inactive slot
3. Run EF Core migrations (additive only -- no column drops or destructive changes)
4. Swap the slots: blue becomes production, green becomes staging
5. Monitor the new production slot
6. If rollback needed: swap back (immediate, no schema issues because migrations were additive)

The single PostgreSQL instance is shared. Both slots connect to the same database. This is safe because:
- Migrations are always additive (new columns nullable or defaulted)
- Old code ignores new columns it doesn't know about
- New code handles null/empty states for old data
- Breaking schema changes are two-phase: (1) add column + write dual code, (2) next deploy removes old column

### 6.3 Environment Configuration

```
appsettings.json                  # Shared defaults
appsettings.Development.json      # Local Docker PostgreSQL
appsettings.Uat.json              # UAT Azure PostgreSQL
appsettings.Production.json       # Production Azure PostgreSQL + Key Vault refs
```

Environment variable `ASPNETCORE_ENVIRONMENT` controls which config is loaded:
```bash
# Local
ASPNETCORE_ENVIRONMENT=Development

# UAT slot
ASPNETCORE_ENVIRONMENT=Uat

# Production slot
ASPNETCORE_ENVIRONMENT=Production
```

### 6.4 Deployment Pipeline

```
GitHub main branch
  -> GitHub Actions:
     1. dotnet restore, build, test
     2. dotnet publish
     3. Deploy to Azure App Service (inactive slot)
     4. Run smoke tests
     5. Run EF Core migrations (idempotent, additive)
     6. Swap slots (green <-> blue)
     7. Run post-deploy validation
```

---

## 7. Migration Strategy

### 7.1 Key Insight: Abstract Data Sources

The frontend already uses abstract data sources:

```typescript
export abstract class AccountDataSource {
  abstract getAll(): Record<string, AccountRecord>;
  abstract getById(id: string): AccountRecord | undefined;
  abstract invalidate(): void;
}
```

Migration swaps the provider in `app.config.ts`:

```typescript
// Before:
{ provide: AccountDataSource, useClass: LocalAccountDataSource },

// After:
{ provide: AccountDataSource, useClass: HttpAccountDataSource, deps: [HttpClient] },
```

**No component code changes required.**

### 7.2 Dual-Run Strategy

During phases 2-6, both systems coexist:

1. Frontend data sources check for API reachability
2. Fall back to localStorage if backend unreachable
3. Feature flag in environment config: `useBackend: false`

```typescript
// src/environments/environment.ts
export const environment = {
  apiUrl: 'http://localhost:5000/api/v1',
  useBackend: false,  // flip to true when API is ready
};
```

### 7.3 Seed Data Strategy

Existing `SEEDED_ACCOUNTS`, `SEEDED_OPPORTUNITIES`, etc. from the frontend become EF Core seed data, loaded only in development environment. On the frontend, the hydration meta-reducer no longer carries seeds -- the API is the single source of truth.

### 7.4 Local Development Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: clinicx
      POSTGRES_USER: clinicx
      POSTGRES_PASSWORD: clinicx_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__ClinicXDb: "Host=postgres;Database=clinicx;Username=clinicx;Password=clinicx_dev"
    depends_on:
      - postgres

volumes:
  pgdata:
```

Start everything with `docker compose up`. The Angular app runs locally via `ng serve` on :4200, proxying API calls to localhost:5000. This keeps the frontend hot-reload cycle fast while the backend runs in Docker.

For those who prefer running Postgres natively without Docker:
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
createdb clinicx
```

---

## 8. Frontend Changes

### 8.1 New Files

```
src/app/core/
  http-account.data.source.ts    # HTTP impl of AccountDataSource
  http-hiring.data.source.ts     # HTTP impl of HiringDataSource
  auth.service.ts                # Token management, login/logout, refresh
  jwt.interceptor.ts             # Attach JWT to all outgoing requests
  error.interceptor.ts           # Handle 401/403/429 globally
  api-error.ts                   # Error types matching backend envelope

src/environments/
  environment.ts                 # apiUrl, useBackend flag
```

### 8.2 Auth Service

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'clinicx.jwt';
  private readonly refreshKey = 'clinicx.refresh';

  getToken(): string | null { ... }
  setToken(token: string): void { ... }
  clearTokens(): void { ... }
  isAuthenticated(): boolean { ... }

  sendCode(phone: string): Observable<boolean> { ... }
  verifyCode(phone: string, code: string): Observable<AuthResult> { ... }
  refreshToken(): Observable<TokenPair> { ... }
  adminLogin(username: string, password: string): Observable<AdminLoginResult> { ... }
  adminLogout(): void { ... }
}
```

### 8.3 JWT Interceptor

```typescript
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandlerFn) {
    const token = inject(AuthService).getToken();
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return next(req);
  }
}
```

### 8.4 Reducer Changes

- Remove `credentialMatches()` function
- Remove `TEST_CREDENTIALS` reference
- Remove hardcoded admin login (`admin`/`admin`)
- Remove local account creation from verifyRegistrationCode
- Remove in-memory verificationSecurity tracking

### 8.5 Effects Changes

- Remove `persistState$` (no more localStorage persistence)
- Remove `persistGuestTheme$` (or modify to call API)
- Remove `persistReviewReminder$` (move to API)
- Modify data-loading effects to call API instead of local data sources
- Navigation effects remain unchanged

### 8.6 Guard Changes

Option A (recommended for minimal changes): Keep reading from NgRx store. Store is hydrated from API on app init.

Option B: Read JWT claims directly:
```typescript
export const clinicAccountGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/signin']);
  const claims = parseJwt(auth.getToken()!);
  return claims.type === 'clinic' ? true : router.createUrlTree(['/signin']);
};
```

### 8.7 Hydration Meta-Reducer

After migration, the hydration meta-reducer in `storage.ts` is removed. The NgRx store initializes empty and populates via API effects.

### 8.8 App Config (after migration)

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: AccountDataSource, useClass: HttpAccountDataSource },
    { provide: HiringDataSource, useClass: HttpHiringDataSource },
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
    provideRouter(routes),
    provideStore({ app: appReducer }),
    provideEffects(AppEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
```

### 8.9 Proxy Config for Local Dev

To avoid CORS issues during local development, use an Angular proxy:

```json
// src/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false
  }
}
```

```json
// angular.json snippet
"serve": {
  "options": {
    "proxyConfig": "src/proxy.conf.json"
  }
}
```

---

## 9. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- Scaffold solution with 4 projects (Api, Application, Domain, Infrastructure)
- Define domain entities and enums matching frontend types
- Add NuGet packages: `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `Twilio`, `Azure.Identity`, `Azure.Security.KeyVault.Secrets`, `Azure.Storage.Blobs`, `MediatR`, `FluentValidation`
- Configure EF Core with PostgreSQL (Npgsql), enable connection resilience
- Write `docker-compose.yml` for local PostgreSQL
- Create `SmsServiceMock` that logs codes to console/file
- Create initial migration with development seed data
- Implement ExceptionMiddleware
- Verify /health endpoint works on localhost:5000
- Write integration test fixture using Testcontainers

### Phase 2: Auth System (Week 2)
- Phone verification: mock for dev, Twilio interface for production
- JWT issuance with 15-min access + 7-day refresh tokens
- Rate limiting (3 attempts locks phone, 5 phones flags system)
- Admin login against AdminUsers table
- SMS mock for local development (visible in console)
- Swagger / OpenAPI documentation for auth endpoints

### Phase 3: Accounts API (Week 2-3)
- Account CRUD endpoints
- Profile update (ClinicDetails, TalentDetails)
- Contact/theme preferences
- Founder 1000 Club logic
- FluentValidation for request models

### Phase 4: Hiring API (Week 3-4)
- Opportunity CRUD with slug generation
- Invite creation with 30-day expiry
- Passport share creation
- Application creation and status pipeline
- Public endpoints (no auth)
- Domain business rules (canCreateOpportunity, isInviteValid, getNextApplicationStatus)

### Phase 5: Admin API (Week 4)
- Verification security overview and reset
- Account review status management
- Dashboard stats

### Phase 6: Frontend Auth Integration (Week 4-5)
- AuthService, JwtInterceptor, ErrorInterceptor
- HttpAccountDataSource and HttpHiringDataSource
- Feature flag in environment config
- Angular proxy config for local development
- Replace TEST_CREDENTIALS and hardcoded admin
- Update registration/sign-in flows
- Full end-to-end testing against local Docker backend

### Phase 7: Frontend Full Integration (Week 5-6)
- Remove localStorage persistence effects
- Remove hydrationMetaReducer
- Remove local data source implementations
- Add loading states for API calls
- Convert date formatting (ISO 8601 -> display)
- End-to-end testing against local Docker backend

### Phase 8: Media Storage (Week 6)
- Azure Blob storage for file uploads (use local filesystem mock in dev)
- Upload endpoints in AccountsController
- File type/size validation

### Phase 9: Production Deployment (Week 6-7)
- Set up Azure resources via Bicep/ARM:
  - App Service with green and blue deployment slots
  - PostgreSQL Flexible Server (free tier)
  - Key Vault with secrets
  - Storage Account
  - Application Insights
- Configure `appsettings.Uat.json` and `appsettings.Production.json`
- Set up GitHub Actions CI/CD with slot swap
- Implement additive-only migration strategy
- Deploy to UAT slot first, test, then deploy and swap to production
- Performance and security testing

---

## 10. Bulletproof Database -- Data Mobility

The database is designed to be moved, reset, and tested freely across environments.

### 10.1 Migration Philosophy

Every migration is **additive only** -- this is what makes green/blue swaps safe:

```
Good:    ADD COLUMN ... NULL                  -- old code ignores it
Good:    CREATE INDEX ...                     -- read perf improvement, no breaking change
Good:    CREATE TABLE ...                     -- new entity, no one touches it yet

Bad:     DROP COLUMN ...                      -- old code crashes
Bad:     ALTER COLUMN ... NOT NULL            -- old inserts fail
Bad:     RENAME TABLE ...                     -- old code can't find it
Bad:     ALTER COLUMN ... TYPE                -- data conversion risk
```

Breaking changes are done in **two deployments**:
1. First deploy: add new column/table, write dual code (writes to both old and new, reads from new)
2. Second deploy: remove old column/table reference from code, then drop from schema

### 10.2 Scripts for Data Mobility

```bash
# Save a snapshot of the current database state (dev only)
scripts/db-snapshot.sh save my-feature-test

# Load demo seed data into any environment
scripts/db-seed.sh demo --env=uat

# Reset development database to clean state (drops and recreates)
scripts/db-reset.sh

# Copy database from UAT to local for debugging
scripts/db-copy.sh uat local

# Dump schema only (no data) from any environment
scripts/db-schema.sh dump uat > schema.sql
```

### 10.3 Seed Data Profiles

| Profile | Contents | When |
|---------|----------|------|
| `Development` | Full demo set (6 accounts, 1 opportunity, 1 invite, 1 passport, 0 apps) | Local dev, first migration apply |
| `Test` | Admin user + 2 accounts (1 clinic, 1 talent) | Integration tests, CI |
| `Production` | Admin user only | First production migration, then live data |
| `Demo` | Full demo set (like dev, but used for UAT/demo environments) | UAT slot, demo servers |

### 10.4 Testcontainers Integration Tests

Every integration test starts with a fresh, disposable PostgreSQL:

```csharp
public class AccountRepositoryTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;
    
    public AccountRepositoryTests(DatabaseFixture fixture) => _fixture = fixture;
    
    [Fact]
    public async Task Create_Account_Persists()
    {
        // Arrange -- fresh DB, fresh migration, fresh seed
        await using var ctx = _fixture.CreateDbContext();
        await ctx.Database.MigrateAsync();
        await SeedData.ApplyAsync(ctx, SeedProfile.Test);
        
        // Act
        var account = new Account { Type = AccountType.Clinic, Phone = "3125550101", ... };
        ctx.Accounts.Add(account);
        await ctx.SaveChangesAsync();
        
        // Assert
        var saved = await ctx.Accounts.FindAsync(account.Id);
        Assert.NotNull(saved);
    }
}
```

No shared state, no cleanup, no ordering problems. Each test method is fully isolated.

---

## 11. Potential Challenges

| Challenge | Mitigation |
|-----------|-----------|
| Data loss during migration | Keep localStorage fallback; seed database with exact copy of seed data; migration rollback plan |
| Twilio SMS costs | Twilio Verify free tier: 10,000 verifications/month; local mock during dev |
| JWT expiration UX | Auto-refresh via interceptor; toast on session expiry |
| Date format mismatch | API returns ISO 8601 UTC; frontend formats via DatePipe |
| Concurrent founder assignment | Serializable transaction; only first 1000 accounts ever get it |
| File upload limits | ASP.NET Core request size limits; chunked upload for video |
| Green/blue DB compatibility | Additive-only migrations; dual-write during transition periods; old code ignores new columns |
| PostgreSQL connection pooling | Npgsql built-in pooling (default 100); adjust for Flexible Server limits |
| Cross-slot CORS in dev | Angular proxy config on :4200 -> :5000; no CORS needed in development |

---

## 12. Files That Change

### Files to Modify (Frontend):
- `src/app/app.config.ts` -- swap data source providers, add interceptors
- `src/app/core/store/app.reducer.ts` -- remove credential matching, admin login, local account creation
- `src/app/core/store/app.effects.ts` -- remove localStorage persistence, add API calls

### Files to Delete (Frontend):
- `src/app/core/store/storage.ts` -- hydration meta-reducer replaced by API init
- `src/app/core/account-data.source.ts` -- LocalAccountDataSource removed
- `src/app/core/hiring-data.source.ts` -- LocalHiringDataSource removed

### Files to Create (Frontend):
- `src/app/core/http-account.data.source.ts`
- `src/app/core/http-hiring.data.source.ts`
- `src/app/core/auth.service.ts`
- `src/app/core/jwt.interceptor.ts`
- `src/app/core/error.interceptor.ts`
- `src/proxy.conf.json` -- Angular dev server proxy

### Files to Create (Backend):
- Entire solution structure in `ClinicX/` directory (see Section 2)
- `docker-compose.yml` -- local PostgreSQL + API containers

### Files to Create (Operations):
- `scripts/db-snapshot.sh` -- database snapshot/restore
- `scripts/db-seed.sh` -- seed data loading
- `scripts/db-reset.sh` -- development database reset
- `.github/workflows/deploy.yml` -- CI/CD with green/blue swap

---

## 13. Key Architectural Notes

### Domain Logic Migration

The following pure functions from the frontend move to the backend with minimal changes:

| Frontend File | Function | Backend Destination |
|--------------|----------|-------------------|
| `account.ts` | `normalizePhone()` | `PhoneNumber.cs` value object |
| `account.ts` | `formatPhone()` | `PhoneNumber.cs` value object |
| `hiring.ts` | `canCreateOpportunity()` | `HiringService.cs` or domain service |
| `hiring.ts` | `isInviteValid()` | `HiringInvite.cs` entity method |
| `hiring.ts` | `generateSlug()` | `HiringOpportunity.cs` or service |
| `hiring.ts` | `generateInviteToken()` | `HiringService.cs` |
| `hiring.ts` | `getNextApplicationStatus()` | `TalentApplication.cs` or service |
| `founder.ts` | `getFounderStatus()` | `AccountService.cs` or query handler |
| `founder.ts` | `canBecomeFounder()` | `AccountService.cs` |
| `founder.ts` | `isFounder()` | `Account.cs` entity property |

### NgRx Store Future

After migration, the NgRx store transitions from being the primary data store to being a client-side cache layer:

- Store reads trigger API calls (via effects)
- Store mutations trigger API writes (via effects)
- Components read from selectors as before (no component changes)
- Selectors that derive computed values (e.g., `selectPendingTalentCount`) remain unchanged

This is a standard "cache-first, API-backed" pattern that NgRx handles well. The existing selector structure needs no changes.

---

### Critical Files for Implementation

- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account.ts` -- Domain types that become `ClinicX.Domain` entities; the source of truth for database schema and API contracts
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/hiring.ts` -- Domain types and business logic that translate to service layer logic
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/store/app.reducer.ts` -- Contains all current "backend" logic; each handler maps to a backend endpoint
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/core/account-data.source.ts` -- The abstract data source that is the migration seam
- `/Users/katemac/Documents/Codex/2026-07-14/can/clinicx-talent/src/app/app.config.ts` -- Central DI configuration where data source providers and interceptors are registered
