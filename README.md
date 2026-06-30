# Team Manager

Sprint-based team management app for organizing team members across team leads and tech leads.
Tracks work items, leave, notes, and releases per person per sprint — and exports to PowerPoint.

**Stack:** Angular 22 · ASP.NET Core 9 · PostgreSQL 17

---

## Quick start (local development)

### 1. Prerequisites

Install these once:

```bash
# Homebrew (macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# .NET 9 SDK
brew install dotnet

# Node.js 22
brew install node

# PostgreSQL 17
brew install postgresql@17
brew services start postgresql@17

# Angular CLI & EF Core tools
npm install -g @angular/cli
dotnet tool install --global dotnet-ef
```

### 2. Google OAuth app

This app uses Google Sign-In. You need your own OAuth credentials.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
3. Choose **Web application** as the application type.
4. Add `http://localhost:4200` under **Authorized JavaScript origins**.
5. Add `http://localhost:4200` under **Authorized redirect URIs**.
6. Copy the **Client ID** and **Client Secret**.

Update both config files with your Client ID:

**`src/TeamManager.Api/appsettings.json`**
```json
"Jwt": {
  "Authority": "https://accounts.google.com",
  "Audience": "YOUR_CLIENT_ID.apps.googleusercontent.com"
}
```

**`team-manager-ui/src/app/core/auth/auth.config.ts`**
```ts
clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
```

### 3. Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE team_manager;"

# Run migrations (from repo root)
cd src/TeamManager.Api
dotnet ef database update
```

The default connection string in `appsettings.json` connects as `postgres` with password `CHANGE_ME`.
If your local PostgreSQL uses a different password, update that line before running migrations.

### 4. Run the backend

```bash
cd src/TeamManager.Api
dotnet run
```

API: `http://localhost:5000`  
Swagger: `http://localhost:5000/swagger`

### 5. Run the frontend

```bash
cd team-manager-ui
npm install
ng serve
```

UI: `http://localhost:4200`

Open the app and sign in with Google. On first login you'll be prompted to link your Google account to a team member.

---

## First-time app setup

1. Go to **Team** and add your team leads, tech leads, and members — assign each member to their team lead.
2. Go to **Sprints**, optionally create a PI first, then create sprints.
3. Open a sprint and click **Initialize Members** — this auto-creates a sprint record for every active member.
4. Add work items, leave, and notes for each person.
5. View the sprint summary on the **Dashboard**.

---

## PPTX Export

1. Design a PowerPoint template with placeholders like `{{MEMBER_FULL_NAME}}`, `{{RELEASES}}`, etc.
2. **Important:** Type placeholders as a single text run — do not format parts of the placeholder differently (this causes PowerPoint to split it into multiple runs, breaking replacement).
3. One slide = one person's data. The export engine clones that slide for each team member.
4. Add a summary slide with `{{SUMMARY_COMPLETED_COUNT}}` etc. for a totals page.
5. Go to **Export**, upload the template, choose the sprint, and click **Generate & Download**.

### Full placeholder reference

| Placeholder | Value |
|---|---|
| `{{MEMBER_FULL_NAME}}` | First + Last name |
| `{{MEMBER_ROLE}}` | Member / TeamLead / TechLead |
| `{{TEAM_LEAD_NAME}}` | Member's team lead name |
| `{{SPRINT_NAME}}` | Sprint name |
| `{{SPRINT_DATES}}` | e.g. "Apr 7 – Apr 18, 2026" |
| `{{PI_NAME}}` | PI name if assigned |
| `{{NOTES}}` | Free-text notes |
| `{{RELEASES}}` | Release-type work items, one per line |
| `{{WORK_ITEMS_COMPLETED}}` | Completed work items |
| `{{WORK_ITEMS_IN_PROGRESS}}` | In-progress work items |
| `{{WORK_ITEMS_PLANNED}}` | Planned work items |
| `{{WORK_ITEMS_FEATURES}}` | Feature-type items |
| `{{WORK_ITEMS_BUGS}}` | Bug-type items |
| `{{LEAVE_SUMMARY}}` | e.g. "Annual: 3d, Sick: 1d" |
| `{{LEAVE_DATES}}` | Date ranges with type |
| `{{LEAVE_DAYS_TOTAL}}` | Total days as number |
| `{{SUMMARY_TOTAL_MEMBERS}}` | (summary slide) total members |
| `{{SUMMARY_COMPLETED_COUNT}}` | (summary slide) completed items |
| `{{SUMMARY_IN_PROGRESS_COUNT}}` | (summary slide) in-progress items |
| `{{SUMMARY_PLANNED_COUNT}}` | (summary slide) planned items |
| `{{SUMMARY_TOTAL_LEAVE_DAYS}}` | (summary slide) total leave days |

---

## Self-hosting with Docker

### Prerequisites

- Docker & Docker Compose
- A Linux server (Ubuntu 22.04+ recommended)
- A Google OAuth Client ID and Secret (see [Google OAuth app](#2-google-oauth-app) above)

### 1. Clone the repo

```bash
git clone https://github.com/juanlurie/team-manager.git
cd team-manager
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:
- `DB_PASSWORD` — any strong password for the PostgreSQL database
- `GOOGLE_CLIENT_SECRET` — your Google OAuth client secret

Then update `team-manager-ui/src/app/core/auth/auth.config.ts` and `src/TeamManager.Api/appsettings.json` with your Google Client ID as described in the [Google OAuth app](#2-google-oauth-app) section above.

### 3. Start the stack

```bash
docker compose up -d --build
```

This launches 4 containers:
- **PostgreSQL** — database with persistent volume
- **migrate** — runs EF Core migrations, then exits
- **api** — .NET backend on port 5000
- **ui** — Angular frontend on port 80

### 4. Access the app

Open `http://<server-ip>` in your browser. Sign in with Google.

### 5. (Optional) Add a reverse proxy

For HTTPS, put nginx, Caddy, or Traefik in front of port 80. Example with Caddy:

```
your-domain.com {
    reverse_proxy localhost:80
}
```

Don't forget to add your domain to the **Authorized JavaScript origins** and **Authorized redirect URIs** in the Google Cloud Console.

### Updating

```bash
git pull
docker compose up -d --build
```

---

## Terminal UI (TUI)

A terminal dashboard for quick sprint check-ins. Install on any machine with Python 3.10+:

```bash
curl -sSL https://raw.githubusercontent.com/juanlurie/team-manager-tui/main/install.sh | bash
```

Then run from anywhere:

```bash
# Local (no auth needed)
team-manager-tui

# Remote server with API key
TEAM_MANAGER_API_URL=https://your-domain.com \
TEAM_MANAGER_API_KEY=your-key \
team-manager-tui
```

Generate an API key in the web app: **Profile → API Keys**.

Full docs: [team-manager-tui](https://github.com/juanlurie/team-manager-tui)
