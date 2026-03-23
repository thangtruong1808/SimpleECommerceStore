# Entity Framework Migrations

This folder contains EF Core migration files. Migrations are generated and applied using the .NET CLI.

## Prerequisites

1. **Install the EF Core tools** (one-time):
   ```bash
   dotnet tool install --global dotnet-ef
   ```
   After installing, you may need to **restart your terminal** so `dotnet ef` is on your PATH.

2. **.NET 8 runtime required:** The `dotnet-ef` tool is built for .NET 8. If you only have .NET 10 SDK installed, install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or [ASP.NET Core 8.0 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) so the EF tools can run.

3. **Alternative (if PATH not updated):** Run via full path:
   ```bash
   "$HOME/.dotnet/tools/dotnet-ef.exe" migrations add InitialCreate
   ```

## Generate a new migration

```bash
dotnet ef migrations add MigrationName
```

## Apply migrations to database

```bash
dotnet ef database update
```

## Initial setup

After creating the database with `Scripts/CreateDatabase.sql`, run:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```
