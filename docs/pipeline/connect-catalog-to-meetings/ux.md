# Connect Catalog to Meetings — UX Document

## Design System Conventions

This document extends the conventions from the catalog + meeting planner UIs:
- **Background**: `#0f1117`, text `#e0e0e0`, Geist font
- **Cards**: `.section` panels with `rgba(255,255,255,0.03)` background and `rgba(255,255,255,0.06)` border
- **Chips**: Pill-style `.chip` with role-based dot colors
- **Badges**: `.status-badge` — `.status-open` (green), `.status-filled` (blue), `.status-cancelled` (gray), `.status-confirmed` (gold)
- **Catalog badge**: `.catalog-badge` — new purple indicator for catalog-originated meetings
- **Links**: `color:#64b5f6` with hover underline
- **Progress bar**: 3px tall, `rgba(100,181,246,0.5)` fill
- **Actions**: `mat-stroked-button` / `mat-raised-button color="primary"`, Material Icons

---

## 1. User Flow Diagrams

### End-to-End Flow

```
[ /catalog ]                         [ /meetings ]
    │                                     │
    │  1. Lead creates catalog item       │
    │  (name, desc, participants)         │
    │  No time — only roles.              │
    │                                     │
    ▼                                     │
[ /catalog/:id/slots ]                   │
    │                                     │
    │  2. Lead creates time windows       │
    │  (date, start/end, location)        │
    │                                     │
    ▼                                     │
[ /catalog/:id/book ]                    │
    │                                     │
    │  3. Members self-service book       │
    │  slots until mandatory fill met     │
    │                                     │
    ▼                                     │
[ Auto-bridge ] ──────────────────────►  │
    │  4. Slot.IsConfirmed = true          │
    │     → MeetingSession created         │
    │     → Appears in planner             │
    │     → Linked via FKs                 │
    │                                     │
    │  5. Unbooking breaks mandatory      │
    │     → MeetingSession deleted         │
    │     → Disappears from planner        │
    ▼                                     ▼
[ /catalog/:id ]                     [ /meetings/:id ]
    │  "View Meeting" link                │  "View in Catalog" link
    └─────────────────────────────────────┘
```

### Auto-Bridge Detail (Step 4, Server-Side, No Dedicated Screen)

```
┌───────────────────────────────────────────────────────────────┐
│ SessionDefinitionSlot                                          │
│  · isConfirmed = true                                          │
│  · all mandatory participants have booked                      │
│                                                               │
│  Bridging logic fires synchronously:                           │
│                                                               │
│  → CREATE MeetingSession                                       │
│      · title   = SessionDefinition.Name                        │
│      · date    = slot.Date                                     │
│      · time    = slot.StartTime – slot.EndTime                 │
│      · loc     = ResolveMeetingLocation(slot.Location)         │
│      · status  = Filled                                        │
│      · SessionDefinitionSlotId = slot.Id                       │
│      · SessionDefinitionId     = slot.SessionDefinitionId      │
│                                                               │
│  → CREATE MeetingSlot (× N mandatory participants)             │
│      · each linked to a SessionDefinitionBooking               │
│      · TeamMemberId assigned                                   │
│      · Date/Time/Location copied from slot                     │
│                                                               │
│  → Meeting appears in /meetings list                           │
│  → Catalog detail shows "View Meeting" link                    │
└───────────────────────────────────────────────────────────────┘
```

### Unbooking / Tear-Down Flow

```
┌───────────────────────────────────────────────────────────────┐
│ Slot was confirmed → MeetingSession existed                    │
│                                                               │
│  Mandatory participant unbooks:                                │
│                                                               │
│  → isConfirmed flips to false                                  │
│  → Bridging logic deletes the MeetingSession                   │
│     (cascade deletes MeetingSlots)                             │
│  → Meeting disappears from /meetings list                      │
│  → Catalog detail removes "View Meeting" link                  │
│                                                               │
│  Later: another mandatory participant books                    │
│  → isConfirmed flips to true                                   │
│  → NEW MeetingSession created (fresh)                          │
└───────────────────────────────────────────────────────────────┘
```

### Slot Edit Flow (Lead Changes Time/Location After Confirmation)

```
┌───────────────────────────────────────────────────────────────┐
│ Slot was confirmed → MeetingSession exists                     │
│                                                               │
│  Lead updates slot date/time/location:                         │
│  → Bridging logic updates MeetingSession fields                │
│     (date, startTime, endTime, location)                       │
│  → Child MeetingSlots updated with new date/time               │
│  → Meeting planner reflects changes in real time               │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Wireframe Descriptions

### 2A. Meeting Planner List Page (`/meetings`) — Catalog Badge

```
┌────────────────────────────────────────────────────────────┐
│  Meeting Planner                          [+ Create Session] │
│                                                              │
│  [All] [Open] [My Sessions]                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Sprint Planning                 Discussion  [Filled]    ││
│  │  Mon, May 18 · 09:00–10:00 · 🏢 OnSite                  ││
│  │  · 4/4 slots filled · Created by Alice                   ││
│  │  📋 From Catalog: Sprint Planning    [View in Catalog →] ││
│  │  ▓▓▓▓▓▓▓▓▓▓  (100%)                       [🗑]         ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Standup                          Standup    [Open]      ││
│  │  Tue, May 19 · 09:15–09:30 · 🏢 OnSite                   ││
│  │  · 2/3 slots filled · Created by Bob                     ││
│  │  (no catalog badge — created directly in planner)        ││
│  │  ▓▓▓▓▓▓░░░░  (66%)                           [🗑]       ││
│  └──────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

**Changes from current:**
- When `session.sessionDefinitionName` is present, a `.catalog-badge` line appears below the metadata:
  - Purple pill `📋 From Catalog: {name}` — links to `/catalog/{sessionDefinitionId}`
  - `[View in Catalog →]` link — same destination, text style
- If the session was created directly in the planner (no `sessionDefinitionId`), no badge is shown — same as current behavior
- The delete button remains; deleting a catalog-originated meeting from the planner does NOT delete the catalog item (FK is `SetNull` on the meeting side)

**Empty state (no meetings at all):**
```
          [📅 event icon]
     No meeting sessions yet
  Create the first session to get started!
      [+ Create Session]
```

**Empty state (filtered — no catalog-originated meetings):**
When filtering by catalog origin (future enhancement), show a subdued empty state. For now, all meetings simply show or hide the badge based on data.

### 2B. Meeting Detail Page (`/meetings/:id`) — Catalog Link

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Meetings                                        │
│                                                             │
│  Sprint Planning             Discussion  [Filled]           │
│  ──────────────────────────────────────────                  │
│  Mon, May 18, 2026 · 09:00 – 10:00 · 🏢 OnSite             │
│  Created by Alice                                           │
│                                                             │
│  ┌─ CATALOG ORIGIN ──────────────────────────────────────┐  │
│  │  📋 This meeting was created from the catalog session  │  │
│  │  "Sprint Planning".                                    │  │
│  │                                                         │  │
│  │  [View in Catalog →]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ DESCRIPTION ──────────────────────────────────────────┐  │
│  │  Plan the upcoming sprint backlog                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  [Edit] [Cancel Session] [Delete]                           │
│                                                             │
│  ┌─ TEAM MEMBERS (4/4 filled) ────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ [A] Alice                                         │  │  │
│  │  │   (You) — Meeting slot assigned from catalog      │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ [B] Bob                                           │  │  │
│  │  │   — Meeting slot assigned from catalog            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ [C] Charlie                                       │  │  │
│  │  │   — Meeting slot assigned from catalog            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ [D] David                                         │  │  │
│  │  │   — Meeting slot assigned from catalog            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Changes from current:**
- New **Catalog Origin** section appears between the header and the description when `sessionDefinitionId` is present
- Shows 📋 icon + "This meeting was created from the catalog session \"{name}\"."
- `[View in Catalog →]` link → `/catalog/{sessionDefinitionId}`
- If the meeting is not catalog-originated, this entire section is hidden — no change to existing behavior
- The description is copied from the catalog item at creation time; edits in the catalog are not synced

**States:**
- **Loading:** Full-page `mat-spinner` (unchanged)
- **Not found:** "Session not found" (unchanged)
- **Catalog origin present:** Purple `.origin-banner` shown
- **Catalog origin absent:** No banner, no change

### 2C. Catalog Detail Page (`/catalog/:id`) — Connected Meeting Link

```
┌────────────────────────────────────────────────────────────┐
│  Catalog › Sprint Planning                                  │
│                                                             │
│  Sprint Planning                              [Delete]     │
│  ──────────────────────────────────────────                  │
│  Plan the upcoming sprint backlog                           │
│  Created by Alice · May 13, 2026                            │
│                                                             │
│  ┌─ PARTICIPANTS ────────────────────────────────────────┐  │
│  │  🔵 Mandatory (4)   [Alice] [Bob] [Charlie] [David]   │  │
│  │  🟢 Optional (2)    [Diana] [Eve]                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ SLOTS ───────────────────────────────────────────────┐  │
│  │  3 slots · 4/4 mandatory filled                       │  │
│  │                                                         │  │
│  │  [Create Slots]  [Book Slots]                          │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────┐          │  │
│  │  │  Mon May 18 · 09:00–09:30 · Room A       │          │  │
│  │  │  4/4 mandatory — 4 booked  ✓ Confirmed   │          │  │
│  │  │  🔗 Meeting Created → [View Meeting]     │  ← NEW   │  │
│  │  ├──────────────────────────────────────────┤          │  │
│  │  │  Mon May 18 · 10:00–10:30 · Room B       │          │  │
│  │  │  2/4 mandatory — 2 booked                │          │  │
│  │  │  (not yet confirmed — no meeting)        │          │  │
│  │  └──────────────────────────────────────────┘          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ CONNECTED MEETINGS ───────────────────────────────────┐  │
│  │  ✅ 1 meeting created from this catalog's slots:       │  │
│  │                                                         │  │
│  │  Sprint Planning · Mon, May 18 · 09:00–10:00 · Room A  │  │
│  │  Status: Filled · Type: Discussion                      │  │
│  │                                                         │  │
│  │  [View Meeting →]                                       │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Changes from current:**
- Each confirmed slot row adds a "🔗 Meeting Created → [View Meeting]" link below the status badge
- New **Connected Meetings** section at the bottom (below slots) lists all meetings spawned from this catalog item
- The section shows: number of connected meetings, each with title, date, time, location, status, type
- `[View Meeting →]` link → `/meetings/{meetingSessionId}`
- If no slots are confirmed yet, the Connected Meetings section shows an empty state

**Connected Meetings section — empty state:**
```
┌─ CONNECTED MEETINGS ──────────────────────────────────────┐
│  No meetings created yet.                                   │
│  Meetings auto-appear here once all mandatory participants  │
│  have booked a slot.                                        │
└────────────────────────────────────────────────────────────┘
```

**Connected Meetings section — multiple confirmed slots:**
```
┌─ CONNECTED MEETINGS (2) ─────────────────────────────────┐
│  ✅ 2 meetings created from this catalog's slots:          │
│                                                             │
│  1. Sprint Planning · Mon, May 18 · 09:00–10:00 · Room A   │
│     Status: Filled · Type: Discussion                       │
│     [View Meeting →]                                        │
│                                                             │
│  2. Sprint Planning · Wed, May 20 · 14:00–15:00 · Room B   │
│     Status: Filled · Type: Discussion                       │
│     [View Meeting →]                                        │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Model

### Cross-Domain Navigation

```
              ┌────────────────────────────┐
              │     Session Catalog         │
              │     /catalog                │
              └──────────┬─────────────────┘
                         │ Click slot's "View Meeting"
                         ▼
              ┌────────────────────────────┐
              │     Meeting Planner         │
              │     /meetings               │
              └──────────┬─────────────────┘
                         │ Click "View in Catalog"
                         ▼
              ┌────────────────────────────┐
              │     Session Catalog         │
              │     /catalog/:id            │
              └────────────────────────────┘
```

### Navigation Elements Per Page

| Page | New Element | Destination | Trigger |
|------|-------------|-------------|---------|
| `/meetings` (list) | `.catalog-badge` pill | `/catalog/{sessionDefinitionId}` | Click badge or "View in Catalog →" link |
| `/meetings/:id` (detail) | `.origin-banner` section | `/catalog/{sessionDefinitionId}` | Click "View in Catalog →" link |
| `/catalog/:id` (detail) | Slot-level "View Meeting" link | `/meetings/{meetingSessionId}` | Click "View Meeting →" per confirmed slot |
| `/catalog/:id` (detail) | Connected Meetings section | `/meetings/{meetingSessionId}` | Click "View Meeting →" in section |
| `/catalog/:id` (detail) | `GET /api/v1/session-definitions/{id}/connected-meeting` endpoint | (data source) | On page load |

### Route Map (No New Routes)

No new frontend routes are needed. All changes are additive UI elements on existing pages:

```
/meetings                    → Meeting planner list     (+ catalog badge)
/meetings/:id                → Meeting detail           (+ origin banner, catalog link)
/catalog                     → Catalog list             (no changes)
/catalog/:id                 → Catalog detail           (+ connected meeting link)
/catalog/:id/slots           → Lead slot creation       (no changes)
/catalog/:id/book            → Self-service booking     (no changes)
```

### Link Visual Pattern

All cross-domain links follow the same pattern:
```
[View in Catalog →]     color: #64b5f6, font-size: 0.78rem, arrow icon
[View Meeting →]        color: #64b5f6, font-size: 0.78rem, arrow icon
```

The arrow `→` is rendered as the Material `arrow_forward` icon (18px) or the `→` unicode character. Consistent right-arrow suffix signals "navigate to related entity."

---

## 4. States

### Meeting Planner List (`/meetings`) — Catalog Badge States

| State | Condition | Visual |
|-------|-----------|--------|
| **Has catalog origin** | `sessionDefinitionId != null` | Purple `.catalog-badge` shown with 📋 icon + session name. `[View in Catalog →]` link visible. |
| **No catalog origin** | `sessionDefinitionId == null` | No badge — same as current behavior |
| **Deleted catalog item** | Catalog item deleted but meeting still exists | Badge still shows `sessionDefinitionName` (copied at creation). Link goes to 404 — handle gracefully (see below) |
| **Orphaned link** (catalog deleted) | Meeting exists, but FK'd catalog is gone | Badge shows name but link is disabled or shows muted text "From Catalog (deleted)" — same style but without link |

### Meeting Detail (`/meetings/:id`) — Catalog Origin Banner States

| State | Condition | Visual |
|-------|-----------|--------|
| **Has catalog origin** | `sessionDefinitionId != null` | Purple `.origin-banner` with 📋 + message + `[View in Catalog →]` link |
| **No catalog origin** | `sessionDefinitionId == null` | Banner hidden |
| **Loading** | Data being fetched | Banner not rendered until after load (spinner shown) |
| **Error** | API fails | Snackbar error, no banner shown |
| **Orphaned link** | Catalog item deleted | Banner shows the name but the link is replaced with muted text |

### Catalog Detail (`/catalog/:id`) — Connected Meeting States

| State | Condition | Visual |
|-------|-----------|--------|
| **No slots** | `slots.length === 0` | Connected Meetings section: empty state "No meetings created yet." |
| **Slots exist, none confirmed** | No slot has `isConfirmed === true` | Connected Meetings section: empty state |
| **Single confirmed slot** | One slot has `isConfirmed === true` | Connected Meetings section: single meeting listed. Slot row shows "View Meeting" link. |
| **Multiple confirmed slots** | Multiple slots confirmed | Connected Meetings section: all listed. Each confirmed slot row shows "View Meeting" link. |
| **Loading** | Page loading | Full-page spinner, section not rendered yet |
| **Error** | API fails for `connected-meeting` endpoint | Snackbar error, section shows "Could not load connected meetings. [Retry]" |
| **Slot unconfirmed** | Slot was confirmed, then unbooked | Meeting deleted → section updates. Slot row removes "View Meeting" link. |
| **Meeting deleted from planner** | User deleted meeting from `/meetings` | FK is SetNull. Slot no longer has a connected meeting. Section updates on next load. |

### Slot Row States (Catalog Detail)

```
┌──────────────────────────────────────────────────────────────┐
│ Slot states within the slot list on /catalog/:id              │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ Confirmed slot:                                      │      │
│ │   Mon May 18 · 09:00–09:30 · Room A                  │      │
│ │   4/4 mandatory — 4 booked  ✓ Confirmed              │      │
│ │   🔗 Meeting Created → [View Meeting]                │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ Unconfirmed slot:                                    │      │
│ │   Mon May 18 · 10:00–10:30 · Room B                  │      │
│ │   2/4 mandatory — 2 booked  ⚠ 2 more needed         │      │
│ │   (no meeting link — not yet confirmed)              │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ Empty slot (no bookings):                            │      │
│ │   Mon May 18 · 11:00–11:30 · Room C                  │      │
│ │   0/4 mandatory — 0 booked   (no badge)              │      │
│ └─────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Error Handling for Orphaned References

If the catalog item is deleted after a meeting was created from it:

**On `/meetings/:id` (detail):**
```
┌─ CATALOG ORIGIN ──────────────────────────────────────────┐
│  📋 This meeting was created from a catalog session        │
│  "(deleted)".                                              │
│  (no link — source no longer available)                    │
└────────────────────────────────────────────────────────────┘
```

**On `/meetings` (list):**
```
📋 From Catalog: Sprint Planning (deleted)
```
(No link, muted text, same badge style but reduced opacity)

---

## 5. Color and Visual Design

### Catalog Badge (Meeting Planner List)

```
.catalog-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 500;
  padding: 2px 10px 2px 6px;
  border-radius: 10px;
  background: rgba(156, 39, 176, 0.15);
  color: #ce93d8;
  cursor: pointer;
  transition: background 0.15s;
}
.catalog-badge:hover {
  background: rgba(156, 39, 176, 0.25);
}
.catalog-badge .view-link {
  font-size: 0.65rem;
  color: #64b5f6;
  margin-left: 4px;
}
```

The purple color (`#ce93d8` / `#9c27b0`) differentiates catalog-originated items from native planner sessions. This is the only use of purple in the system, making it immediately recognizable.

### Origin Banner (Meeting Detail)

```
.origin-banner {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  background: rgba(156, 39, 176, 0.08);
  border: 1px solid rgba(156, 39, 176, 0.2);
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.origin-banner .link {
  color: #64b5f6;
  cursor: pointer;
  font-weight: 500;
}
.origin-banner .link:hover {
  text-decoration: underline;
}
```

### Connected Meeting Section (Catalog Detail)

```
.connected-section {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  margin-bottom: 16px;
}
.connected-section .section-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.4;
  font-weight: 600;
  margin-bottom: 8px;
}
.connected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  margin-bottom: 4px;
}
.connected-item .meeting-link {
  color: #64b5f6;
  font-size: 0.78rem;
  cursor: pointer;
}
.connected-item .meeting-link:hover {
  text-decoration: underline;
}
```

### Slot-Level "Meeting Created" Indicator

```
.slot-meeting-link {
  font-size: 0.72rem;
  color: #64b5f6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.slot-meeting-link:hover {
  text-decoration: underline;
}
.slot-meeting-created {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
}
```

### Confirmation Badge (Existing, Reused)

```
.status-confirmed {
  background: rgba(255,215,0,0.15);
  color: #FFD700;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Color Palette Summary

| Element | Color | HEX | Usage |
|---------|-------|-----|-------|
| Catalog badge background | Purple (15%) | `rgba(156,39,176,0.15)` | Badge pill |
| Catalog badge text | Light purple | `#ce93d8` | Badge text |
| Origin banner background | Purple (8%) | `rgba(156,39,176,0.08)` | Detail page banner |
| Origin banner border | Purple (20%) | `rgba(156,39,176,0.2)` | Detail page border |
| Link text | Blue | `#64b5f6` | All cross-domain links |
| Meeting created badge | Green (15%) | `rgba(76,175,80,0.15)` | Slot-level meeting indicator |
| Meeting created text | Green | `#81c784` | Slot-level meeting text |
| Confirmed badge | Gold (15%) | `rgba(255,215,0,0.15)` | IsConfirmed status |
| Confirmed text | Gold | `#FFD700` | IsConfirmed status |
| Warn count | Amber | `#ff9800` | Partial booking counts |

---

## Appendix: Data Flow Summary

### Fields Used in UI

| UI Element | Data Source | Type |
|------------|-------------|------|
| Catalog badge (list) | `MeetingSession.sessionDefinitionName` | `string?` |
| View in Catalog link (list) | `MeetingSession.sessionDefinitionId` | `guid?` |
| Origin banner (detail) | `MeetingSession.sessionDefinitionName` + `sessionDefinitionId` | `string?` + `guid?` |
| View in Catalog link (detail) | `MeetingSession.sessionDefinitionId` | `guid?` |
| View Meeting link (catalog detail slot) | `SessionDefinitionSlotDto.connectedMeetingSessionId` (new field) | `guid?` |
| Connected meetings section | `GET .../connected-meeting` endpoint or inline slot data | `MeetingSessionDto[]` |

### Frontend Model Changes

Add to `MeetingSession` interface:
```typescript
export interface MeetingSession {
  // ...existing fields...
  sessionDefinitionSlotId: string | null;
  sessionDefinitionId: string | null;
  sessionDefinitionName: string | null;
}
```

Add to `SessionDefinitionSlot` interface:
```typescript
export interface SessionDefinitionSlot {
  // ...existing fields...
  connectedMeetingSessionId: string | null;
  connectedMeetingSessionTitle: string | null;
}
```

### Conditional Rendering Summary

```
meeting-planner.component.ts:
  @if (session.sessionDefinitionName) {
    <span class="catalog-badge" [routerLink]="['/catalog', session.sessionDefinitionId]">
      📋 From Catalog: {{ session.sessionDefinitionName }}
    </span>
  }

meeting-detail.component.ts:
  @if (session.sessionDefinitionId) {
    <div class="origin-banner">
      📋 This meeting was created from the catalog session "{{ session.sessionDefinitionName }}".
      <a class="link" [routerLink]="['/catalog', session.sessionDefinitionId]">View in Catalog →</a>
    </div>
  }

session-catalog-detail.component.ts:
  @if (slot.connectedMeetingSessionId) {
    <a class="slot-meeting-link" [routerLink]="['/meetings', slot.connectedMeetingSessionId]">
      🔗 Meeting Created → [View Meeting]
    </a>
  }
```
