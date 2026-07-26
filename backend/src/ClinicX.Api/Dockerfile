# -- Build stage ------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files and restore
COPY backend/src/ClinicX.Domain/ClinicX.Domain.csproj   ClinicX.Domain/
COPY backend/src/ClinicX.Application/ClinicX.Application.csproj ClinicX.Application/
COPY backend/src/ClinicX.Infrastructure/ClinicX.Infrastructure.csproj ClinicX.Infrastructure/
COPY backend/src/ClinicX.Api/ClinicX.Api.csproj         ClinicX.Api/
RUN dotnet restore ClinicX.Api/ClinicX.Api.csproj

# Copy source files (overwrites csproj, adds .cs files)
COPY backend/src/ ./
RUN dotnet publish ClinicX.Api/ClinicX.Api.csproj -c Release -o /app

# -- Runtime stage ----------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ClinicX.Api.dll"]
