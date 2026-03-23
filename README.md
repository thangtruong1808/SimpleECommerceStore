# Simple E-Commerce Store

Full-stack e-commerce application with React frontend and ASP.NET Core backend.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 3.4
- **Backend:** ASP.NET Core 8 Web API, Entity Framework Core, MySQL
- **Database:** MySQL (Pomelo EF Core provider)

## Prerequisites

- Node.js 18+
- .NET 10 SDK (for backend) — This project targets .NET 10.
- MySQL 8.x

## Getting Started

### 1. Environment Variables

Copy the example env files and update with your values:

**Frontend** (`frontend/`):
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env - VITE_API_BASE_URL points to your API
```

**Backend** (`backend/`):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env - set ConnectionStrings__DefaultConnection and JWT__Secret
```

### 2. Database Setup

Create the database:
```bash
mysql -u root -p < backend/Scripts/CreateDatabase.sql
```

Apply migrations (from `backend/`):

First, install the EF Core tools (one-time): `dotnet tool install --global dotnet-ef`  
Then restart your terminal so `dotnet ef` is on your PATH (or add `%USERPROFILE%\.dotnet\tools` to PATH).

```bash
dotnet ef database update
```

Note: The initial migration is already created. For new migrations: `dotnet ef migrations add MigrationName`

### 3. Run the Application

**Start both frontend and backend:**
```bash
npm install          # one-time: install root deps (concurrently)
npm start
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

**Port conflict or "file is locked"?** `npm start` now kills any process on ports 5001, 5173–5175 before starting. If you still see errors, manually run `npx kill-port 5001 5173` then try again.

**Or run separately:**
```bash
# Backend only
cd backend && dotnet run

# Frontend only
cd frontend && npm run dev
```

## Authentication

The app includes User Authentication:
- **Register** – Create account (assigned Customer role)
- **Login** – Email/password; returns JWT + sets refresh token cookie
- **Forgot/Reset password** – Request reset link; reset with token
- **Roles** – Customer (default), Admin

Access token is stored in memory (Redux); refresh token in HttpOnly cookie. Run the SQL script to create auth tables:

```bash
mysql -u root -p < backend/Scripts/01_CreateDatabaseAndTables.sql
```

## Project Structure

```
├── frontend/          # React + Vite + Tailwind + Redux
├── backend/           # ASP.NET Core Web API + Identity
│   ├── Scripts/       # Database scripts (01_CreateDatabaseAndTables.sql)
│   └── Migrations/    # EF Core migrations
└── Plan.txt           # Feature requirements
```
