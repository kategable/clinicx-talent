# ClinicX Talent — Backend

ASP.NET Core 9 Web API with PostgreSQL, Clean Architecture.

## Quick start (Docker)

```bash
# From the repo root:
docker compose up               # Everything: DB + API + Angular
docker compose up postgres api  # Backend only
```

The API is at `http://localhost:5001`. OpenAPI at `http://localhost:5001/openapi/v1.json`.

## Project structure

```
backend/
  ClinicX.sln
  src/
    ClinicX.Api/              # ASP.NET Core Web API (controllers, middleware)
    ClinicX.Application/      # Use cases, interfaces, DTOs
    ClinicX.Domain/           # Entities, enums, value objects (no deps)
    ClinicX.Infrastructure/   # EF Core, external services, persistence
```

## Local development (without Docker)

```bash
# Prerequisites: .NET 9 SDK, PostgreSQL 16+
dotnet tool install --global dotnet-ef   # EF Core CLI
dotnet restore backend/ClinicX.sln
dotnet ef database update --project backend/src/ClinicX.Infrastructure

# Run the API
dotnet run --project backend/src/ClinicX.Api
```

## Database

PostgreSQL 16 with EF Core. Migrations are additive — never drop columns or tables in a migration.

- The database is auto-migrated on API startup (`MigrateAsync` in Program.cs)
- Seed data runs when the Accounts table is empty
- Soft deletes use `DeletedAtUtc` columns with global query filters
