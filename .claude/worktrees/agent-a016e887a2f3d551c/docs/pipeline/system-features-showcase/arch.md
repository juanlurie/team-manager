# System Features Showcase — Architecture Document

## 1. System Overview

Team Manager is a sprint-based team management application for ~30 team members across 3 team leads and 1 tech lead. It tracks work items, leave, notes, releases, and more per person per sprint, with PowerPoint export capability.

### Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | .NET 9 (ASP.NET Core), PostgreSQL 17, EF Core |
| **Frontend UI** | Angular 19, Angular Material, standalone components |
| **MCP Server** | Python 3, `mcp` SDK, `httpx` async HTTP client |
| **TUI (Terminal)** | Python 3, `textual` TUI framework, `httpx` |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Team Manager System                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐ │
│  │  Angular UI   │   │  MCP Server  │   │  TUI (Terminal)       │ │
│  │  (Port 4200)  │   │  (stdio)     │   │  (textual)            │ │
│  │              │   │              │   │                       │ │
│  │ - Dashboard  │   │ - 130+ tools │   │ - Sprint dashboard    │ │
│  │ - Sprints    │   │ - Full CRUD  │   │ - Feature browser     │ │
│  │ - Team       │   │ - All domains│   │ - Work item viewer    │ │
│  │ - Meetings   │   │              │   │ - Feature creation    │ │
│  │ - Fun Hub    │   │              │   │                       │ │
│  │ - Export     │   │              │   │                       │ │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬────────────┘ │
│         │                  │                       │              │
│         └──────────────────┼───────────────────────┘              │
│                            │ HTTP/REST                            │
│                     ┌──────▼───────┐                              │
│                     │  .NET 9 API  │                              │
│                     │  (Port 5000) │                              │
│                     │              │                              │
│                     │ 31 Controllers│                              │
│                     │ /api/v1/*    │                              │
│                     └──────┬───────┘                              │
│                            │ EF Core                              │
│                     ┌──────▼───────┐                              │
│                     │  PostgreSQL  │                              │
│                     │   (v17)      │                              │
│                     └──────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Feature Inventory

### 2.1 Domain Entities (30+ entities)

| Domain | Entities |
|---|---|
| **Planning** | PI, Sprint, SprintMember, Feature, WorkItem |
| **Team** | TeamMember, Squad, SquadMember |
| **Meetings** | MeetingSeries, MeetingSeriesSlot, MeetingSeriesItem, MeetingSeriesItemParticipant, MeetingSeriesItemAvailability, MeetingSeriesSlotClaim, MeetingSession, MeetingSlot, SessionType, SlotLocation |
| **Personal** | MemberPersonal, MemberSkill, MemberSkillRating, MemberNote, MemberTask, MemberTimesheetConfig |
| **Time** | TimesheetEntry, LeaveRecord |
| **Discussion** | DiscussionPoint, DiscussionTask |
| **Retrospective** | RetroAction |
| **Gamification** | PointAward, Achievement, MemberAchievement, SprintVote, WinWeek, WinNomination, WinVote, WinMonth, WinMonthNomination, WinMonthVote |
| **Random Assignment** | Wheel, WheelParticipant |
| **System** | Comment, ApiKey, Invitation |

### 2.2 Enums

| Enum | Values |
|---|---|
| `MemberRole` | Member, TeamLead, TechLead |
| `WorkItemType` | Task, Analysis, Design, Dev, QA, Bug, Release |
| `WorkItemStatus` | Planned, InProgress, Blocked, Completed, ReadyForRelease, Released |
| `LeaveType` | Annual, Sick, Other, Birthday, Loyalty, Discretionary, FamilyResponsibility |
| `MeetingStatus` | (defined in MeetingStatus.cs) |
| `SlotType` | (defined in SlotType.cs) |
| `MeetingLocation` | (defined in MeetingLocation.cs) |
| `ParticipantRole` | (defined in ParticipantRole.cs) |
| `MeetingType` | (defined in MeetingType.cs) |
| `WinWeekStatus` | (defined in WinWeekStatus.cs) |
| `WinMonthStatus` | (defined in WinMonthStatus.cs) |

---

## 3. API Endpoints (31 Controllers)

All endpoints are under `/api/v1/` prefix (except auth endpoints under `/api/`).

### 3.1 Planning & Sprints

| Controller | Methods | Endpoints |
|---|---|---|
| **PIsController** | CRUD | `GET/POST /api/v1/pis`, `GET/PUT/DELETE /api/v1/pis/{id}` |
| **SprintsController** | CRUD + special | `GET/POST /api/v1/sprints`, `GET/PUT/DELETE /api/v1/sprints/{id}`, `PATCH /api/v1/sprints/{id}/close`, `POST /api/v1/sprints/{id}/clone`, `PATCH /api/v1/sprints/{id}/retro`, `GET /api/v1/sprints/velocity` |
| **SprintMembersController** | Read + update | `GET /api/v1/sprint-members/sprint/{id}`, `PATCH /api/v1/sprint-members/{id}/notes`, `PATCH /api/v1/sprint-members/{id}/capacity` |
| **FeaturesController** | CRUD | `GET/POST /api/v1/sprints/{id}/features`, `PUT/DELETE /api/v1/sprints/{id}/features/{fid}`, `PATCH /api/v1/sprints/{id}/features/{fid}/toggle-active` |
| **AllFeaturesController** | Read + status | `GET /api/v1/features`, `PATCH /api/v1/features/{id}/status` |
| **WorkItemsController** | CRUD | `GET/POST /api/v1/sprint-members/{id}/work-items`, `GET/PUT/DELETE /api/v1/work-items/{id}`, `PATCH /api/v1/work-items/{id}/status`, `POST /api/v1/work-items/{id}/carry-over` |
| **SprintVotesController** | Votes + MVP | `GET /api/v1/sprints/{id}/votes`, `POST /api/v1/sprints/{id}/votes`, `POST /api/v1/sprints/{id}/votes/award-mvp` |
| **RetroActionsController** | CRUD | `GET/POST /api/v1/retro-actions`, `PUT/DELETE /api/v1/retro-actions/{id}` |
| **ProgressController** | Read | `GET /api/v1/progress` |

### 3.2 Team Management

| Controller | Methods | Endpoints |
|---|---|---|
| **TeamMembersController** | CRUD | `GET/POST /api/v1/team-members`, `GET/PUT/DELETE /api/v1/team-members/{id}` |
| **SquadsController** | CRUD + membership | `GET/POST /api/v1/squads`, `GET/PUT/DELETE /api/v1/squads/{id}`, `PUT /api/v1/squads/{id}/members`, `PUT /api/v1/team-members/{id}/squads` |

### 3.3 Meetings

| Controller | Methods | Endpoints |
|---|---|---|
| **MeetingSeriesController** | CRUD + slots/items/availability | `GET/POST /api/v1/meeting-series`, `GET/PUT/DELETE /api/v1/meeting-series/{id}`, `GET/POST /api/v1/meeting-series/{id}/slots`, `PUT/DELETE /api/v1/meeting-series/{id}/slots/{sid}`, `GET/POST /api/v1/meeting-series/{id}/items`, `PUT/DELETE /api/v1/meeting-series/{id}/items/{iid}`, `POST /api/v1/meeting-series/items/{iid}/unconfirm`, `GET /api/v1/meeting-series/my-series`, `GET /api/v1/meeting-series/my-meetings`, `GET/POST /api/v1/meeting-series/{id}/bulk-availability`, `GET/POST /api/v1/meeting-series/{id}/my-availability`, `GET/POST/DELETE /api/v1/meeting-series/items/{iid}/availability` |
| **MeetingSessionsController** | CRUD + booking | `GET/POST /api/v1/meeting-sessions`, `GET/PUT/DELETE /api/v1/meeting-sessions/{id}`, `PATCH /api/v1/meeting-sessions/{id}/status`, `POST/DELETE /api/v1/meeting-sessions/{id}/slots/{sid}/book` |
| **SessionTypesController** | CRUD | `GET/POST /api/v1/session-types`, `GET/PUT/DELETE /api/v1/session-types/{id}` |
| **SlotLocationsController** | CRUD | `GET/POST /api/v1/slot-locations`, `GET/PUT/DELETE /api/v1/slot-locations/{id}` |

### 3.4 Personal & Time

| Controller | Methods | Endpoints |
|---|---|---|
| **MemberPersonalController** | Skills, notes, tasks | `GET/PUT /api/v1/team-members/{id}/personal`, `GET/POST /api/v1/team-members/{id}/skills`, `POST /api/v1/team-members/{id}/skills/{sid}/ratings`, `DELETE /api/v1/team-members/{id}/skills/{sid}`, `GET/POST /api/v1/team-members/{id}/notes`, `DELETE /api/v1/team-members/{id}/notes/{nid}`, `GET/POST /api/v1/team-members/{id}/tasks`, `PATCH/DELETE /api/v1/team-members/{id}/tasks/{tid}` |
| **TimesheetsController** | CRUD + export | `GET/POST /api/v1/team-members/{id}/timesheets`, `PUT/DELETE /api/v1/team-members/{id}/timesheets/{eid}`, `GET /api/v1/team-members/{id}/timesheets/export` |
| **TimesheetConfigController** | CRUD | `GET/PUT /api/v1/team-members/{id}/timesheet-config` |
| **LeaveRecordsController** | CRUD + import | `GET/POST /api/v1/leave-records`, `PUT/DELETE /api/v1/leave-records/{id}`, `POST /api/v1/leave-records/import`, `POST /api/v1/leave-records/fetch-preview`, `POST /api/v1/leave-records/fetch` |

### 3.5 Discussion

| Controller | Methods | Endpoints |
|---|---|---|
| **DiscussionPointsController** | CRUD + tasks | `GET/POST /api/v1/discussion-points`, `PUT/DELETE /api/v1/discussion-points/{id}`, `GET/POST /api/v1/discussion-points/{id}/tasks`, `PUT/DELETE /api/v1/discussion-points/{id}/tasks/{tid}`, `POST /api/v1/discussion-points/{id}/tasks/{tid}/toggle` |

### 3.6 Gamification & Fun

| Controller | Methods | Endpoints |
|---|---|---|
| **LeaderboardController** | Read + award/revoke | `GET /api/v1/leaderboard`, `GET /api/v1/leaderboard/member/{id}`, `GET /api/v1/leaderboard/member/{id}/history`, `POST /api/v1/leaderboard/award`, `DELETE /api/v1/leaderboard/award/{id}` |
| **AchievementsController** | List + award/revoke | `GET /api/v1/achievements`, `GET /api/v1/achievements/member/{id}`, `POST /api/v1/achievements/award`, `DELETE /api/v1/achievements/{id}` |
| **WinOfTheWeekController** | Full lifecycle | `GET /api/v1/win-of-the-week/current`, `POST /api/v1/win-of-the-week/nominations`, `POST/DELETE /api/v1/win-of-the-week/nominations/{id}/vote`, `POST /api/v1/win-of-the-week/close`, `POST /api/v1/win-of-the-week/open-next`, `POST /api/v1/win-of-the-week/open-voting`, `GET /api/v1/win-of-the-week/history`, `GET /api/v1/win-of-the-week/weeks/{id}` |
| **WinOfMonthController** | Full lifecycle | `GET /api/v1/win-of-the-month/current`, `GET /api/v1/win-of-the-month/history`, `POST/DELETE /api/v1/win-of-the-month/nominations/{id}/vote`, `POST /api/v1/win-of-the-month/close`, `POST /api/v1/win-of-the-month/generate`, `POST /api/v1/win-of-the-month/open` |
| **WheelsController** | CRUD + participants | `GET/POST /api/v1/wheels`, `DELETE /api/v1/wheels/{id}`, `POST/DELETE /api/v1/wheels/{id}/participants/{mid}` |

### 3.7 Dashboard & Export

| Controller | Methods | Endpoints |
|---|---|---|
| **DashboardController** | Read | `GET /api/v1/dashboard/sprint/{id}`, `GET /api/v1/dashboard/sprint/{id}/summary`, `GET /api/v1/dashboard/sprint/{id}/blockers`, `GET /api/v1/dashboard/sprint/{id}/leave-summary` |
| **ExportController** | Export | `POST /api/v1/export/pptx` |
| **CommentsController** | CRUD | `GET /api/v1/comments/{entityType}/{entityId}`, `POST /api/v1/comments`, `DELETE /api/v1/comments/{id}` |

### 3.8 Auth & Users

| Controller | Methods | Endpoints |
|---|---|---|
| **AuthModeController** | Read | `GET /api/auth-mode` |
| **UsersController** | Link + toggle | `GET /api/users/unlinked`, `POST /api/users/link`, `PATCH /api/users/{id}/toggle`, `POST /api/auth/exchange` |
| **ApiKeysController** | CRUD | (API key management) |

---

## 4. MCP Server Tools (130+ tools)

The MCP server at `mcp-server/server.py` exposes **130+ tools** organized into 22 domains. Each tool maps directly to a REST API endpoint.

### 4.1 Tool Inventory by Domain

| Domain | Tool Count | Tools |
|---|---|---|
| **PIs** | 5 | `list_pis`, `get_pi`, `create_pi`, `update_pi`, `delete_pi` |
| **Sprints** | 9 | `list_sprints`, `get_sprint`, `create_sprint`, `update_sprint`, `delete_sprint`, `close_sprint`, `clone_sprint`, `initialize_sprint_members`, `update_sprint_retro`, `get_sprint_velocity` |
| **Team Members** | 5 | `list_team_members`, `get_team_member`, `create_team_member`, `update_team_member`, `delete_team_member` |
| **Work Items** | 6 | `list_work_items`, `get_work_item`, `create_work_item`, `update_work_item`, `update_work_item_status`, `carry_over_work_item`, `delete_work_item` |
| **Dashboard** | 4 | `get_sprint_dashboard`, `get_sprint_summary`, `get_sprint_blockers`, `get_leave_summary` |
| **Leave Records** | 7 | `list_leave_records`, `create_leave_record`, `update_leave_record`, `delete_leave_record`, `import_leave_records`, `fetch_leave_preview`, `fetch_leave_records` |
| **Leaderboard** | 5 | `get_leaderboard`, `get_leaderboard_member_stats`, `get_leaderboard_member_history`, `award_points`, `revoke_points` |
| **Sprint Members** | 3 | `get_sprint_members`, `update_sprint_member_notes`, `update_sprint_member_capacity` |
| **Features** | 7 | `list_sprint_features`, `create_sprint_feature`, `update_sprint_feature`, `delete_sprint_feature`, `toggle_feature_active`, `list_all_features`, `set_feature_status` |
| **Retro Actions** | 4 | `list_retro_actions`, `create_retro_action`, `update_retro_action`, `delete_retro_action` |
| **Sprint Votes** | 3 | `get_sprint_votes`, `cast_sprint_vote`, `award_sprint_mvp` |
| **Comments** | 3 | `get_comments`, `create_comment`, `delete_comment` |
| **Achievements** | 4 | `list_achievements`, `get_member_achievements`, `award_achievement`, `revoke_achievement` |
| **Timesheets** | 5 | `get_timesheets`, `create_timesheet_entry`, `update_timesheet_entry`, `delete_timesheet_entry`, `export_timesheet` |
| **Timesheet Config** | 2 | `get_timesheet_config`, `update_timesheet_config` |
| **Member Personal** | 12 | `get_member_personal`, `update_member_personal`, `get_member_skills`, `create_member_skill`, `add_skill_rating`, `delete_member_skill`, `get_member_notes`, `create_member_note`, `delete_member_note`, `get_member_tasks`, `create_member_task`, `update_member_task`, `delete_member_task` |
| **Squads** | 6 | `list_squads`, `get_squad`, `create_squad`, `update_squad`, `delete_squad`, `set_squad_members`, `set_member_squads` |
| **Discussion Points** | 8 | `list_discussion_points`, `create_discussion_point`, `update_discussion_point`, `delete_discussion_point`, `get_discussion_tasks`, `create_discussion_task`, `update_discussion_task`, `delete_discussion_task`, `toggle_discussion_task` |
| **Meeting Series** | 18 | `list_meeting_series`, `get_meeting_series`, `create_meeting_series`, `update_meeting_series`, `delete_meeting_series`, `get_meeting_series_slots`, `create_meeting_series_slots`, `update_meeting_series_slot`, `delete_meeting_series_slot`, `get_meeting_series_items`, `create_meeting_series_item`, `update_meeting_series_item`, `delete_meeting_series_item`, `unconfirm_meeting_item`, `get_my_meeting_series`, `get_my_meetings`, `get_item_availability`, `add_item_availability`, `remove_item_availability`, `get_bulk_availability`, `submit_bulk_availability`, `get_my_availability`, `set_my_availability` |
| **Meeting Sessions** | 7 | `list_meeting_sessions`, `get_meeting_session`, `create_meeting_session`, `update_meeting_session`, `delete_meeting_session`, `update_meeting_session_status`, `book_meeting_slot`, `unbook_meeting_slot` |
| **Session Types** | 5 | `list_session_types`, `get_session_type`, `create_session_type`, `update_session_type`, `delete_session_type` |
| **Slot Locations** | 5 | `list_slot_locations`, `get_slot_location`, `create_slot_location`, `update_slot_location`, `delete_slot_location` |
| **Wheels** | 5 | `list_wheels`, `create_wheel`, `delete_wheel`, `add_wheel_participant`, `remove_wheel_participant` |
| **Win of the Week** | 9 | `get_win_of_week_current`, `create_win_week_nomination`, `vote_win_week`, `remove_vote_win_week`, `close_win_week`, `open_next_win_week`, `open_win_week_voting`, `get_win_week_history`, `get_win_week_detail` |
| **Win of the Month** | 6 | `get_win_of_month_current`, `get_win_of_month_history`, `vote_win_month`, `remove_vote_win_month`, `close_win_month`, `generate_win_month`, `open_win_month` |
| **Export** | 1 | `export_pptx` |
| **Progress** | 1 | `get_progress` |
| **Auth/Users** | 5 | `get_auth_mode`, `exchange_auth_code`, `get_unlinked_users`, `link_user`, `toggle_user_active` |

### 4.2 MCP Tool Pattern

Each tool follows a consistent pattern:
- **snake_case** naming (e.g., `list_team_members`, `create_sprint`)
- **inputSchema** defines required and optional parameters
- Maps to REST endpoint via `call_tool()` handler with HTTP method routing
- Uses `_get`, `_post`, `_put`, `_patch`, `_delete` helper functions
- Returns JSON via `_ok()` or error via `_err()`

---

## 5. TUI (Terminal UI) Capabilities

The TUI at `tui/` is a **read-heavy terminal dashboard** built with the `textual` framework.

### 5.1 Screens

| Screen | File | Purpose |
|---|---|---|
| **Main App** | `tui/app.py` | Sprint selector, bootstraps dashboard |
| **Dashboard** | `tui/screens/dashboard.py` | Sprint overview with features table, blockers, leave, unallocated members |
| **Feature Detail** | `tui/screens/feature_detail.py` | Work items for a feature grouped by status tabs |
| **Work Items** | `tui/screens/work_items.py` | All work items for a sprint member grouped by status |
| **Add Feature** | `tui/screens/add_feature.py` | Modal to create a new feature |

### 5.2 TUI API Client

The TUI uses `tui/api.py` which calls these endpoints:
- `GET /api/v1/sprints` — list sprints
- `GET /api/v1/dashboard/sprint/{id}` — full dashboard
- `GET /api/v1/dashboard/sprint/{id}/blockers` — blocked items
- `GET /api/v1/dashboard/sprint/{id}/leave-summary` — leave data
- `GET /api/v1/sprint-members/{id}/work-items` — work items
- `POST /api/v1/sprints/{id}/features` — create feature

### 5.3 TUI Key Bindings

| Key | Action |
|---|---|
| `[` / `]` | Navigate between sprints |
| `n` | Add new feature |
| `Enter` | Open feature detail / work items |
| `r` | Refresh data |
| `b` / `Escape` | Go back |
| `q` | Quit |

### 5.4 TUI Features

- **Sprint cycling** — browse sprints with `[` and `]`
- **Feature table** — shows feature title, status, external ref, assigned members, progress
- **Progress bar** — visual sprint completion percentage
- **Right panel** — blockers, leave, unallocated members
- **Tabbed work items** — Planned, In Progress, Blocked, Done tabs
- **Unplanned items** — synthetic row for work items without a feature

---

## 6. Search Capabilities

### 6.1 Frontend Search Components

| Component | File | Purpose |
|---|---|---|
| **Quick Open Dialog** | `quick-open-dialog.component.ts` | Command-palette style navigation (Ctrl+G) |
| **K-Picker** | `k-picker-dialog.component.ts` | Multi-select team member picker with fuzzy search (Ctrl+K) |
| **Search Input** | `search-input.component.ts` | Reusable search input with clear button |
| **Filter Bar** | `filter-bar.component.ts` | Column-based filtering for data tables |
| **Searchable Select** | `searchable-select.component.ts` | Single-select dropdown with search |
| **Searchable Multi-Select** | `searchable-multi-select.component.ts` | Multi-select dropdown with search |

### 6.2 Quick Open Dialog

- **Trigger**: Keyboard shortcut (configured in app)
- **Searches**: Page routes + team member names
- **Results**: Shows up to 5 matches
- **Navigation**: Arrow keys, Enter to select, Escape to close
- **Indexed items**: Dashboard, Sprints, Features, Progress, Discussion, Team, Leave, Export, Fun Hub, Win of the Week, Leaderboard, Spin Wheel, + all active team members

### 6.3 K-Picker (Member Selector)

- **Trigger**: Ctrl+K / Cmd+K
- **Searches**: Team member first/last name (fuzzy match)
- **Filters**: Squad filter, Lead filter (Team Lead / Tech Lead)
- **Sections**: Recent selections, People
- **Modes**: Single-select (auto-closes) or multi-select
- **Persistence**: Recent selections stored in localStorage
- **Features**: Chip display for selected members, keyboard navigation, hover sync

### 6.4 Server-Side Search

API endpoints support filtering via query parameters:
- **Team Members**: `?role=`, `&teamLeadId=`, `&isActive=`
- **Sprints**: `?piId=`, `&from=`, `&to=`
- **Leave Records**: `?teamMemberId=`, `&sprintId=`, `&from=`, `&to=`
- **Features**: `?status=`, `&piId=`
- **Retro Actions**: `?sprintId=`

---

## 7. Frontend Routes (Angular UI)

| Route | Module | Description |
|---|---|---|
| `/dashboard` | dashboard | Sprint dashboard with member cards |
| `/sprints` | sprints | Sprint list and management |
| `/team` | team | Team member management |
| `/team/:id` | team | Individual member detail |
| `/leave` | leave | Leave records management |
| `/export` | export | PPTX export |
| `/fun` | fun | Fun hub (landing) |
| `/fun/win-of-the-week` | win-of-the-week | Win of the week nominations/voting |
| `/fun/leaderboard` | fun | Team leaderboard |
| `/fun/wheel` | wheel | Spin wheel for random assignment |
| `/discussion` | discussion | Discussion points and tasks |
| `/features` | all-features | All features across sprints |
| `/progress` | progress | Progress tracking view |
| `/meetings` | meetings | Meeting sessions |
| `/meetings/series` | meeting-series | Meeting series management |
| `/meetings/my-meetings` | meetings | My upcoming meetings |
| `/meetings/my-series` | meetings | My meeting series |
| `/meetings/locations` | slot-locations | Slot location management |
| `/profile` | profile | User profile |
| `/session-types` | session-types | Session type management |
| `/login` | login | Authentication |

---

## 8. Recommended Architecture for Showcase Screen

### 8.1 Route & Placement

```
/features-showcase    (new route)
```

Add to `app.routes.ts`:
```typescript
{
  path: 'features-showcase',
  loadComponent: () => import('./features/features-showcase/features-showcase.component')
    .then(m => m.FeaturesShowcaseComponent)
}
```

### 8.2 Component Structure

```
features-showcase/
├── features-showcase.component.ts       # Main container
├── features-showcase.component.html     # Template
├── features-showcase.component.css      # Styles
├── sections/
│   ├── searches-section.component.ts    # Search capabilities
│   ├── tui-section.component.ts         # TUI capabilities
│   ├── mcp-section.component.ts         # MCP tools
│   └── features-section.component.ts    # Feature inventory
├── models/
│   └── showcase.model.ts               # Data models
└── services/
    └── showcase-data.service.ts         # Static data + live API calls
```

### 8.3 Data Flow

```
┌─────────────────────────────────────────────┐
│          FeaturesShowcaseComponent           │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │        Tab Navigation Bar              │  │
│  │  [Searches] [TUI] [MCP] [Features]    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │         Active Section View            │  │
│  │                                        │  │
│  │  SearchesSectionComponent              │  │
│  │  TuiSectionComponent                   │  │
│  │  McpSectionComponent                   │  │
│  │  FeaturesSectionComponent              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │       ShowcaseDataService              │  │
│  │  - Static tool/feature definitions     │  │
│  │  - Live API calls for counts/stats     │  │
│  │  - MCP tool introspection              │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 8.4 Data Models

```typescript
// showcase.model.ts

export interface ShowcaseSection {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface SearchCapability {
  name: string;
  component: string;
  trigger: string;          // e.g., 'Ctrl+K', 'Ctrl+G'
  description: string;
  searchableEntities: string[];
  filters?: string[];
}

export interface TuiCapability {
  screen: string;
  file: string;
  description: string;
  keyBindings: { key: string; action: string }[];
  apiEndpoints: string[];
}

export interface McpTool {
  name: string;
  description: string;
  domain: string;
  requiredParams: string[];
  optionalParams: string[];
  apiEndpoint: string;
  httpMethod: string;
}

export interface SystemFeature {
  domain: string;
  icon: string;
  entities: string[];
  apiEndpoints: number;
  mcpTools: number;
  uiRoutes: string[];
  description: string;
}
```

### 8.5 Dynamic Feature Discovery

The showcase screen should dynamically discover features via:

1. **Static inventory** — Hardcoded tool/feature definitions parsed from `mcp-server/server.py` and API controllers
2. **Live API calls** — Fetch counts and current state:
   - `GET /api/v1/pis` → count PIs
   - `GET /api/v1/sprints` → count sprints, find active
   - `GET /api/v1/team-members?isActive=true` → count active members
   - `GET /api/v1/squads` → count squads
   - `GET /api/v1/leaderboard` → get top performers
   - `GET /api/v1/progress` → overall progress stats
   - `GET /api/v1/win-of-the-week/current` → current win status
   - `GET /api/v1/win-of-the-month/current` → current win status
   - `GET /api/v1/wheels` → count wheels
   - `GET /api/v1/meeting-series` → count meeting series
   - `GET /api/v1/discussion-points` → count discussion points
   - `GET /api/v1/achievements` → list available achievements

3. **MCP tool introspection** — The MCP server's `TOOLS` list can be parsed at build time to generate the tool inventory automatically

---

## 9. Section Detail Designs

### 9.1 Searches Section

```
┌────────────────────────────────────────────────────┐
│  Search Capabilities                                │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │  Quick Open     │  │  K-Picker (Ctrl+K)       │ │
│  │  (Ctrl+G)       │  │                          │ │
│  │  Navigate pages │  │  Select team members     │ │
│  │  + members      │  │  Squad/Lead filters      │ │
│  │                 │  │  Recent selections       │ │
│  │  13 pages       │  │  Fuzzy name search       │ │
│  │  + N members    │  │  Single/multi mode       │ │
│  └─────────────────┘  └──────────────────────────┘ │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │  Filter Bar     │  │  Searchable Selects       │ │
│  │                 │  │                          │ │
│  │  Column filters │  │  Dropdown search         │ │
│  │  on data tables │  │  Single/multi variants   │ │
│  │                 │  │  Used in forms           │ │
│  └─────────────────┘  └──────────────────────────┘ │
│                                                     │
│  Server-Side Filtering:                             │
│  • Team Members: role, teamLead, isActive          │
│  • Sprints: piId, date range                       │
│  • Leave: member, sprint, date range               │
│  • Features: status, piId                          │
│  • Retro Actions: sprintId                         │
└────────────────────────────────────────────────────┘
```

### 9.2 TUI Section

```
┌────────────────────────────────────────────────────┐
│  Terminal UI (TUI)                                  │
├────────────────────────────────────────────────────┤
│                                                     │
│  Framework: Textual (Python)                        │
│  Entry: python tui/app.py                           │
│  API: TEAM_MANAGER_API_URL env var                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Screens                                     │  │
│  │                                              │  │
│  │  Dashboard    Sprint overview, features,     │  │
│  │               blockers, leave, unallocated   │  │
│  │                                              │  │
│  │  Feature      Work items by status tabs      │  │
│  │  Detail       (Planned/In Progress/Blocked/  │  │
│  │               Done)                          │  │
│  │                                              │  │
│  │  Work Items   Member's work items by status  │  │
│  │                                              │  │
│  │  Add Feature  Modal to create features       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Key Bindings: [ ] Sprint nav, n New feature,      │
│  Enter Open detail, r Refresh, q Quit              │
└────────────────────────────────────────────────────┘
```

### 9.3 MCP Section

```
┌────────────────────────────────────────────────────┐
│  Model Context Protocol (MCP) Server                │
├────────────────────────────────────────────────────┤
│                                                     │
│  Server: mcp-server/server.py                       │
│  Transport: stdio                                   │
│  Total Tools: 130+ across 22 domains                │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Tool Domains (expandable cards)             │  │
│  │                                              │  │
│  │  Planning (24)    PIs, Sprints, Features,    │  │
│  │                   Work Items, Votes, Retro   │  │
│  │                                              │  │
│  │  Team (12)        Members, Squads            │  │
│  │                                              │  │
│  │  Meetings (35)    Series, Sessions, Types,   │  │
│  │                   Locations, Availability    │  │
│  │                                              │  │
│  │  Personal (14)    Skills, Notes, Tasks,      │  │
│  │                   Timesheets, Config         │  │
│  │                                              │  │
│  │  Time (7)         Leave records, import      │  │
│  │                                              │  │
│  │  Discussion (8)   Points, Tasks              │  │
│  │                                              │  │
│  │  Gamification (27) Leaderboard, Achievements, │  │
│  │                   Win Week, Win Month, Wheels│  │
│  │                                              │  │
│  │  System (9)       Dashboard, Export, Progress,│  │
│  │                   Comments, Auth, Users      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Each tool card shows: name, description, params,   │
│  mapped API endpoint, HTTP method                   │
└────────────────────────────────────────────────────┘
```

### 9.4 Features Section

```
┌────────────────────────────────────────────────────┐
│  System Features                                    │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Feature Cards (grid layout)                 │  │
│  │                                              │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  │
│  │  │ PI │ │Spt │ │Team│ │Sqds│ │Work│        │  │
│  │  │    │ │    │ │    │ │    │ │Item│        │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘        │  │
│  │                                              │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  │
│  │  │Meet│ │Disc│ │Time│ │Leave│ │Lead│        │  │
│  │  │    │ │    │ │Sheets│ │    │ │brd │        │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘        │  │
│  │                                              │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  │
│  │  │Achv│ │WinW│ │WinM│ │Wheel│ │Retro│       │  │
│  │  │    │ │    │ │    │ │     │ │    │        │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘        │  │
│  │                                              │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                │  │
│  │  │Exp │ │Prog│ │Comm│ │Auth │                │  │
│  │  │    │ │    │ │    │ │     │                │  │
│  │  └────┘ └────┘ └────┘ └────┘                │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Each card shows: entity count, API endpoints,      │
│  MCP tools, UI routes, live stats                   │
└────────────────────────────────────────────────────┘
```

---

## 10. API Changes Needed

**No new API endpoints are required.** The existing API already exposes all data needed for the showcase screen.

### 10.1 Optional Enhancement: System Metadata Endpoint

Consider adding a single convenience endpoint for the showcase screen:

```
GET /api/v1/system/metadata
```

Response:
```json
{
  "counts": {
    "pis": 3,
    "sprints": 12,
    "activeSprints": 1,
    "teamMembers": 30,
    "activeMembers": 28,
    "squads": 5,
    "features": 45,
    "workItems": 230,
    "meetingSeries": 4,
    "meetingSessions": 12,
    "discussionPoints": 8,
    "wheels": 2,
    "achievements": 10,
    "retroActions": 15
  },
  "mcpTools": 130,
  "apiEndpoints": 120,
  "uiRoutes": 20,
  "tuiScreens": 4,
  "searchComponents": 6,
  "version": "1.0.0"
}
```

This would reduce the number of API calls from ~12 to 1 for the showcase screen.

---

## 11. Implementation Checklist

### Phase 1: Data Layer
- [ ] Create `showcase-data.service.ts` with static inventories
- [ ] Add live API calls for counts/stats
- [ ] Create `showcase.model.ts` with TypeScript interfaces
- [ ] (Optional) Add `/api/v1/system/metadata` endpoint

### Phase 2: Main Component
- [ ] Create `features-showcase.component.ts` with tab navigation
- [ ] Add route to `app.routes.ts`
- [ ] Add navigation link to sidebar/header

### Phase 3: Section Components
- [ ] Create `searches-section.component.ts`
- [ ] Create `tui-section.component.ts`
- [ ] Create `mcp-section.component.ts`
- [ ] Create `features-section.component.ts`

### Phase 4: Polish
- [ ] Add expandable/collapsible tool lists in MCP section
- [ ] Add live stat badges on feature cards
- [ ] Add search/filter within each section
- [ ] Add responsive layout for mobile
- [ ] Add keyboard navigation

---

## 12. Summary Statistics

| Metric | Count |
|---|---|
| **Domain Entities** | 30+ |
| **API Controllers** | 31 |
| **API Endpoints** | 120+ |
| **MCP Tools** | 130+ |
| **MCP Tool Domains** | 22 |
| **TUI Screens** | 4 |
| **Frontend Routes** | 20+ |
| **Search Components** | 6 |
| **Enums** | 11 |
| **Frontend Services** | 28 |
