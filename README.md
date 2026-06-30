# Team Manager

Sprint-based team management app for organizing team members across team leads and tech leads.
Tracks work items, leave, notes, and releases per person per sprint — and exports to PowerPoint.

**Stack:** Angular 22 · ASP.NET Core 9 · PostgreSQL 17

---

## Local development

### 1. Install prerequisites

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

### 2. Create a Google OAuth app

The app uses Google Sign-In. You need your own OAuth credentials.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth 2.0 Client ID** → choose **Web application**.
3. Under **Authorized JavaScript origins** add `http://localhost:4200`.
4. Under **Authorized redirect URIs** add `http://localhost:4200`.
5. Copy your **Client ID** and **Client Secret**.

### 3. Configure credentials

**Frontend** — edit `team-manager-ui/src/environments/environment.ts`:
```ts
googleClientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
```

After editing, tell git to stop tracking local changes to that file:
```bash
git update-index --skip-worktree team-manager-ui/src/environments/environment.ts
```

**Backend** — store credentials using .NET user secrets (stored outside the repo):
```bash
cd src/TeamManager.Api
dotnet user-secrets set "Jwt:Audience" "YOUR_CLIENT_ID.apps.googleusercontent.com"
```

The connection string default (`Password=CHANGE_ME`) works if your local PostgreSQL has no password set. If it does, set that too:
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=team_manager;Username=postgres;Password=YOUR_PG_PASSWORD"
```

### 4. Set up the database

```bash
psql -U postgres -c "CREATE DATABASE team_manager;"

cd src/TeamManager.Api
dotnet ef database update
```

### 5. Run

```bash
# Terminal 1 — backend
cd src/TeamManager.Api
dotnet run
# API: http://localhost:5000  Swagger: http://localhost:5000/swagger

# Terminal 2 — frontend
cd team-manager-ui
npm install
ng serve
# UI: http://localhost:4200
```

Open `http://localhost:4200`, sign in with Google, and link your account to a team member when prompted.

---

## First-time app setup

1. Go to **Team** → add team leads, tech leads, and members. Assign each member to their team lead.
2. Go to **Sprints** → optionally create a PI, then create a sprint.
3. Open the sprint → click **Initialize Members** — this creates a sprint record for every active member.
4. Add work items, leave, and notes per person.
5. View the summary on the **Dashboard**.

---

## PPTX Export

1. Design a PowerPoint template using placeholders like `{{MEMBER_FULL_NAME}}`, `{{RELEASES}}`, etc.
2. **Important:** Type each placeholder as a single text run — formatting individual characters inside a placeholder causes PowerPoint to split it into multiple runs, breaking replacement.
3. One slide = one person. The export engine clones that slide for each team member.
4. Add a summary slide with `{{SUMMARY_COMPLETED_COUNT}}` etc. for totals.
5. Go to **Export**, upload the template, choose the sprint, and click **Generate & Download**.

### Placeholder reference

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
- A Google OAuth Client ID and Secret (see [step 2](#2-create-a-google-oauth-app) above — add your server's domain to the authorized origins/redirect URIs)

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

Fill in all values. The Google Client ID and Secret are the only credentials specific to your OAuth app — everything else is for the database.

### 3. Start the stack

```bash
docker compose up -d --build
```

This builds the Angular app with your `GOOGLE_CLIENT_ID` injected and starts 4 containers:

- **db** — PostgreSQL with a persistent volume
- **migrate** — runs EF Core migrations, then exits
- **api** — .NET backend on port 5000
- **ui** — Angular frontend on port 80

### 4. Access the app

Open `http://<server-ip>` in your browser. Sign in with Google.

### 5. (Optional) HTTPS via reverse proxy

Put Caddy, nginx, or Traefik in front of port 80. Example with Caddy:

```
your-domain.com {
    reverse_proxy localhost:80
}
```

Also add `https://your-domain.com` to the authorized origins and redirect URIs in Google Cloud Console.

### Updating

```bash
git pull
docker compose up -d --build
```

---

## Terminal UI (TUI)

A terminal dashboard for quick sprint check-ins. Requires Python 3.10+:

```bash
curl -sSL https://raw.githubusercontent.com/juanlurie/team-manager-tui/main/install.sh | bash
```

```bash
# Local (no auth needed)
team-manager-tui

# Remote server
TEAM_MANAGER_API_URL=https://your-domain.com \
TEAM_MANAGER_API_KEY=your-key \
team-manager-tui
```

Generate an API key in the web app: **Profile → API Keys**.

Full docs: [team-manager-tui](https://github.com/juanlurie/team-manager-tui)
