# UX: Meeting Planner & Catalog Rework

## Personas

| Persona | Role | Steps Involved |
|---------|------|---------------|
| **Senior Manager** | Creates the meeting series with available time slots | Step 1 |
| **Coordinator** (HR / Assistant) | Creates individual meeting items within the series and assigns participants | Step 2 |
| **Team Member** | Selects meetings they need to join and declares availability | Step 3 |

## User Journey

### Step 1 — Senior Manager: Create Meeting Series (ALREADY WORKS)

The existing Meeting Planner (`/meetings`) handles this. No changes needed. The senior manager:
1. Navigates to `/meetings`
2. Clicks "Create Session"
3. Selects slot duration, meeting type, date/time slots from the weekly grid, assigns locations
4. Sets a title and creates the session

**But:** Step 1 in the new flow is slightly different — the senior manager creates a "series" (a container), not just a single meeting. The existing `SessionCatalog` create flow is a better starting point for this.

**UX Decision:** Create a new **Meeting Series** entry point separate from both the Meeting Planner and the Catalog. The series creation uses the existing booking-grid component but for the purpose of defining availability windows.

#### `/meeting-series/list` — Series List Page

```
┌─────────────────────────────────────────────────┐
│  Meeting Series            [+ Create Series]    │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │ Performance Reviews Q2 2026        Status   │ │
│  │ 8 slots · 5 items · 2 confirmed    Active   │ │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░              │ │
│  │ Created by Sarah Chen · May 13, 2026       │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │ 1:1 Check-ins Q3 2026              Inactive │ │
│  │ 12 slots · 0 items · 0 confirmed            │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░              │ │
│  │ Created by Sarah Chen · May 10, 2026       │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  + [Create Series]                               │
└─────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Centered spinner
- **Empty:** "No meeting series yet. Create the first series to start coordinating sessions." + Create button
- **Error:** Error message + Retry button
- **List:** Cards with title, stats (slots/items/confirmed), progress bar, created-by, date, status badge
- **Delete:** Confirm dialog before deletion

#### `/meeting-series/create` — Create Series (Step 1)

Reuses the existing meeting-create-page pattern:
1. **Name + Description** — Text fields
2. **Slot Duration** — Chip selector (15m, 30m, 45m, 60m, 90m)
3. **Time Grid** — Weekly grid (Mon–Fri, 7am–5pm, 30min increments). Click cells to mark availability. Active location chip determines location per slot.
4. **Create** — Submits series with slots

**Empty state (no slots selected):** "Select at least one time slot to continue" below Create button.
**Error state:** Red error banner if API fails.

### Step 2 — Coordinator: Create Meeting Items

#### `/meeting-series/:id` — Series Detail Page

```
┌─────────────────────────────────────────────────┐
│  ← Back to Series                              │
│                                                  │
│  Performance Reviews Q2 2026                     │
│  Created by Sarah Chen · May 13, 2026            │
│  [Edit] [Delete]                                 │
│                                                  │
│  ┌─ Slots ──────────────────────────────────┐   │
│  │                                           │   │
│  │ Mon May 18  09:00–09:30  📍 Remote    [X] │   │
│  │ Mon May 18  09:30–10:00  📍 Remote    [X] │   │
│  │ Tue May 19  10:00–11:00  📍 OnSite    [X] │   │
│  │ ...                                        │   │
│  │                             [+ Add Slot]   │   │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Meeting Items ──────────────────────────┐   │
│  │                        [+ Create Item]    │   │
│  │                                           │   │
│  │  ⬜ Review: Alice Jones           Pending  │   │
│  │     Mandatory: Alice, Bob                 │   │
│  │     Optional: Charlie                     │   │
│  │     0/2 mandatory filled                  │   │
│  │                                           │   │
│  │  ✅ Review: Charlie Brown      Confirmed  │   │
│  │     Mandatory: Charlie, Dana              │   │
│  │     Optional: Eve                         │   │
│  │     ✓ Tue May 19, 10:00–11:00 (OnSite)    │   │
│  │     2/2 mandatory filled                  │   │
│  │                                           │   │
│  │  ⬜ Review: Dana Scully           Pending  │   │
│  │     Mandatory: Dana, Frank                │   │
│  │     1/2 mandatory filled                  │   │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Centered spinner
- **Not found:** "Series not found" + Back button
- **Slots empty:** "No availability slots defined yet. Add slots so team members can indicate their availability." + Add Slot button
- **Items empty:** "No meeting items yet. Create individual meetings and assign participants." + Create Item button

#### `/meeting-series/:id/items/create` — Create Meeting Item (Step 2)

```
┌─────────────────────────────────────────────────┐
│  ← Back to Series                               │
│                                                  │
│  Create Meeting Item                             │
│  Series: Performance Reviews Q2 2026             │
│                                                  │
│  ┌─ Basic Info ─────────────────────────────┐   │
│  │  Title: [Review: Alice Jones          ]   │   │
│  │  Duration: [30m] (optional, hint only)     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─ Mandatory Participants ───────────────┐   │
│  │  [Alice] [Bob] [Charlie] [Dana] [Eve]   │   │
│  │  Selected: Alice ×  Bob ×              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─ Optional Participants ────────────────┐   │
│  │  [Alice] [Bob] [Charlie] [Dana] [Eve]   │   │
│  │  Selected: Charlie ×                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Cancel]  [Create Item]                        │
└─────────────────────────────────────────────────┘
```

**Interaction:**
- Click a member chip to toggle between unselected → mandatory → optional → unselected (cycling colors: default → blue → green → default)
- Or: two separate sections (mandatory and optional) with independent toggles
- **Validation:** At least one mandatory participant required

**Empty state (no members loaded):** "Could not load team members" + Retry
**Error state:** Red error if save fails

#### `/meeting-series/:id/items/:itemId` — Meeting Item Detail

```
┌─────────────────────────────────────────────────┐
│  ← Back to Series                               │
│                                                  │
│  Review: Alice Jones                             │
│  Series: Performance Reviews Q2 2026             │
│  Status: Pending  [Edit] [Delete]                │
│                                                  │
│  Participants:                                   │
│  ● Mandatory: Alice Jones, Bob Smith             │
│  ○ Optional: Charlie Brown                       │
│                                                  │
│  ┌─ Availability Matrix ───────────────────┐    │
│  │                                         │    │
│  │           Alice    Bob    Charlie       │    │
│  │ Mon 18 9:00  ✓              ✓          │    │
│  │ Mon 18 9:30         ✓                  │    │
│  │ Tue 19 10:00  ✓      ✓       ✓         │ ←  │
│  │ Wed 20 11:00         ✓                  │ALL │
│  │ Wed 20 14:00  ✓                        │    │
│  │                              ⭐ CONFIRM  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Confirmed: Not yet                              │
└─────────────────────────────────────────────────┘
```

**States:**
- **No availabilities yet:** Empty matrix with "No team members have added their availability yet. They'll appear here once they select their preferred slots."
- **Partial fill:** Show checkmarks, highlight rows where all mandatory participants are available
- **Confirmed:** "🎉 Confirmed! Meeting created: [link to MeetingSession]"
- **Error:** Error if confirmation sync fails

### Step 3 — Team Member: Select & Add Availability

A team member needs two views:
1. **My Meetings** — list of meeting items they're part of (across all series)
2. **Item Availability** — for a specific item, pick which slots they're available for

#### `/my-meetings` — My Meetings Dashboard

```
┌─────────────────────────────────────────────────┐
│  My Meetings                                     │
│                                                  │
│  Performance Reviews Q2 2026                     │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  ⬜ Review: Alice Jones                     │ │
│  │     Role: Mandatory  [Set Availability →]   │ │
│  │                                                  │
│  │  ✅ Review: Charlie Brown                  │ │
│  │     Role: Optional  ✓ Availability set      │ │
│  │     Waiting for mandatory participants...    │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  1:1 Check-ins Q3 2026                           │
│  ┌─────────────────────────────────────────────┐ │
│  │  ⬜ Check-in: Bob Smith                     │ │
│  │     Role: Mandatory  [Set Availability →]   │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Centered spinner
- **No items assigned:** "You haven't been added to any meeting items yet." (informational)
- **All resolved:** "All your meetings are confirmed! No action needed."
- **Error:** Error + Retry

#### `/my-meetings/items/:itemId/availability` (or via the item detail page) — Set Availability (Step 3)

```
┌─────────────────────────────────────────────────┐
│  ← Back to My Meetings                          │
│                                                  │
│  Review: Alice Jones                             │
│  Series: Performance Reviews Q2 2026             │
│  Your role: Mandatory                           │
│                                                  │
│  Select the time slots that work for you:        │
│                                                  │
│  ┌─ Available Slots ───────────────────────┐    │
│  │  ☐ Mon May 18  09:00–09:30  Remote      │    │
│  │  ☑ Mon May 18  09:30–10:00  Remote      │    │
│  │  ☐ Tue May 19  10:00–11:00  OnSite     │    │
│  │  ☐ Wed May 20  11:00–12:00  Remote     │    │
│  │  ☑ Wed May 20  14:00–14:30  Hybrid     │    │
│  │                                          │    │
│  │  You selected 2 slots                    │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
│  [Save Availability]                              │
└─────────────────────────────────────────────────┘
```

**States:**
- **Loading:** Centered spinner
- **No slots in series:** "No availability slots have been defined for this series yet. Check back later."
- **Saved successfully:** Snackbar "Availability saved!" + confirmation checkmarks update
- **Error:** Red error + Retry

## Navigation Flow

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Navigation  │     │  Series List     │     │  Create Series       │
│  Sidebar     │────>│  /meeting-series │────>│  /meeting-series/    │
│  [Meeting    │     │                  │     │  create               │
│   Series]    │     │  [Click card]    │     │                      │
│              │     │        │         │     └──────────────────────┘
│              │     │        v         │
│              │     │  ┌──────────────┐│
│              │     │  │ Series Detail││
│              │     │  │ /:id        ││
│              │     │  └──┬────┬─────┘│
│              │     │     │    │      │
│              │     │     │    │      │
│              │     │     v    v      │
│              │     │  Items  Slots   │
│              │     │  /:id/  /:id/   │
│              │     │  items  slots   │
│              │     │                  │
│              │     │  [Click item]   │
│              │     │        │         │
│              │     │        v         │
│              │     │  ┌──────────────┐│
│              │     │  │ Item Detail ││
│              │     │  │ /:id/       ││
│              │     │  │ items/:id    ││
│              │     │  └──────┬──────┘│
│              │     │         │        │
│              │     │         │        │
│              │     └─────────┼────────┘
│              │               │
│              │               v
│  [My         │     ┌──────────────────┐
│   Meetings]  │     │  My Meetings     │
│              │────>│  /my-meetings    │
│              │     │                  │
│              │     │  [Click item]   │
│              │     │        │         │
│              │     │        v         │
│              │     │  ┌──────────────┐│
│              │     │  │ Set Avail.   ││
│              │     │  │ /:id/        ││
│              │     │  │ items/:id/   ││
│              │     │  │ availability ││
│              │     │  └──────────────┘│
└──────────────┘     └──────────────────┘
```

## Sidebar Navigation

Add two new links:

```
🗓 Meetings           — existing, /meetings
📋 Meeting Series     — new, /meeting-series
📋 My Meetings        — new, /my-meetings
📚 Session Catalog    — existing, /catalog
```

## Reused UI Patterns

| Pattern | Component | Used In |
|---------|-----------|---------|
| Weekly time grid | `BookingGridComponent` | Create series slots |
| Member toggle chips | Chip patterns from `SessionCatalogCreateComponent` | Create item participants, set availability |
| Session card | Card from `SessionCatalogComponent` | Series list |
| Progress bar | Progress bar from `MeetingPlannerComponent` | Series list cards |
| Load/error/empty | Signal-based state patterns throughout | All new components |
| Confirm dialog | `ConfirmDialogComponent` | Delete confirmations |
| Status badges | Badge patterns from meeting detail | Series status, item status |
| Breadcrumb nav | Pattern from `SessionCatalogDetailComponent` | Series detail, item detail |

## Confirmation Flow

Auto-confirmation happens server-side. The UI reflects it:

1. **Coordinator view** (series detail): Item shows "Confirmed" badge + linked meeting session
2. **Team member view**: Item shows "✅ All set!" or "⏳ Waiting for [name]" to indicate which mandatory participants haven't set availability
3. **Senior manager view**: See which items are confirmed with linked meetings

When a slot is confirmed:
- The item card shows `✅ Confirmed: Mon May 18, 09:30–10:00 (Remote)`
- A link to the generated MeetingSession appears

When a mandatory participant removes availability:
- The item reverts to "Pending"
- Any linked MeetingSession is deleted
- UI updates in real-time on next load

## Error & Edge Cases

| Scenario | UX Handling |
|----------|------------|
| Series with no slots | Show empty state, prompt to add slots |
| Item with no mandatory participants | Block creation: "At least one mandatory participant required" |
| Participant removed while confirming | Confirm dialog warning |
| Series deleted with confirmed items | Cascade — warn: "This will delete X confirmed meetings" |
| Network failure on availability save | Snackbar error + retry |
| Duplicate availability (same slot+item+member) | Server returns error; UI shows "Already selected" |
| All mandatory participants set availability to different slots | None gets confirmed; show availability matrix so coordinator can see the conflict |
| Member not found in participant list | Redirect to my-meetings with error snackbar |
