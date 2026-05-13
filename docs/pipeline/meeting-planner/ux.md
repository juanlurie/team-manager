# Meeting Planner - UX Document

## Feature Request
A meeting planner tool to set up sessions with multiple people either remote or on site. Different people have different availability. The manager creates available slots and sets the location, and these can get filled up by one team member and then some other facilitators.

## Architecture Reference
The backend defines:
- `MeetingSession` entity — a planning session with title, date, time range, location (Remote/OnSite/Hybrid), status (Open/Filled/Cancelled)
- `MeetingSlot` entity — bookable slots within a session, each claimable by one team member or facilitator
- Slots are pre-created at session creation (fixed capacity)
- A member can book at most one slot per session
- Location is per-session

## User Roles & Goals

### Manager Role
- Create meeting sessions with specific time windows and locations
- Define how many team member slots and facilitator slots are available
- View all sessions and their fill status at a glance
- Cancel or reschedule sessions
- Remove a booked member from a slot if needed

### Team Member Role
- Browse available (Open) meeting sessions
- See which sessions still have free slots
- Book a team member slot in a session they want to attend
- Unbook (cancel their own booking)
- View their booked sessions

### Facilitator Role
- Same as team member, but can also book facilitator slots
- Facilitator slots are visually distinguished from team member slots

## Page Structure & Flow

### 1. Meetings List Page (`/meetings`)

**Top section — Create button**
- Prominent "Create Meeting Session" button (visible to managers only)
- Shows: "Plan a new session" with a + icon

**Main section — Session Cards**
Each session displays as a card in a vertical list, ordered by date (soonest first):

```
┌────────────────────────────────────────────────────┐
│  📅 Today, 2:00 PM - 3:00 PM  ● Open              │
│  Sprint Planning Session                           │
│  📍 Remote    👥 2/4 slots filled                  │
│  [View Details →]                                  │
└────────────────────────────────────────────────────┘
```

- **Status badge**: color-coded — Green = Open, Blue = Filled, Grey = Cancelled
- **Location icon**: 🏢 OnSite / 🏠 Remote / 🔄 Hybrid
- **Slot progress**: "X/Y slots filled" with a thin progress bar
- **Date/time** formatted clearly
- **Manager indicator**: Shows "Created by [Name]" if viewer is not the creator

**Filters / Tabs** (optional, keep simple):
- All | Open only | My Bookings
- Sort by: Date | Recently created

### 2. Session Detail Page (`/meetings/:id`)

**Header**
- Session title, date, time, location
- Status badge
- Edit button (manager only)
- Delete button (manager only, with confirmation)

**Description**
- Rendered below header, or hidden if empty

**Slots Section — "Who's attending"**

Two sub-sections:

**Team Members**
```
┌──────────────────────────────────────────────────────┐
│  Team Members (2/3 slots filled)                     │
│                                                      │
│  [Slot 1]  Alice Johnson  ● Booked                   │
│  [Slot 2]  Bob Smith      ● Booked                   │
│  [Slot 3]  ○ Available     [Book this slot]          │
└──────────────────────────────────────────────────────┘
```

**Facilitators**
```
┌──────────────────────────────────────────────────────┐
│  Facilitators (1/2 slots filled)                     │
│                                                      │
│  [Slot 1]  Carol Davis    ● Booked                   │
│  [Slot 2]  ○ Available     [Book as facilitator]     │
└──────────────────────────────────────────────────────┘
```

- **Booked slots**: Show member avatar (initials circle), name, optional notes
- **Available slots**: Show "Available" with a Book button
- **My slot**: If the current user has booked a slot, it's highlighted and shows "You" badge with an "Unbook" link
- **Manager actions**: Show a small "x" or "Remove" icon on each booked slot to unclaim it
- **Book button**: Opens a simple inline prompt for optional notes, then confirms

### 3. Create/Edit Session Dialog (Modal)

**Trigger**: "Create Meeting Session" button / "Edit" button on detail page

**Form fields**:

| Field | Type | Notes |
|---|---|---|
| Title | Text input | Required, max 200 chars |
| Description | Textarea | Optional |
| Date | Date picker | Required |
| Start Time | Time picker (HH:mm) | Required |
| End Time | Time picker (HH:mm) | Required, must be after start |
| Location | Radio / Segmented buttons | Remote / OnSite / Hybrid |
| Team Member Slots | Number stepper (0-20) | How many regular attendee slots |
| Facilitator Slots | Number stepper (0-10) | How many facilitator slots |

**Validation**:
- End time must be after start time
- Date cannot be in the past (warning but allow)
- At least 1 slot total (team member + facilitator > 0)

**Buttons**: [Cancel] [Create Session] / [Save Changes]

### 4. Book Slot Flow

1. User clicks "Book this slot" (or "Book as facilitator")
2. Small inline expand or dialog appears with Notes text field (optional)
3. User clicks "Confirm Booking"
4. Slot updates to claimed, UI refreshes
5. Feedback: success toast "You booked [slot type] in [session title]"

**If already booked in another slot in same session**: Show error "You already have a slot in this session"

### 5. Unbook Flow

1. User clicks "Unbook" on their own booked slot
2. Confirmation dialog: "Remove yourself from this session?"
3. Confirm → slot becomes available
4. Feedback: success toast

## Visual Design Notes

- Follow existing TeamManager design system (Angular Material, existing color palette)
- Use the same card style as Sprint cards
- Status badges reuse existing status label pipe pattern
- Use existing `date-picker`, `confirm-dialog`, `searchable-select` shared components
- Slot booking uses optimistic UI updates (update locally first, then sync with server)

## Responsive Considerations
- On mobile, session cards stack full-width
- On tablet/desktop, session cards can be in a 2-column grid
- Dialog is full-screen on mobile, modal on desktop

## Accessibility
- All interactive elements have proper aria-labels
- Color-coded status badges include text labels (not just color)
- Keyboard navigation for booking flow
- Focus management on dialog open/close

## Error States
- **Loading**: Skeleton cards while sessions load
- **Empty**: "No meeting sessions yet. Create the first one!" with a CTA button (managers) or "No sessions available. Check back later!" (members)
- **Error**: Standard error banner with "Retry" button
- **Booking conflict**: Inline error message near the slot
