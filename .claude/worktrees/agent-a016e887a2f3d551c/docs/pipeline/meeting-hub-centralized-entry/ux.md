# UX Design: Meeting Hub — Centralized Meeting Entry Points

## User Flow

### Before (Current)
1. User sees 3 separate nav items: "Meetings", "Meeting Series", "My Meetings"
2. Clicking each navigates to a completely different screen with its own header, layout, and context
3. To go from viewing sessions to checking their own meetings, user must:
   - Click sidebar → "My Meetings"
   - Wait for page load
   - See completely different layout
4. Locations config is hidden in secondary nav (reduced opacity)

### After (Proposed)
1. User sees 1 nav item: "Meetings"
2. Clicking opens the Meetings Hub with tabs
3. Default tab is "Sessions" (current meeting planner)
4. User clicks "Series" tab → content swaps in-place, no full page reload feel
5. User clicks "My Meetings" tab → sees their assigned meetings
6. User clicks "My Series" tab → sees their series
7. User clicks "Locations" tab → manages meeting locations
8. All within the same visual context — consistent header area, same scroll position preserved per-tab

## Screen Layout

### Desktop (≥768px)

```
┌──────────────────────────────────────────────────────────────┐
│  Meetings                                                    │  ← Page header (consistent across all tabs)
├──────────────────────────────────────────────────────────────┤
│ [Sessions]  [Series]  [My Meetings]  [My Series]  [Locations]│  ← Tab bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                    Tab Content Area                          │
│              (router-outlet loads here)                      │
│                                                              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────────┐
│  Meetings               │
├─────────────────────────┤
│ [Sessions] [Series]...  │  ← Horizontally scrollable tabs
├─────────────────────────┤
│                         │
│   Tab Content           │
│                         │
│                         │
└─────────────────────────┘
```

## Tab Bar Design

### Visual Style
- **Background:** Transparent (inherits page background)
- **Border:** Bottom border `1px solid rgba(255,255,255,0.08)`
- **Tab padding:** `12px 16px`
- **Tab font:** 0.85rem, weight 500
- **Active tab:** Bottom border `2px solid #64b5f6`, text color `#64b5f6`
- **Inactive tab:** Text color `rgba(255,255,255,0.45)`, transparent bottom border
- **Hover (desktop):** Background `rgba(255,255,255,0.04)`, text color `rgba(255,255,255,0.75)`

### Tab Order & Rationale

| Tab | Route | Rationale |
|-----|-------|-----------|
| Sessions | `sessions` | Primary workflow — creating and managing individual sessions |
| Series | `series` | Secondary workflow — coordinated scheduling |
| My Meetings | `my-meetings` | Personal view — most frequently accessed by regular users |
| My Series | `my-series` | Personal view — less frequently accessed |
| Locations | `locations` | Admin config — least frequently accessed |

### Active Tab Behavior
- Tab is highlighted via `routerLinkActive="active"`
- Content loads via lazy-loaded router outlet
- Browser URL updates (shareable/bookmarkable)
- Back button navigates to previous tab

### Mobile Tab Behavior
- Tabs scroll horizontally with `overflow-x: auto`
- No scrollbar visible (`scrollbar-width: none` / `::-webkit-scrollbar { display: none }`)
- Active tab is always visible — scroll into view on activation
- Touch-friendly: minimum 44px touch target height

## Content Area

Each tab loads its existing component with minimal changes:

### Sessions Tab
- Current meeting planner list view
- "Create Session" button in top-right
- Filter tabs (All / Open) remain
- Session cards with progress bars

### Series Tab
- Current meeting series list view
- "Create Series" button + "Locations" button in header
- Series cards with progress bars
- Click navigates to series detail (still within hub context)

### My Meetings Tab
- Current my-meetings view
- Grouped by series
- "Set Availability" button per series (not per item)

### My Series Tab
- Current my-meeting-series view
- Series cards with open/confirmed counts
- "Set Availability" and "View Series" buttons

### Locations Tab
- Current slot-locations CRUD view
- Add/edit/delete locations
- Color picker, active/inactive toggle

## Interaction Details

### Tab Switching
- **Click:** Immediate navigation, content loads with spinner if lazy module not yet cached
- **Keyboard:** Arrow keys navigate between tabs (left/right), Enter/Space activates
- **Scroll position:** Each tab maintains its own scroll position (browser default behavior with separate routes)

### Deep Linking
- Each tab has a shareable URL: `/meetings/sessions`, `/meetings/series`, etc.
- Opening a deep link loads the hub and activates the correct tab
- Series detail pages remain at `/meetings/series/:id` (nested under hub)

### Empty States
Each tab preserves its existing empty state:
- Sessions: "No meeting sessions yet" + Create button
- Series: "No meeting series yet" + Create button
- My Meetings: "No meetings assigned"
- My Series: "No meeting series assigned"
- Locations: "No locations configured" + Add button

## Edge Cases

### No Tabs Visible?
Not possible — at minimum Sessions tab always shows.

### Tab Content Too Wide?
Existing components already handle responsive width (max-width: 900px centered). No change needed.

### User Has No Permission for Locations?
Locations tab still shows but content displays "You don't have permission to manage locations." (future enhancement — for now all users can access).

### Browser Back Button
- Navigates through tab history correctly
- Going back from `/meetings/series` → `/meetings/sessions` works as expected
- Going back from `/meetings/series/:id` → `/meetings/series` → `/meetings/sessions` works

## Visual States

| State | Tab Style |
|-------|-----------|
| Default (inactive) | `color: rgba(255,255,255,0.45)`, no bottom border |
| Hover (desktop) | `color: rgba(255,255,255,0.75)`, `background: rgba(255,255,255,0.04)` |
| Active | `color: #64b5f6`, `border-bottom: 2px solid #64b5f6` |
| Focus (keyboard) | `outline: 2px solid #64b5f6`, `outline-offset: -2px` |

## Migration UX

### First Visit After Update
- Users with bookmarks to `/meeting-series` are redirected to `/meetings/series`
- The redirect is seamless — same content, just under new URL
- Tab bar shows "Series" as active
- No visual indication that a redirect occurred

### Sidebar Change
- Sidebar now shows 1 "Meetings" entry instead of 3
- Users who previously used "My Meetings" will find it under Meetings > My Meetings tab
- This is a discoverability change — users may need to learn the new structure
- Mitigation: The tab labels are clear and match the old nav labels
