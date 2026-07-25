# ClinicX Talent -- Backend Implementation Plan

## 1. Overview and Key Design Decisions

The current application is entirely client-side: domain logic lives in NgRx reducers, data persists in localStorage, authentication is simulated via hardcoded test credentials, and SMS verification is a no-op that accepts a fixed set of phone/code pairs. The data source abstractions (`AccountDataSource`, `HiringDataSource`) already exist and are injected via Angular DI -- the frontend migration path is clean: swap local implementations for HTTP implementations that call the new ASP.NET Core API.

**Core architectural principles:**
- Clean Architecture (Presentation / Application / Domain / Infrastructure layers)
- ASP.NET Core 9 with minimal API controllers
- Entity Framework Core with SQL Server (Azure SQL Database)
- JWT bearer tokens for authentication
- Twilio Verify API for phone verification
- Azure Key Vault for secrets
- Azure App Service for hosting
- Azure Storage Blobs for media uploads

---

## 2. Backend Project Structure

```
ClinicX/
  ClinicX.sln
  src/
    ClinicX.Api/                     # ASP.NET Core Web API
      Controllers/
        AuthController.cs            # Phone verification, JWT, admin login
        AccountsController.cs        # Account CRUD, profile management
        HiringController.cs          # Opportunities, invites, applications
        PassportsController.cs       # Talent passport shares
        AdminController.cs           # Admin operations
        PublicController.cs          # Anonymous public endpoints
      Middleware/
        ExceptionMiddleware.cs       # Global error handling
        RequestLoggingMiddleware.cs
      Program.cs
      appsettings.json

    ClinicX.Application/             # Use-case layer
      Common/
        Interfaces/
          ICurrentUserService.cs
          IJwtService.cs
          ISmsService.cs
          IFileStorageService.cs
      Auth/
        Commands/                    # SendVerificationCodeCommand, VerifyCodeCommand, etc.
        Dtos/                        # AuthResultDto, TokenResponseDto
        Services/                    # JwtService.cs, SmsService.cs, AdminService.cs
      Accounts/
        Commands/                    # CreateAccountCommand, UpdateProfileCommand, etc.
        Queries/                     # GetAccountQuery, ListAccountsQuery
        Dtos/                        # AccountDto, ClinicDetailsDto, TalentDetailsDto
      Hiring/
        Commands/                    # CreateOpportunityCommand, etc.
        Queries/                     # GetOpportunitiesQuery, GetInviteByTokenQuery
        Dtos/                        # OpportunityDto, InviteDto, ApplicationDto
      Founder/
        Queries/                     # GetFounderStatusQuery
        Dtos/                        # FounderStatusDto
      Admin/
        Commands/                    # SetReviewStatusCommand, ResetVerificationCommand
        Queries/                     # GetVerificationSecurityQuery

    ClinicX.Domain/                   # Core entities (no dependencies)
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
        AccountType.cs               # clinic, talent
        ReviewStatus.cs              # UnderReview, Approved, OnHold
        OpportunityStatus.cs         # Active, Paused, Closed
        ApplicationSource.cs         # ClinicHiringLink, TalentPassport, ClinicxMatch
        ApplicationStatus.cs         # Invited, Interested, ... Closed
        ThemePreference.cs           # Auto, Light, Dark
      ValueObjects/
        PhoneNumber.cs               # Normalized phone + display formatting
      Exceptions/
        DomainException.cs
        NotFoundException.cs
        UnauthorizedException.cs

    ClinicX.Infrastructure/           # EF Core, external services
      Persistence/
        ClinicXDbContext.cs
        Migrations/
        Configurations/              # Entity type configurations
        Repositories/
      Services/
        SmsService.cs                # Twilio implementation
        JwtService.cs                # JWT generation/validation
        FileStorageService.cs        # Azure Blob implementation
        CurrentUserService.cs        # Extracts user from HttpContext

  tests/
    ClinicX.UnitTests/
    ClinicX.IntegrationTests/
    ClinicX.Api.Tests/
```

---

## 3. Database Schema (EF Core)

### 3.1 Accounts

```sql
CREATE TABLE Accounts (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Type            NVARCHAR(20)    NOT NULL,       -- 'clinic' | 'talent'
    Phone           NVARCHAR(20)    NOT NULL,       -- normalized (digits only)
    DisplayPhone    NVARCHAR(20)    NOT NULL DEFAULT '',
    Email           NVARCHAR(320)   NOT NULL DEFAULT '',
    ShareEmail      BIT             NOT NULL DEFAULT 0,
    SharePhone      BIT             NOT NULL DEFAULT 0,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'under-review',
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    ProfileComplete BIT             NOT NULL DEFAULT 0,
    DisplayName     NVARCHAR(200)   NOT NULL DEFAULT '',
    ThemePreference NVARCHAR(10)    NOT NULL DEFAULT 'auto',
    Founder         BIT             NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IX_Accounts_Phone ON Accounts(Phone);
```

### 3.2 Account Details (1:1 with Accounts)

```sql
CREATE TABLE ClinicDetails (
    AccountId       UNIQUEIDENTIFIER PRIMARY KEY REFERENCES Accounts(Id),
    ClinicName      NVARCHAR(200)   NOT NULL,
    Location        NVARCHAR(500)   NOT NULL DEFAULT '',
    City            NVARCHAR(200)   NOT NULL DEFAULT '',
    State           NVARCHAR(100)   NOT NULL DEFAULT '',
    Website         NVARCHAR(500)   NOT NULL DEFAULT '',
    Specialties     NVARCHAR(1000)  NOT NULL DEFAULT '',
    About           NVARCHAR(2000)  NOT NULL DEFAULT '',
    Position        NVARCHAR(200)   NOT NULL DEFAULT '',
    MustHaveSkills  NVARCHAR(1000)  NOT NULL DEFAULT '',
    PayRange        NVARCHAR(200)   NOT NULL DEFAULT '',
    Benefits        NVARCHAR(1000)  NOT NULL DEFAULT '',
    Urgency         NVARCHAR(200)   NOT NULL DEFAULT '',
    IdealHire       NVARCHAR(2000)  NOT NULL DEFAULT ''
);

CREATE TABLE TalentDetails (
    AccountId           UNIQUEIDENTIFIER PRIMARY KEY REFERENCES Accounts(Id),
    ProfessionalName    NVARCHAR(200)   NOT NULL DEFAULT '',
    PhotoName           NVARCHAR(500)   NOT NULL DEFAULT '',
    VideoName           NVARCHAR(500)   NOT NULL DEFAULT '',
    Role                NVARCHAR(200)   NOT NULL DEFAULT '',
    Location            NVARCHAR(500)   NOT NULL DEFAULT '',
    YearsExperience     NVARCHAR(50)    NOT NULL DEFAULT '',
    ExperienceTimeline  NVARCHAR(2000)  NOT NULL DEFAULT '',
    Skills              NVARCHAR(1000)  NOT NULL DEFAULT '',
    CertificateNames    NVARCHAR(MAX)   NOT NULL DEFAULT '[]',  -- JSON array
    Availability        NVARCHAR(200)   NOT NULL DEFAULT '',
    SalaryExpectation   NVARCHAR(200)   NOT NULL DEFAULT '',
    Languages           NVARCHAR(500)   NOT NULL DEFAULT '',
    PortfolioUrl        NVARCHAR(500)   NOT NULL DEFAULT '',
    GalleryNames        NVARCHAR(MAX)   NOT NULL DEFAULT '[]',  -- JSON array
    Introduction        NVARCHAR(2000)  NOT NULL DEFAULT ''
);
```

### 3.3 Hiring Opportunities

```sql
CREATE TABLE HiringOpportunities (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ClinicAccountId UNIQUEIDENTIFIER NOT NULL REFERENCES Accounts(Id),
    Slug            NVARCHAR(200)   NOT NULL,
    PositionSlug    NVARCHAR(200)   NOT NULL,
    Title           NVARCHAR(200)   NOT NULL,
    Location        NVARCHAR(500)   NOT NULL DEFAULT '',
    PayRange        NVARCHAR(200)   NOT NULL DEFAULT '',
    MustHaveSkills  NVARCHAR(1000)  NOT NULL DEFAULT '',
    Benefits        NVARCHAR(1000)  NOT NULL DEFAULT '',
    Urgency         NVARCHAR(200)   NOT NULL DEFAULT '',
    IdealHire       NVARCHAR(2000)  NOT NULL DEFAULT '',
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'active',
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_HiringOpportunities_ClinicAccountId ON HiringOpportunities(ClinicAccountId);
CREATE INDEX IX_HiringOpportunities_Slug ON HiringOpportunities(Slug, PositionSlug);
```

### 3.4 Hiring Invites

```sql
CREATE TABLE HiringInvites (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    OpportunityId   UNIQUEIDENTIFIER NOT NULL REFERENCES HiringOpportunities(Id),
    Token           NVARCHAR(100)   NOT NULL,
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAtUtc    DATETIME2       NOT NULL,
    Active          BIT             NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IX_HiringInvites_Token ON HiringInvites(Token);
CREATE INDEX IX_HiringInvites_OpportunityId ON HiringInvites(OpportunityId);
```

### 3.5 Talent Passport Shares

```sql
CREATE TABLE TalentPassportShares (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    TalentAccountId UNIQUEIDENTIFIER NOT NULL REFERENCES Accounts(Id),
    Token           NVARCHAR(100)   NOT NULL,
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    Active          BIT             NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IX_TalentPassportShares_Token ON TalentPassportShares(Token);
CREATE INDEX IX_TalentPassportShares_TalentAccountId ON TalentPassportShares(TalentAccountId);
```

### 3.6 Talent Applications

```sql
CREATE TABLE TalentApplications (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    OpportunityId   UNIQUEIDENTIFIER NULL REFERENCES HiringOpportunities(Id),
    TalentAccountId UNIQUEIDENTIFIER NOT NULL REFERENCES Accounts(Id),
    ClinicAccountId UNIQUEIDENTIFIER NOT NULL REFERENCES Accounts(Id),
    Source          NVARCHAR(30)    NOT NULL,
    Status          NVARCHAR(30)    NOT NULL DEFAULT 'invited',
    AcceptedAtUtc   DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    SubmittedAtUtc  DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_TalentApplications_TalentAccountId ON TalentApplications(TalentAccountId);
CREATE INDEX IX_TalentApplications_ClinicAccountId ON TalentApplications(ClinicAccountId);
-- Prevent duplicate applications
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
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Phone           NVARCHAR(20)    NOT NULL,
    CodeHash        NVARCHAR(200)   NOT NULL,       -- bcrypt hash of code
    ExpiresAtUtc    DATETIME2       NOT NULL,
    VerifiedAtUtc   DATETIME2       NULL,
    AttemptCount    INT             NOT NULL DEFAULT 0,
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_PhoneVerifications_Phone ON PhoneVerifications(Phone);
```

### 3.8 Verification Security (rate limiting)

```sql
CREATE TABLE VerificationSecurityRecords (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Phone           NVARCHAR(20)    NOT NULL,
    AttemptCount    INT             NOT NULL DEFAULT 0,
    LockedUntilUtc  DATETIME2       NULL,
    FirstAttemptUtc DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    LastAttemptUtc  DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    Flagged         BIT             NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IX_VerificationSecurityRecords_Phone ON VerificationSecurityRecords(Phone);
```

### 3.9 Admin Users

```sql
CREATE TABLE AdminUsers (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Username        NVARCHAR(100)   NOT NULL,
    PasswordHash    NVARCHAR(500)   NOT NULL,
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE UNIQUE INDEX IX_AdminUsers_Username ON AdminUsers(Username);
```

### 3.10 Refresh Tokens

```sql
CREATE TABLE RefreshTokens (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    AccountId       UNIQUEIDENTIFIER NOT NULL REFERENCES Accounts(Id),
    Token           NVARCHAR(500)   NOT NULL,
    ExpiresAtUtc    DATETIME2       NOT NULL,
    CreatedAtUtc    DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    RevokedAtUtc    DATETIME2       NULL
);

CREATE INDEX IX_RefreshTokens_AccountId ON RefreshTokens(AccountId);
CREATE UNIQUE INDEX IX_RefreshTokens_Token ON RefreshTokens(Token);
```

---

## 4. API Design

### 4.1 Base URL

```
https://api.clinicx-talent.com/api/v1/
```

### 4.2 Authentication Endpoints

```
POST /api/v1/auth/send-code
  Request:  { phone: string }
  Response: { success: boolean, message: string }
  Notes:    Normalizes phone, calls Twilio Verify. Returns 429 if rate-limited.

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
   e. Sends code via Twilio Verify API
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

### 5.2 JWT Claims

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
- Signing key in Azure Key Vault

### 5.3 Authorization Policies

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

### 5.4 Rate Limiting

- 3 failed verification attempts per phone -> 15-minute lockout
- 5 distinct phones in 60 minutes -> admin flag
- General API: 100 requests/minute per IP
- SMS: 1 per 30 seconds per phone number

---

## 6. Azure Services

| Resource | SKU / Tier | Purpose |
|----------|-----------|---------|
| App Service | B1 (Linux) | Host ASP.NET Core API |
| SQL Database | Serverless (GP_S_Gen5_1) | Primary data store |
| Key Vault | Standard | JWT signing key, Twilio creds, connection strings |
| Storage Account | Standard LRS (Blob) | Certificates, photos, videos |
| App Insights | Per-GB | Logging, exceptions, perf monitoring |
| Front Door | Standard (optional MVP) | CDN, SSL, WAF |

### Deployment Pipeline

```
GitHub main branch
  -> GitHub Actions: dotnet restore, build, test, publish
  -> Deploy to Azure App Service
  -> Run EF Core migrations
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
  apiUrl: 'https://api.clinicx-talent.com/api/v1',
  useBackend: false,  // flip to true when API is ready
};
```

### 7.3 Seed Data Strategy

Existing `SEEDED_ACCOUNTS`, `SEEDED_OPPORTUNITIES`, etc. become EF Core migration seed data. On the frontend, the hydration meta-reducer no longer carries seeds -- the API is the single source of truth.

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

---

## 9. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- Scaffold solution with 4 projects (Api, Application, Domain, Infrastructure)
- Define domain entities and enums matching frontend types
- Configure EF Core with SQL Server
- Create initial migration with seed data
- Implement ExceptionMiddleware
- Verify /health endpoint works

### Phase 2: Auth System (Week 2)
- Phone verification with Twilio
- JWT issuance with 15-min access + 7-day refresh tokens
- Rate limiting (3 attempts locks phone, 5 phones flags system)
- Admin login against AdminUsers table
- Swagger documentation for auth endpoints

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
- Replace TEST_CREDENTIALS and hardcoded admin
- Update registration/sign-in flows

### Phase 7: Frontend Full Integration (Week 5-6)
- Remove localStorage persistence effects
- Remove hydrationMetaReducer
- Remove local data source implementations
- Add loading states for API calls
- Convert date formatting (ISO 8601 -> display)
- End-to-end testing of all flows

### Phase 8: Media Storage (Week 6)
- Azure Blob storage for file uploads
- Upload endpoints in AccountsController
- File type/size validation

### Phase 9: Deployment (Week 6-7)
- Azure resources via Bicep/ARM
- GitHub Actions CI/CD
- Application Insights
- Performance and security testing
- Production cutover

---

## 10. Potential Challenges

| Challenge | Mitigation |
|-----------|-----------|
| Data loss during migration | Keep localStorage fallback; seed database with exact copy of seed data |
| Twilio SMS costs | Free tier: 10,000 verifications/month; email fallback for MVP |
| JWT expiration UX | Auto-refresh via interceptor; toast on session expiry |
| Date format mismatch | API returns ISO 8601 UTC; frontend formats via DatePipe |
| Concurrent founder assignment | Serializable transaction; only first 1000 accounts get it |
| File upload limits | ASP.NET Core request size limits; chunked upload for video |

---

## 11. Files That Change

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

### Files to Create (Backend):
- Entire solution structure in `ClinicX/` directory (see Section 2)

---

## 12. Key Architectural Notes

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
