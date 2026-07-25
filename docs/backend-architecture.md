# ClinicX Talent -- Backend Implementation Plan

## 1. Overview and Key Design Decisions

The current application is entirely client-side: domain logic lives in NgRx reducers, data persists in localStorage, authentication is simulated via hardcoded test credentials, and SMS verification is a no-op that accepts a fixed set of phone/code pairs. The data source abstractions (`AccountDataSource`, `HiringDataSource`) already exist and are injected via Angular DI -- the frontend migration path is clean: swap local implementations for HTTP implementations that call the new ASP.NET Core API.

**Core architectural principles:**
- Clean Architecture (Presentation / Application / Domain / Infrastructure layers)
- ASP.NET Core 9 with minimal API controllers
- Entity Framework Core with PostgreSQL (via Npgsql)
- **Google OAuth as primary auth** (industry standard, free, higher conversion)
- **Azure Communication Services SMS as secondary** (phone verification for registration, fallback login)
- Azure (production) / Docker Compose (development)

**Why Google OAuth first, phone OTP second:**
1. **Cost**: Google OAuth is completely free. Phone OTP at scale is expensive -- Twilio Verify charges ~$0.058 per SMS in the US ($0.05 platform fee + $0.0083 SMS). For 1,000 users verifying 2x/month, that is ~$116/month. For 10,000 users, ~$1,160/month. Azure Communication Services SMS is much cheaper (~$0.01 per segment, no platform fee), but still not free at scale.
2. **Conversion**: Social login achieves 78-85% completion rates vs SMS OTP's 78-80%, with an 18-26% signup completion lift over SMS-only flows. Users onboard faster when they can use Google.
3. **Security**: NIST SP 800-63B explicitly deprecates SMS as a primary authenticator due to SIM swap attacks ($48M in losses tracked by FBI IC3 in 2023). Google OAuth with PKCE is inherently more secure.
4. **Industry standard for 2026**: Best practice is a layered approach -- platform passkeys/social login as primary, email magic link as secondary, phone OTP as last resort only.

**Phone is still essential for the business model:** Clinics need to contact talent. Phone verification during registration is required, but it is a one-time cost per user, not a per-login cost. This keeps SMS costs low.

**Database choice: PostgreSQL over SQL Server:**
- Native JSONB columns for `CertificateNames` and `GalleryNames` arrays, avoiding string serialization and enabling real JSON queries at the database level if needed later
- Better free/developer-tier options (Neon, Supabase, Railway) during early development
- Azure Database for PostgreSQL Flexible Server is a fully managed Azure service for production
- EF Core support via Npgsql is first-class with code-first approach, migrations, LINQ

**Development approach: local-first, free until production:**
- Development uses Docker Compose to run PostgreSQL locally + the API + the Angular app
- SMS verification uses a local mock (logs code to console / writes to file) during dev, Azure Communication Services in production
- Google OAuth works locally with a test OAuth client ID
- No Azure deployment until Phase 9 when the system is proven and ready
- Free managed Postgres (Neon, Supabase) can substitute for the Docker Postgres if a shared dev DB is needed
- Azure Free Trial covers production deployment costs for the first 12 months

**Deployment approach: green/blue swap:**
- Two App Service slots (green and blue) -- one active, one staging
- Deploy to the inactive slot, run smoke tests, then swap
- Database migrations are additive-only (no destructive changes) to support backward compatibility during swap
- Rollback = swap back to the previous slot

**Environments:**
| Environment | Postgres Host | API Host | Auth Mode | Purpose |
|------------|--------------|----------|-----------|---------|
| Local dev | Docker Compose (localhost:5432) | localhost:5000 | Google OAuth (test client) + SMS mock | Daily development |
| Dev | Neon/Supabase free tier | Optional cloud host | Same as local | Shared integration testing |
| UAT (blue) | Azure PostgreSQL Flexible Server | Azure App Service slot | Google OAuth (prod client) + ACS SMS | Pre-production validation |
| Production (green) | Azure PostgreSQL Flexible Server | Azure App Service slot | Google OAuth (prod client) + ACS SMS | Live traffic |

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
      appsettings.Development.json  # Local PostgreSQL, SMS mock, Google test client
      appsettings.Uat.json         # UAT PostgreSQL, Azure SMS, Google prod client
      appsettings.Production.json  # Production PostgreSQL, Azure SMS, Google prod client

    ClinicX.Application/
      Common/
        Interfaces/
          ICurrentUserService.cs
          IJwtService.cs
          ISmsService.cs
          IGoogleAuthService.cs     # Wraps Google token validation
          IFileStorageService.cs
      Auth/
        Commands/
          SendVerificationCodeCommand.cs
          VerifyCodeCommand.cs
          GoogleLoginCommand.cs      # Handles Google ID token exchange
          LinkPhoneCommand.cs        # Links phone to existing Google account
          AdminLoginCommand.cs
        Dtos/
          AuthResultDto.cs
          TokenResponseDto.cs
          GoogleLoginRequestDto.cs
        Services/
          JwtService.cs
          SmsService.cs              # Azure Communication Services impl
          SmsServiceMock.cs          # Local dev mock (logs to console)
          GoogleAuthService.cs       # Validates Google ID tokens
          AdminService.cs
      Accounts/
        Commands/
          CreateAccountCommand.cs
          UpdateProfileCommand.cs
          UpdateContactCommand.cs
          UpdateThemeCommand.cs
        Queries/
          GetAccountQuery.cs
          GetMyAccountQuery.cs
          ListAccountsQuery.cs
        Dtos/
          AccountDto.cs
          ClinicDetailsDto.cs
          TalentDetailsDto.cs
      Hiring/
        Commands/
          CreateOpportunityCommand.cs
          UpdateOpportunityCommand.cs
          CreateInviteCommand.cs
          CreatePassportShareCommand.cs
          CreateApplicationCommand.cs
          UpdateApplicationStatusCommand.cs
          AddTalentToClinicCommand.cs
        Queries/
          GetOpportunitiesQuery.cs
          GetInviteByTokenQuery.cs
          GetPassportByTokenQuery.cs
          GetApplicationsQuery.cs
        Dtos/
          OpportunityDto.cs
          InviteDto.cs
          PassportShareDto.cs
          ApplicationDto.cs
      Founder/
        Queries/
          GetFounderStatusQuery.cs
        Dtos/
          FounderStatusDto.cs
      Admin/
        Commands/
          SetReviewStatusCommand.cs
          ResetVerificationCommand.cs
        Queries/
          GetVerificationSecurityQuery.cs

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
        ExternalLogin.cs              # NEW: links Google sub to Account
      Enums/
        AccountType.cs
        ReviewStatus.cs
        OpportunityStatus.cs
        ApplicationSource.cs
        ApplicationStatus.cs
        ThemePreference.cs
        ExternalLoginProvider.cs      # NEW: "Google", "Apple", etc.
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
        SmsService.cs               # Azure Communication Services implementation
        SmsServiceMock.cs           # Local dev mock (logs to console)
        JwtService.cs
        GoogleAuthService.cs        # Validates Google ID tokens
        FileStorageService.cs
        CurrentUserService.cs

  tests/
    ClinicX.UnitTests/
    ClinicX.IntegrationTests/
    ClinicX.Api.Tests/
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
    Phone           VARCHAR(20)     NOT NULL DEFAULT '',  -- empty until phone verified
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

### 3.2 External Logins (NEW -- links OAuth providers to accounts)

```sql
CREATE TABLE ExternalLogins (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    AccountId       UUID            NOT NULL REFERENCES Accounts(Id),
    Provider        VARCHAR(50)     NOT NULL,       -- 'Google'
    ProviderSubject VARCHAR(500)    NOT NULL,       -- Google's unique user ID (sub claim)
    Email           VARCHAR(320)    NOT NULL DEFAULT '',
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IX_ExternalLogins_Provider_Subject 
    ON ExternalLogins(Provider, ProviderSubject);
CREATE INDEX IX_ExternalLogins_AccountId ON ExternalLogins(AccountId);
```

This enables multiple OAuth providers per account (e.g., Google + Apple) and prevents the same Google account from being linked to multiple ClinicX accounts.

### 3.3 Account Details (1:1 with Accounts)

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

### 3.4 Hiring Opportunities

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

### 3.5 Hiring Invites

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

### 3.6 Talent Passport Shares

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

### 3.7 Talent Applications

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

### 3.8 Phone Verification

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

### 3.9 Verification Security (rate limiting)

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

### 3.10 Admin Users

```sql
CREATE TABLE AdminUsers (
    Id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    Username        VARCHAR(100)    NOT NULL,
    PasswordHash    VARCHAR(500)    NOT NULL,
    CreatedAtUtc    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IX_AdminUsers_Username ON AdminUsers(Username);
```

### 3.11 Refresh Tokens

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

### 3.12 Bulletproof Database -- Movable Data

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
       "Profile": "Development"
     }
   }
   ```

3. **Database snapshots for testing.** A CLI tool (or shell script in `scripts/`) can dump and restore a full database snapshot using `pg_dump` / `pg_restore`:
   ```bash
   ./scripts/db-snapshot.sh save pre-migration-test
   dotnet ef database update
   # test...
   ./scripts/db-snapshot.sh restore pre-migration-test
   ```

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

---

## 4. Authentication Architecture -- Google OAuth + Phone Fallback

### 4.1 Recommended Auth Flow (Primary: Google OAuth)

This is the key change from the original plan. Instead of relying on phone OTP for every login, Google OAuth handles 90%+ of authentications. Phone verification is used only for:
- **One-time phone ownership verification** during registration (required to verify the phone number that clinics/talent use to contact each other)
- **Fallback login** if Google OAuth is unavailable
- **Account recovery**

```
FLOW 1: New user registration via Google

1. User clicks "Sign in with Google"
2. Frontend redirects to Google OAuth (or uses Google One Tap)
3. Google returns ID token to frontend
4. Frontend POSTs ID token to POST /api/v1/auth/google
5. Backend:
   a. Validates Google ID token (checks iss, aud, exp, signature)
   b. Checks if ExternalLogins already exists for this Google sub
   c. If new: creates Account with email from Google profile, sets status=under-review
   d. If existing: signs in (returns JWT)
   e. Returns { token, refreshToken, account, phoneRequired: true/false }
6. If phoneRequired=true, frontend shows phone verification step:
   a. User enters phone number
   b. POST /api/v1/auth/send-code (sends SMS via Azure Communication Services)
   c. User enters code
   d. POST /api/v1/auth/verify-code (links phone to account)
   e. Account now has phone verified, can proceed to profile setup
7. If phoneRequired=false (existing user already verified phone), proceed to dashboard

FLOW 2: Returning user via Google

1. User clicks "Sign in with Google"
2. Google returns ID token
3. POST /api/v1/auth/google -> backend finds existing ExternalLogin + Account
4. Returns JWT immediately, no phone step needed
5. User goes straight to dashboard

FLOW 3: Phone-only login (fallback for users without Google)

1. User enters phone number
2. POST /api/v1/auth/send-code (sends SMS)
3. User enters code
4. POST /api/v1/auth/verify-code
5. Backend looks up account by phone
6. If found: returns JWT (sign in)
7. If not found: returns isNewAccount=true, frontend prompts for account type + profile

FLOW 4: Phone verification after Google registration (one-time)

1. User already authenticated via Google, but phone not yet verified
2. User enters phone number
3. POST /api/v1/auth/send-code
4. POST /api/v1/auth/verify-code (links phone to existing account)
5. Account now has phone on file for clinic/talent communication
```

### 4.2 Auth Endpoints

```
POST /api/v1/auth/google
  Request:  { idToken: string }
  Response: { token: string, refreshToken: string, account: AccountDto,
              isNewAccount: boolean, phoneRequired: boolean }
  Notes:    Validates Google ID token. Creates account if new (using email/name from Google).
            Returns phoneRequired=true if the account needs phone verification.
            This is the PRIMARY auth endpoint.

POST /api/v1/auth/send-code
  Request:  { phone: string }
  Response: { success: boolean, message: string }
  Notes:    Normalizes phone, sends SMS via Azure Communication Services (or mock in dev).
            Returns 429 if rate-limited. Used for phone verification + fallback login.

POST /api/v1/auth/verify-code
  Request:  { phone: string, code: string }
  Response: { token: string, refreshToken: string, account: AccountDto | null,
              isNewAccount: boolean }
  Notes:    Verifies phone code. If account exists, signs in. If not, returns isNewAccount.
            If user is already authenticated (has JWT from Google), links phone to account.

POST /api/v1/auth/refresh
  Request:  { refreshToken: string }
  Response: { token: string, refreshToken: string }

POST /api/v1/auth/admin/login
  Request:  { username: string, password: string }
  Response: { token: string, adminUser: AdminUserDto }

POST /api/v1/auth/admin/logout
```

### 4.3 SMS Cost Analysis

| Provider | Cost per SMS (US) | Platform Fee | Total per Verification | Monthly Cost (1K users, 2x) | Monthly Cost (10K users, 2x) |
|----------|------------------|-------------|----------------------|---------------------------|----------------------------|
| Twilio Verify | $0.0083 | $0.05 | ~$0.0583 | ~$116.60 | ~$1,166 |
| **Azure Communication Services** | **$0.0075 + $0.0025 surcharge** | **None** | **~$0.01** | **~$20.00** | **~$200** |
| Twilio SMS (no Verify) | $0.0079 | None | ~$0.0079 | ~$15.80 | ~$158 |

**With Google OAuth as primary:** SMS is only used for:
- One-time phone verification during registration (1 SMS per new user)
- Fallback login for users without Google (maybe 5-10% of users, 2 SMS/month each)

**Estimated SMS costs with Google OAuth + Azure Communication Services:**
- 10,000 users registering: one-time cost of ~$100 (10,000 x $0.01)
- 500 users using phone fallback (5%): ~$10/month (500 x 2 x $0.01)
- **Total: ~$110 first month, ~$10/month ongoing**

Compare to phone-only with Twilio Verify: ~$1,166/month for 10K users x 2 logins.

### 4.4 Google OAuth Integration in ASP.NET Core (for reference)

```csharp
// NuGet: Microsoft.AspNetCore.Authentication.Google

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options => { /* existing JWT config */ })
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Google:ClientId"];
        options.ClientSecret = builder.Configuration["Google:ClientSecret"];
    });

// Backend validates Google ID tokens issued by the frontend's Google sign-in
// using Google.Apis.Auth:
public class GoogleAuthService : IGoogleAuthService
{
    public async Task<GoogleJsonWebSignature.Payload> ValidateIdTokenAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _config["Google:ClientId"] }
        };
        return await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
    }
}
```

### 4.5 SMS Implementation: Azure Communication Services (not Twilio)

```csharp
public class SmsService : ISmsService
{
    private readonly SmsClient _client;
    
    public SmsService(string connectionString)
    {
        _client = new SmsClient(connectionString);
    }
    
    public async Task SendVerificationCodeAsync(string phone, string code)
    {
        await _client.SendAsync(
            from: "+15551234567",  // Azure ACS toll-free number
            to: phone,
            message: $"Your ClinicX verification code is: {code}",
            options: new SmsSendOptions { EnableDeliveryReport = false }
        );
    }
}
```

---

## 5. Backend API Design

### 5.1 Base URL

```
Dev:   http://localhost:5000/api/v1/
Prod:  https://api.clinicx-talent.com/api/v1/
UAT:   https://uat-api.clinicx-talent.com/api/v1/
```

### 5.2 Account Endpoints

```
GET    /api/v1/accounts/me               -> AccountDto
PUT    /api/v1/accounts/me               -> AccountDto (displayName, email, etc.)
PUT    /api/v1/accounts/me/profile       -> AccountDto (ClinicDetails / TalentDetails)
PUT    /api/v1/accounts/me/theme         -> AccountDto (themePreference)
POST   /api/v1/accounts/me/phone         -> sends SMS code to link phone
PUT    /api/v1/accounts/me/phone         -> verifies code, links phone to account
GET    /api/v1/accounts?type=&page=      -> paginated list (admin)
GET    /api/v1/accounts/{id}             -> AccountDto (admin or own)
PUT    /api/v1/accounts/{id}/status      -> AccountDto (admin only)
```

### 5.3 Hiring Endpoints

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

### 5.4 Public Endpoints (no auth)

```
GET    /api/v1/public/hiring/{clinicSlug}/{positionSlug}?invite={token}
GET    /api/v1/public/talent/{talentSlug}
GET    /api/v1/public/clinic/{clinicSlug}
GET    /api/v1/public/invite/{token}
```

### 5.5 Admin Endpoints

```
GET    /api/v1/admin/accounts/verification-security
POST   /api/v1/admin/accounts/verification-security/reset
GET    /api/v1/admin/stats
```

### 5.6 Response Envelope

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

Error codes: `PHONE_LOCKED`, `INVALID_CODE`, `RATE_LIMITED`, `DUPLICATE_APPLICATION`, `INVALID_STATUS_TRANSITION`, `INVITE_EXPIRED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `GOOGLE_TOKEN_INVALID`.

---

## 6. Auth and Security

### 6.1 JWT Claims

```json
{
  "sub": "account-guid",
  "type": "clinic",
  "status": "approved",
  "role": "user",
  "phone": "3125550101",
  "phoneVerified": true,
  "iat": 1721836800,
  "exp": 1721923200,
  "iss": "clinicx-talent-api",
  "aud": "clinicx-talent-app"
}
```

- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Admin tokens include `"role": "admin"`
- `phoneVerified` claim lets the frontend know if phone step is still needed
- Signing key in Azure Key Vault (production) / appsettings.Development.json (local dev)

### 6.2 Authorization Policies

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
    options.AddPolicy("PhoneVerified", policy =>
        policy.RequireClaim("phoneVerified", "True"));  // NEW
});
```

### 6.3 Rate Limiting

- 3 failed verification attempts per phone -> 15-minute lockout
- 5 distinct phones in 60 minutes -> admin flag
- General API: 100 requests/minute per IP
- SMS: 1 per 30 seconds per phone number

---

## 7. Azure Services (Production / UAT)

### 7.1 Resource Table

| Resource | SKU / Tier | Purpose |
|----------|-----------|---------|
| App Service | B1 (Linux) -- 2 slots (green + blue) | Host ASP.NET Core API |
| PostgreSQL Flexible Server | Burstable B1ms (1 vCore, 2 GB) | Primary data store |
| Key Vault | Standard | JWT signing key, Google client secret, ACS connection string |
| Storage Account | Standard LRS (Blob) | Certificates, photos, videos |
| Communication Services | Pay-as-you-go | SMS sending (~$0.01 per message, no monthly fee) |
| App Insights | Per-GB | Logging, exceptions, perf monitoring |

All resources fit within Azure Free Trial (12 months) except PostgreSQL which has its own 12-month free tier.

**SMS cost with Azure Communication Services:** $0.01 per SMS segment in the US. Since SMS is only used for one-time phone verification and fallback login (not every login), monthly costs are expected to be under $10-20 even at significant scale.

### 7.2 Green/Blue Deployment Architecture

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
       (single PostgreSQL instance)
```

**Deployment flow:**
1. Deploy new build to the inactive slot
2. Run smoke tests against the inactive slot
3. Run EF Core migrations (additive only)
4. Swap the slots: blue becomes production, green becomes staging
5. Monitor the new production slot
6. If rollback needed: swap back

### 7.3 Environment Configuration

```
appsettings.json                  # Shared defaults
appsettings.Development.json      # Local Docker PostgreSQL, SMS mock, Google test client
appsettings.Uat.json              # UAT Azure PostgreSQL, ACS SMS, Google prod client
appsettings.Production.json       # Production Azure PostgreSQL, ACS SMS, Google prod client + Key Vault refs
```

### 7.4 Deployment Pipeline

```
GitHub main branch
  -> GitHub Actions:
     1. dotnet restore, build, test
     2. dotnet publish
     3. Deploy to Azure App Service (inactive slot)
     4. Run smoke tests against inactive slot
     5. Run EF Core migrations (idempotent, additive)
     6. Swap slots (green <-> blue)
     7. Run post-deploy validation
```

---

## 8. Migration Strategy

### 8.1 Key Insight: Abstract Data Sources

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

### 8.2 Dual-Run Strategy

During phases 2-6, both systems coexist:

1. Frontend data sources check for API reachability
2. Fall back to localStorage if backend unreachable
3. Feature flag in environment config: `useBackend: false`

```typescript
// src/environments/environment.ts
export const environment = {
  apiUrl: 'http://localhost:5000/api/v1',
  googleClientId: 'xxx.apps.googleusercontent.com',  // Google OAuth client ID
  useBackend: false,
};
```

### 8.3 Seed Data Strategy

Existing `SEEDED_ACCOUNTS`, `SEEDED_OPPORTUNITIES`, etc. from the frontend become EF Core seed data, loaded only in development environment. On the frontend, the hydration meta-reducer no longer carries seeds -- the API is the single source of truth.

### 8.4 Local Development Setup

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
      Google__ClientId: "${GOOGLE_CLIENT_ID}"       # from .env file
      Google__ClientSecret: "${GOOGLE_CLIENT_SECRET}" # from .env file
    depends_on:
      - postgres

volumes:
  pgdata:
```

---

## 9. Frontend Changes

### 9.1 New Files

```
src/app/core/
  http-account.data.source.ts    # HTTP impl of AccountDataSource
  http-hiring.data.source.ts     # HTTP impl of HiringDataSource
  auth.service.ts                # Token management, Google OAuth, SMS fallback
  jwt.interceptor.ts             # Attach JWT to all outgoing requests
  error.interceptor.ts           # Handle 401/403/429 globally
  api-error.ts                   # Error types matching backend envelope

src/environments/
  environment.ts                 # apiUrl, googleClientId, useBackend flag
```

### 9.2 Auth Service (with Google OAuth)

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'clinicx.jwt';
  private readonly refreshKey = 'clinicx.refresh';

  // Google OAuth
  signInWithGoogle(): Promise<AuthResult> { ... }   // uses @angular/fire or Google Identity Services
  exchangeGoogleToken(idToken: string): Observable<AuthResult> { ... }  // POST /api/v1/auth/google

  // SMS fallback
  sendCode(phone: string): Observable<boolean> { ... }
  verifyCode(phone: string, code: string): Observable<AuthResult> { ... }

  // Token management
  getToken(): string | null { ... }
  setToken(token: string): void { ... }
  clearTokens(): void { ... }
  isAuthenticated(): boolean { ... }
  refreshToken(): Observable<TokenPair> { ... }

  // Admin
  adminLogin(username: string, password: string): Observable<AdminLoginResult> { ... }
  adminLogout(): void { ... }
}
```

### 9.3 Google Sign-In Integration (Frontend)

The frontend uses Google Identity Services (GIS) or the `@angular/fire` library:

```typescript
// registration.ts (or a dedicated auth component)
import { CredentialResponse } from 'google-one-tap';

protected async handleGoogleSignIn(): Promise<void> {
  // Use Google Identity Services One Tap or button
  const google = window.google?.accounts?.id;
  if (!google) {
    // Fallback to SMS if Google script not loaded
    this.useSmsFallback();
    return;
  }
  
  google.initialize({
    client_id: environment.googleClientId,
    callback: async (response: CredentialResponse) => {
      const result = await this.authService
        .exchangeGoogleToken(response.credential).toPromise();
      
      if (result.phoneRequired) {
        // Navigate to phone verification step
        this.router.navigate(['/register', 'phone']);
      } else {
        // Go to dashboard
        this.router.navigate(['/']);
      }
    },
  });
  
  google.prompt(); // Show One Tap UI
}
```

### 9.4 JWT Interceptor

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

### 9.5 Reducer Changes

- Remove `credentialMatches()` function
- Remove `TEST_CREDENTIALS` reference
- Remove hardcoded admin login (`admin`/`admin`)
- Remove local account creation from verifyRegistrationCode
- Remove in-memory verificationSecurity tracking
- Registration flow now dispatches Google token exchange action instead of SMS code request

### 9.6 Effects Changes

- Remove `persistState$` (no more localStorage persistence)
- Remove `persistGuestTheme$` (or modify to call API)
- Remove `persistReviewReminder$` (move to API)
- Modify data-loading effects to call API instead of local data sources
- Navigation effects remain unchanged

### 9.7 Guard Changes

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

### 9.8 Hydration Meta-Reducer

After migration, the hydration meta-reducer in `storage.ts` is removed. The NgRx store initializes empty and populates via API effects.

### 9.9 App Config (after migration)

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

### 9.10 Proxy Config for Local Dev

```json
// src/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- Scaffold solution with 5 projects (Api, Application, Domain, Infrastructure, Tests)
- Define domain entities and enums matching frontend types
- Add NuGet packages: `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.AspNetCore.Authentication.Google`, `Azure.Communication.Sms`, `Azure.Identity`, `Azure.Security.KeyVault.Secrets`, `Azure.Storage.Blobs`, `MediatR`, `FluentValidation`
- Configure EF Core with PostgreSQL (Npgsql), enable connection resilience
- Write `docker-compose.yml` for local PostgreSQL
- Create `SmsServiceMock` that logs codes to console/file
- Create `ExternalLogin` entity + table
- Create initial migration with development seed data
- Implement ExceptionMiddleware
- Verify /health endpoint works on localhost:5000
- Write integration test fixture using Testcontainers

### Phase 2: Auth System -- Google OAuth (Week 2)
- Implement Google ID token validation service
- Implement `/api/v1/auth/google` endpoint
- Implement `ExternalLogin` + `Account` creation/retrieval flow
- JWT issuance with `phoneVerified` claim
- Admin login against AdminUsers table
- Google OAuth test client for local development
- Swagger / OpenAPI documentation

### Phase 3: Auth System -- SMS Fallback (Week 2-3)
- Implement Azure Communication Services SMS integration
- Implement `/api/v1/auth/send-code` and `/api/v1/auth/verify-code`
- Phone linking flow (existing authenticated user adds phone)
- Rate limiting (3 attempts locks phone, 5 phones flags system)
- SMS mock visible in developer console
- **Total SMS costs estimated: $0 for development, ~$10-20/month in production**

### Phase 4: Accounts API (Week 3-4)
- Account CRUD endpoints
- Profile update (ClinicDetails, TalentDetails)
- Contact/theme preferences
- Founder 1000 Club logic
- FluentValidation for request models

### Phase 5: Hiring API (Week 4-5)
- Opportunity CRUD with slug generation
- Invite creation with 30-day expiry
- Passport share creation
- Application creation and status pipeline
- Public endpoints (no auth)
- Domain business rules (canCreateOpportunity, isInviteValid, getNextApplicationStatus)

### Phase 6: Admin API (Week 5)
- Verification security overview and reset
- Account review status management
- Dashboard stats

### Phase 7: Frontend Auth Integration (Week 5-6)
- AuthService with Google OAuth + SMS fallback
- Google Identity Services integration (One Tap + button)
- JwtInterceptor and ErrorInterceptor
- HttpAccountDataSource and HttpHiringDataSource
- Feature flag in environment config
- Angular proxy config for local development
- Remove TEST_CREDENTIALS and hardcoded admin from reducer
- Update registration/sign-in flows for Google-first UX
- Full end-to-end testing against local Docker backend

### Phase 8: Frontend Full Integration (Week 6-7)
- Remove localStorage persistence effects
- Remove hydrationMetaReducer
- Remove local data source implementations
- Add loading states for API calls
- Convert date formatting (ISO 8601 -> display)
- End-to-end testing

### Phase 9: Media Storage (Week 7)
- Azure Blob storage for file uploads (local filesystem mock in dev)
- Upload endpoints in AccountsController
- File type/size validation

### Phase 10: Production Deployment (Week 7-8)
- Set up Azure resources via Bicep/ARM:
  - App Service with green and blue deployment slots
  - PostgreSQL Flexible Server (free tier)
  - Azure Communication Services (pay-as-you-go)
  - Key Vault with secrets
  - Storage Account
  - Application Insights
- Google Cloud Console: create OAuth client for production
- Configure `appsettings.Uat.json` and `appsettings.Production.json`
- Set up GitHub Actions CI/CD with slot swap
- Deploy to UAT slot first, test Google OAuth flow, then deploy and swap to production
- Performance and security testing

---

## 11. Bulletproof Database -- Data Mobility

### 11.1 Migration Philosophy

Every migration is **additive only** -- this is what makes green/blue swaps safe:

```
Good:    ADD COLUMN ... NULL                  -- old code ignores it
Good:    CREATE INDEX ...                     -- read perf improvement
Good:    CREATE TABLE ...                     -- new entity

Bad:     DROP COLUMN ...                      -- old code crashes
Bad:     ALTER COLUMN ... NOT NULL            -- old inserts fail
Bad:     RENAME TABLE ...                     -- old code can't find it
```

Breaking changes are done in **two deployments**:
1. First deploy: add new column/table, write dual code (writes to both old and new, reads from new)
2. Second deploy: remove old column/table reference from code, then drop from schema

### 11.2 Scripts for Data Mobility

```bash
scripts/db-snapshot.sh save my-feature-test    # Save state
scripts/db-snapshot.sh restore my-feature-test  # Restore state
scripts/db-seed.sh demo --env=uat              # Load demo data into UAT
scripts/db-reset.sh                             # Reset dev database
scripts/db-copy.sh uat local                    # Copy UAT DB to local
```

### 11.3 Seed Data Profiles

| Profile | Contents | When |
|---------|----------|------|
| `Development` | Full demo set (6 accounts, 1 opp, 1 invite, 1 passport) | Local dev |
| `Test` | Admin user + 2 accounts (1 clinic, 1 talent) | Integration tests |
| `Production` | Admin user only | First prod migration |
| `Demo` | Full demo set (for UAT/demo environments) | UAT slot |

---

## 12. Potential Challenges

| Challenge | Mitigation |
|-----------|-----------|
| Data loss during migration | Keep localStorage fallback; seed DB with exact copy of seed data; migration rollback plan |
| Google OAuth dependency | SMS fallback for users without Google accounts; email OTP as tertiary option |
| Azure ACS SMS cost | ~$0.01 per SMS in US; only used for one-time phone verification and fallback login; estimated <$20/month even at 10K users |
| JWT expiration UX | Auto-refresh via interceptor; toast on session expiry |
| Date format mismatch | API returns ISO 8601 UTC; frontend formats via DatePipe |
| Concurrent founder assignment | Serializable transaction; only first 1000 accounts ever get it |
| File upload limits | ASP.NET Core request size limits; chunked upload for video |
| Green/blue DB compatibility | Additive-only migrations; dual-write during transition periods |
| PostgreSQL connection pooling | Npgsql built-in pooling (default 100); adjust for Flexible Server limits |
| Cross-origin for Google OAuth redirect | Configure correct redirect URIs in Google Cloud Console for each environment |

---

## 13. Files That Change

### Files to Modify (Frontend):
- `src/app/app.config.ts` -- swap data source providers, add interceptors
- `src/app/core/store/app.reducer.ts` -- remove credential matching, admin login, local account creation
- `src/app/core/store/app.effects.ts` -- remove localStorage persistence, add API calls
- Registration components -- add Google sign-in button, phone verification step

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
- `.env.example` -- template for local environment variables (Google client ID/secret)

### Files to Create (Operations):
- `scripts/db-snapshot.sh`
- `scripts/db-seed.sh`
- `scripts/db-reset.sh`
- `.github/workflows/deploy.yml` -- CI/CD with green/blue swap

---

## 14. Key Architectural Notes

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
