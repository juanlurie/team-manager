# Team Manager

Sprint-based team management app for 30 team members across 3 team leads and 1 tech lead.
Tracks work items, leave, notes, and releases per person per sprint — and exports to PowerPoint.

**Stack:** Angular 19 · ASP.NET Core 9 · PostgreSQL 17

---

## Prerequisites

Install these once:

```bash
# 1. Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. .NET 9 SDK
brew install dotnet

# 3. Node.js 22
brew install node

# 4. PostgreSQL 17
brew install postgresql@17
brew services start postgresql@17

# 5. Angular CLI & EF Core tools
npm install -g @angular/cli
dotnet tool install --global dotnet-ef
```

---

## Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE team_manager;"

# Run migrations (from repo root)
cd src/TeamManager.Api
dotnet ef database update
```

The connection string is in `src/TeamManager.Api/appsettings.json`.
Change the password if your PostgreSQL uses a different one.

---

## Running the Backend

```bash
cd /Users/juan.lurie/team-manager/src/TeamManager.Api
dotnet run
```

API runs at `http://localhost:5000`  
Swagger UI: `http://localhost:5000/swagger`

---

## Running the Frontend

```bash
cd /Users/juan.lurie/team-manager/team-manager-ui
npm install
ng serve
```

UI runs at `http://localhost:4200`

---

## First-Time Setup (in the app)

1. Go to **Team** and add your 3 team leads, 1 tech lead, and 30 members — assign each member to their team lead.
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
# team-manager
