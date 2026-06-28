# UX Design: System Features Showcase

## 1. Route & Navigation

**Route:** `/showcase`

**Navigation Entry:** Add to `PRIMARY_NAV` in `app.component.ts`:
```typescript
{ path: '/showcase', icon: 'auto_awesome', label: 'Showcase' }
```

Also add to `BOTTOM_NAV` and `MORE_NAV` for mobile consistency.

## 2. Layout Strategy

Use the **hub pattern** (consistent with `meetings-hub` and `fun-hub`), but enhanced with a summary header bar showing live system stats.

```
┌─────────────────────────────────────────────────────────────────┐
│  System Showcase                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Stats Bar:  30 members · 12 sprints · 130 MCP tools ·   │  │
│  │  4 TUI screens · 6 search components · 20+ routes        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Searches]  [TUI]  [MCP]  [Features]                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │              Active Section Content                        │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Component Structure

```
features-showcase/
├── features-showcase.component.ts       # Hub container with tabs + stats bar
├── features-showcase.component.html
├── features-showcase.component.scss
└── sections/
    ├── searches-section.component.ts    # Search capabilities
    ├── tui-section.component.ts         # TUI capabilities
    ├── mcp-section.component.ts         # MCP tools by domain
    └── features-section.component.ts    # Feature inventory cards
```

## 4. Section Designs

### 4.1 Stats Bar (Top of Page)

A horizontal bar with live-fetched counts, displayed as compact stat pills:

```
┌────────────────────────────────────────────────────────────────────┐
│  auto_awesome System Showcase                                       │
│                                                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  30  │ │  12  │ │ 130+ │ │  4   │ │  6   │ │  20+ │           │
│  │Members│ │Sprints│ │Tools │ │Screens│ │Search │ │Routes│        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
└────────────────────────────────────────────────────────────────────┘
```

- Each pill: icon + count + label
- Counts fetched via parallel API calls on init
- Fallback to static defaults if API fails
- Color: `#64b5f6` for numbers, `rgba(255,255,255,0.45)` for labels

### 4.2 Searches Section

```
┌────────────────────────────────────────────────────────────────────┐
│  Search Capabilities                                                │
│                                                                     │
│  ┌────────────────────────┐  ┌────────────────────────────────┐   │
│  │  quick_reference        │  │  K-Picker                       │   │
│  │  Quick Open (Ctrl+P)   │  │  Ctrl+K                         │   │
│  │                        │  │                                 │   │
│  │  Navigate to any page  │  │  Multi-select team members     │   │
│  │  or team member        │  │  with fuzzy search             │   │
│  │                        │  │                                 │   │
│  │  13 pages indexed      │  │  Squad filter · Lead filter    │   │
│  │  + all active members  │  │  Recent selections (localStorage)│ │
│  │                        │  │  Single or multi-select mode   │   │
│  │  Keyboard navigation   │  │                                 │   │
│  │  Arrow keys · Enter    │  │  Used across all forms         │   │
│  │  Escape to close       │  │  and filter bars               │   │
│  └────────────────────────┘  └────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────┐  ┌────────────────────────────────┐   │
│  │  Filter Bar             │  │  Searchable Selects             │   │
│  │                        │  │                                 │   │
│  │  Column-based filtering│  │  Single-select with search     │   │
│  │  on data tables        │  │  Multi-select with chips       │   │
│  │                        │  │                                 │   │
│  │  Status · Assignee     │  │  Used in feature forms,        │   │
│  │  · Squad filters       │  │  sprint member selection,      │   │
│  │                        │  │  and meeting availability      │   │
│  │  @mention support      │  │                                 │   │
│  │  for assignee names    │  │  Fuzzy matching                │   │
│  └────────────────────────┘  └────────────────────────────────┘   │
│                                                                     │
│  Server-Side Filtering                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Team Members    role · teamLeadId · isActive                │  │
│  │  Sprints         piId · from date · to date                  │  │
│  │  Leave Records   teamMemberId · sprintId · from · to         │  │
│  │  Features        status · piId                               │  │
│  │  Retro Actions   sprintId                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Interaction:** Cards in a 2-column grid on desktop, single column on mobile. Server-side filtering shown as a compact table below.

### 4.3 TUI Section

```
┌────────────────────────────────────────────────────────────────────┐
│  Terminal UI (TUI)                                                  │
│                                                                     │
│  Framework: Textual (Python)  ·  Entry: python tui/app.py          │
│  API: TEAM_MANAGER_API_URL env var                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Screens                                                      │  │
│  │                                                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │  │
│  │  │ dashboard    │ │ feature     │ │ work_items  │            │  │
│  │  │             │ │ detail      │ │             │            │  │
│  │  │ Sprint      │ │ Work items  │ │ Member's    │            │  │
│  │  │ overview:   │ │ by status   │ │ work items  │            │  │
│  │  │ features,   │ │ tabs:       │ │ grouped by  │            │  │
│  │  │ blockers,   │ │ Planned     │ │ status      │            │  │
│  │  │ leave,      │ │ InProgress  │ │             │            │  │
│  │  │ unallocated │ │ Blocked     │ │             │            │  │
│  │  │             │ │ Done        │ │             │            │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │  │
│  │                                                               │  │
│  │  ┌─────────────┐                                             │  │
│  │  │ add_feature │                                             │  │
│  │  │             │                                             │  │
│  │  │ Modal dialog│                                             │  │
│  │  │ to create   │                                             │  │
│  │  │ new feature │                                             │  │
│  │  └─────────────┘                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Key Bindings                                                       │
│  ┌───────┬────────────────────────────────────────────────────┐    │
│  │  [ / ] │ Navigate between sprints                          │    │
│  │   n    │ Add new feature                                   │    │
│  │ Enter  │ Open feature detail / work items                  │    │
│  │   r    │ Refresh data                                      │    │
│  │  b/Esc │ Go back                                           │    │
│  │   q    │ Quit                                              │    │
│  └───────┴────────────────────────────────────────────────────┘    │
│                                                                     │
│  API Endpoints Used                                                 │
│  GET /api/v1/sprints                                                │
│  GET /api/v1/dashboard/sprint/{id}                                  │
│  GET /api/v1/dashboard/sprint/{id}/blockers                         │
│  GET /api/v1/dashboard/sprint/{id}/leave-summary                    │
│  GET /api/v1/sprint-members/{id}/work-items                         │
│  POST /api/v1/sprints/{id}/features                                 │
└────────────────────────────────────────────────────────────────────┘
```

**Interaction:** Screen cards in a horizontal scrollable row. Key bindings as a compact table. API endpoints as a code-style list.

### 4.4 MCP Section

```
┌────────────────────────────────────────────────────────────────────┐
│  Model Context Protocol (MCP) Server                                │
│                                                                     │
│  Server: mcp-server/server.py  ·  Transport: stdio                 │
│  Total: 130+ tools across 22 domains                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Tool Domains (expandable accordion)                          │  │
│  │                                                               │  │
│  │  ▼ Planning (24 tools)                          chevron_up   │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ list_pis              List all Program Increments      │  │  │
│  │  │ get_pi                Get a single PI by ID            │  │  │
│  │  │ create_pi             Create a new PI                  │  │  │
│  │  │ update_pi             Update an existing PI            │  │  │
│  │  │ delete_pi             Delete a PI                      │  │  │
│  │  │ list_sprints          List sprints, optionally filtered│  │  │
│  │  │ get_sprint            Get a sprint by ID               │  │  │
│  │  │ create_sprint         Create a new sprint              │  │  │
│  │  │ ...                   ...                              │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ▶ Team (12 tools)                            chevron_right  │  │
│  │  ▶ Meetings (35 tools)                        chevron_right  │  │
│  │  ▶ Personal (14 tools)                        chevron_right  │  │
│  │  ▶ Time (7 tools)                             chevron_right  │  │
│  │  ▶ Discussion (8 tools)                       chevron_right  │  │
│  │  ▶ Gamification (27 tools)                    chevron_right  │  │
│  │  ▶ System (9 tools)                           chevron_right  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Search tools: [___________________________]                        │
│                                                                     │
│  Each tool shows: name · description · required params              │
│  Mapped API endpoint shown on hover                                 │
└────────────────────────────────────────────────────────────────────┘
```

**Interaction:**
- Accordion-style expandable domains (only one open at a time)
- Search filter at top to find tools by name across all domains
- Each tool row: tool name (monospace), description, param count badge
- Hover reveals the mapped API endpoint as a tooltip
- Domain cards show tool count badge

**Domain breakdown (22 domains, 130+ tools):**

| Domain | Count | Key Tools |
|---|---|---|
| Planning | 24 | PIs, Sprints, Features, Work Items, Votes, Retro |
| Team | 12 | Members, Squads |
| Meetings | 35 | Series, Sessions, Types, Locations, Availability |
| Personal | 14 | Skills, Notes, Tasks, Timesheets, Config |
| Time | 7 | Leave records, import |
| Discussion | 8 | Points, Tasks |
| Gamification | 27 | Leaderboard, Achievements, Win Week, Win Month, Wheels |
| System | 9 | Dashboard, Export, Progress, Comments, Auth |

### 4.5 Features Section

```
┌────────────────────────────────────────────────────────────────────┐
│  System Features                                                    │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │  plan    │ │ sprint  │ │ people  │ │ groups  │ │ task_alt│    │
│  │  PIs     │ │ Sprints │ │  Team   │ │ Squads  │ │ Work    │    │
│  │          │ │         │ │ Members │ │         │ │ Items   │    │
│  │ 3 active │ │ 1 total │ │ 30 total│ │ 5 total │ │ 230 total│   │
│  │          │ │ active  │ │ 28 active│ │         │ │         │    │
│  │ → /sprints│ │        │ │ → /team │ │ → /team │ │ → /sprints│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │  event   │ │  forum  │ │ schedule│ │ event_  │ │ emoji_  │    │
│  │ Meetings │ │ Discuss │ │ Timeshts│ │ busy    │ │ events  │    │
│  │          │ │ Points  │ │         │ │ Leave   │ │         │    │
│  │ 4 series │ │ 8 points│ │ Config  │ │ Records │ │ Win Week│    │
│  │ 12 sess  │ │         │ │ per mem │ │ Import  │ │ /Month  │    │
│  │ → /meet  │ │ → /disc │ │ → /team │ │ → /leave│ │ → /fun  │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ leaderboard││ trophy │ │ casino  │ │ build   │ │ show_   │    │
│  │ Leaderbrd│ │ Achiev. │ │ Wheels  │ │ Export  │ │ Chart   │    │
│  │          │ │         │ │         │ │         │ │ Progress│    │
│  │ Points   │ │ 10 types│ │ 2 wheels│ │ PPTX    │ │ PI/Sprint│   │
│  │ rankings │ │         │ │         │ │ export  │ │ timeline│    │
│  │ → /fun   │ │ → /fun  │ │ → /fun  │ │ → /export│ │ → /prog │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                              │
│  │  comment │ │ settings│ │ lock    │                              │
│  │ Comments │ │ Session │ │ Auth    │                              │
│  │          │ │ Types   │ │         │                              │
│  │ On any   │ │ Config  │ │ API keys│                              │
│  │ entity   │ │ Locations│ │ Users  │                              │
│  │          │ │         │ │         │                              │
│  └─────────┘ └─────────┘ └─────────┘                              │
└────────────────────────────────────────────────────────────────────┘
```

**Interaction:**
- Cards in a responsive grid (5-col desktop, 3-col tablet, 2-col mobile)
- Each card: large icon, domain name, live stat badges, route link
- Cards are clickable → navigate to the relevant feature page
- Hover effect: subtle lift + background highlight
- Color-coded by domain group (Planning=blue, Team=green, Meetings=purple, Fun=orange, System=gray)

## 5. Data Models

```typescript
// showcase.model.ts

export interface SystemStats {
  teamMembers: number;
  activeMembers: number;
  sprints: number;
  activeSprints: number;
  pis: number;
  squads: number;
  features: number;
  workItems: number;
  meetingSeries: number;
  meetingSessions: number;
  discussionPoints: number;
  wheels: number;
  achievements: number;
  mcpTools: number;
  tuiScreens: number;
  searchComponents: number;
  uiRoutes: number;
}

export interface SearchCapability {
  name: string;
  icon: string;
  trigger: string;
  description: string;
  features: string[];
  details: string;
}

export interface TuiScreen {
  name: string;
  file: string;
  description: string;
  icon: string;
}

export interface TuiKeyBinding {
  key: string;
  action: string;
}

export interface McpDomain {
  name: string;
  icon: string;
  toolCount: number;
  tools: McpTool[];
}

export interface McpTool {
  name: string;
  description: string;
  requiredParams: string[];
  apiEndpoint: string;
  httpMethod: string;
}

export interface FeatureCard {
  domain: string;
  icon: string;
  color: string;
  route: string;
  stats: { label: string; value: string | number }[];
  description: string;
}
```

## 6. Tab Navigation Pattern

Follow the existing hub tab style from `fun-hub.component.ts` and `meetings-hub.component.ts`:

```scss
.showcase-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  overflow-x: auto;
  scrollbar-width: none;
}
.showcase-tab {
  padding: 12px 20px;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
}
.showcase-tab:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.04); }
.showcase-tab.active { color: #64b5f6; border-bottom-color: #64b5f6; }
```

## 7. Color Palette (Consistent with Existing App)

| Purpose | Color |
|---|---|
| Background | `#0f1923` |
| Card background | `rgba(255,255,255,0.03)` |
| Card border | `rgba(255,255,255,0.06)` |
| Accent / Active | `#64b5f6` |
| Accent background | `rgba(100,181,246,0.12)` |
| Primary text | `rgba(255,255,255,0.85)` |
| Secondary text | `rgba(255,255,255,0.45)` |
| Tertiary text | `rgba(255,255,255,0.25)` |
| Success | `#81c784` |
| Warning | `#ffb74d` |
| Error | `#ef5350` |

## 8. Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `> 1200px` | 5-column feature grid, 2-column search/MCP cards |
| `768-1200px` | 3-column feature grid, single-column sections |
| `< 768px` | 2-column feature grid, full-width cards, tabs scrollable |

## 9. Implementation Checklist

**Phase 1: Data & Models**
- [ ] Create `showcase.model.ts` with TypeScript interfaces
- [ ] Create `showcase-data.service.ts` with static inventories + live API calls
- [ ] Wire parallel API calls for stats on component init

**Phase 2: Main Component**
- [ ] Create `features-showcase.component.ts` with tab navigation + stats bar
- [ ] Add route to `app.routes.ts`: `{ path: 'showcase', loadComponent: ... }`
- [ ] Add navigation link to sidebar (`auto_awesome` icon)

**Phase 3: Section Components**
- [ ] Create `searches-section.component.ts` — 4 capability cards + server-side filter table
- [ ] Create `tui-section.component.ts` — screen cards + key bindings table + API endpoints
- [ ] Create `mcp-section.component.ts` — accordion domains with search filter
- [ ] Create `features-section.component.ts` — clickable feature cards in responsive grid

**Phase 4: Polish**
- [ ] Add search/filter within MCP tool list
- [ ] Add loading states for stats bar
- [ ] Add responsive layout for mobile
- [ ] Add keyboard navigation between tabs
