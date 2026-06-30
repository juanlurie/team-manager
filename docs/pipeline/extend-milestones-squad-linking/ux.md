# UX Design: Extend Milestones with Global/Squad Scoping

## Feature Request

Extend milestones so they are linked either globally or to specific squads. The purpose is to motivate the team with the progress made but still show what the future needs to get to the final product.

## Design Principles

1. **Motivation-first**: Progress visualization should feel rewarding, not overwhelming
2. **Clarity of scope**: Users should instantly understand whether a milestone is global or squad-specific
3. **Progressive disclosure**: Show the high-level roadmap first, allow drilling into details
4. **Consistency**: Follow existing Angular Material patterns and the app's dark theme

---

## 1. Milestone Scope Badge Component

### Purpose
Reusable badge that appears wherever a milestone is displayed, indicating its scope.

### Visual Design

**Global scope:**
- Material icon: `public` (globe) in `#64b5f6` (light blue)
- Text: "Global" in `rgba(255,255,255,0.6)`
- Background: `rgba(33,150,243,0.12)`
- Border-radius: 12px (pill shape)
- Padding: 2px 8px
- Font size: 0.65rem

**Squad scope:**
- Small colored dot (8px diameter) using the squad's color
- Text: squad name in `rgba(255,255,255,0.7)`
- Background: squad color at 12% opacity
- Border-radius: 12px (pill shape)
- Padding: 2px 8px
- Font size: 0.65rem

### Component API

```typescript
@Component({
  selector: 'app-milestone-scope-badge',
  standalone: true,
  template: `
    @if (scope() === 'Global') {
      <span class="badge badge-global">
        <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;margin-right:3px">public</mat-icon>
        Global
      </span>
    } @else {
      <span class="badge badge-squad" [style.background]="squadBg()">
        <span class="squad-dot" [style.background]="squadColor()"></span>
        {{ squadName() }}
      </span>
    }
  `
})
export class MilestoneScopeBadgeComponent {
  scope = input.required<MilestoneScope>();
  squadName = input<string | null>(null);
  squadColor = input<string | null>(null);
  // ... computed squadBg()
}
```

---

## 2. PI Detail — Milestone Timeline (Modified)

### Current State
Horizontal timeline with diamond-shaped nodes, title, date, status badge, and mini progress bar below each node.

### Changes

#### A. Filter Bar (above timeline)

Add a segmented button group before the milestone timeline:

```
[ All ] [ Global ] [ My Squads ]
```

- Uses `mat-button-toggle-group` with `appearance="legacy"`
- Default: "All"
- "My Squads" only shows if the user belongs to at least one squad
- Filter state is stored in a component signal, no URL params needed
- Active button uses primary color background

#### B. Timeline Node Enhancements

Each diamond node gets a small scope indicator positioned above it:

```
    [scope badge]    <-- NEW: small badge above the diamond
       ◆             <-- existing diamond node
    Title
    15 Mar
   [Upcoming]
   [progress bar]
    2/5 tasks
```

For squad-scoped milestones:
- The diamond node gets a subtle colored border using the squad color (instead of the status-based border)
- The status color is still visible but as a fill tint
- This creates a visual hierarchy: squad color = ownership, status color = progress

#### C. Empty State for Filtered View

When "My Squads" filter is active and the user has no squad-scoped milestones:

```
No squad-specific milestones yet
Global milestones are shown for everyone — create squad milestones to track your squad's progress
```

---

## 3. Create/Edit Milestone Dialog (Enhanced)

### Current State
Uses `prompt()` for title — very minimal.

### New Design

Replace with a proper `MatDialog` form:

```
┌─────────────────────────────────────────────┐
│  Add milestone                              │
├─────────────────────────────────────────────┤
│                                             │
│  Title *                                    │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Description                                │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Target date                                │
│  ┌───────────────────────────────────────┐  │
│  │  Select date                          ▼│  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Scope *                                    │
│  ○ Global  ○ Squad                          │
│                                             │
│  @if (scope === 'Squad') {                  │
│  Squad *                                    │
│  ┌───────────────────────────────────────┐  │
│  │ Select squad                        ▼ │  │
│  └───────────────────────────────────────┘  │
│  }                                          │
│                                             │
├─────────────────────────────────────────────┤
│              [Cancel]  [Create]             │
└─────────────────────────────────────────────┘
```

### Interaction

- Scope selection uses `mat-radio-group`
- When "Squad" is selected, the squad dropdown appears with animation (`@angular/animations` slide-down)
- Squad dropdown lists all squads the current user belongs to (fetched from `SquadService`)
- Validation: squad is required when scope is "Squad"
- Same dialog is reused for editing (title changes to "Edit milestone", button to "Save")

---

## 4. Milestone Detail View (Modified)

### Header Section

Add scope badge next to the title:

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Home                                                          │
│                                                                 │
│  Q4 Platform Launch          [Done]     [🌐 Global]            │
│  Complete the core platform capabilities                        │
│  Target: 15 Mar 2025                                            │
│                                    [Status ▼]  [...]            │
└─────────────────────────────────────────────────────────────────┘
```

For squad-scoped milestones, the badge shows the squad color dot and name.

### Progress Section (Enhanced)

Add motivational messaging when progress is high:

```
Progress
4 / 5 tasks done — 80%
████████████████████████████████░░░░

@if (progressPercent >= 75 && progressPercent < 100) {
  <span style="color:#4caf50;font-size:0.78rem">Almost there! 🎯</span>
}
@if (progressPercent === 100) {
  <span style="color:#4caf50;font-size:0.78rem;font-weight:600">Milestone complete! 🎉</span>
}
```

### New Section: "What's Next" (for non-Done milestones)

Shows remaining work to motivate the team:

```
What's next
─────────────────────────────────────────
2 tasks remaining to complete this milestone:

  • [In Progress]  Implement auth service     — Juan
  • [Planned]      Write integration tests    — Maria

1 criterion remaining:
  ☐ All API endpoints documented
```

This section is hidden when the milestone is Done.

---

## 5. Road to Product View (New)

### Route
`/pis/{piId}/roadmap`

### Purpose
A bird's-eye view of all milestones in a PI, showing how close the team is to the final product. This is the primary motivation feature.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back to PI                                                     │
│                                                                  │
│  Road to Product                                                 │
│  Q4 2025 Platform PI                                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Overall Progress                                          │  │
│  │                                                            │  │
│  │         40%                                                │  │
│  │     ████████░░░░░░░░░░░░                                   │  │
│  │                                                            │  │
│  │  4 Done    2 In Progress    6 Upcoming    12 Total         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ──── Completed ────                                            │
│                                                                  │
│  ✅  Foundation Setup              Global     100%  Done 15 Jan  │
│  ✅  Auth & User Management        Global     100%  Done 28 Jan  │
│  ✅  Core API v1                   Global     100%  Done 12 Feb  │
│  ✅  Squad: Data Pipeline          Backend    100%  Done 20 Feb  │
│                                                                  │
│  ──── In Progress ────                                          │
│                                                                  │
│  🔄  Frontend Dashboard            Global      65%  IP  15 Mar  │
│  🔄  Squad: Reporting Module       Analytics   40%  IP  22 Mar  │
│                                                                  │
│  ──── Upcoming ────                                             │
│                                                                  │
│  ⬜  Integration Testing           Global       0%  —   5 Apr    │
│  ⬜  Performance Optimization      Global       0%  —   15 Apr   │
│  ⬜  Squad: Admin Panel            Platform     0%  —   22 Apr   │
│  ⬜  Documentation                 Global       0%  —   28 Apr   │
│  ⬜  Release Candidate             Global       0%  —   5 May    │
│  ⬜  Production Launch             Global       0%  —   15 May   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Structure

```typescript
@Component({
  selector: 'app-milestone-roadmap',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatTooltipModule, MatChipsModule,
    MilestoneScopeBadgeComponent
  ],
  template: `...`
})
export class MilestoneRoadmapComponent {
  piId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  roadmap = signal<MilestoneRoadmap | null>(null);
  loading = signal(true);

  // Grouped milestones
  done = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'Done') ?? []);
  inProgress = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'InProgress') ?? []);
  upcoming = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'Upcoming') ?? []);
}
```

### Visual Details

**Overall Progress Card:**
- Large percentage number (2.5rem, bold)
- Thick progress bar (12px height, rounded)
- Color transitions: red (<25%), orange (25-50%), blue (50-75%), green (75-100%)
- Summary row with counts in muted text

**Milestone Rows:**
- Each row is a clickable card (links to milestone detail)
- Hover effect: subtle background highlight
- Left side: status icon (checkmark, spinner, empty circle)
- Middle: title + scope badge
- Right side: progress % + status + target date
- Squad-scoped rows have a subtle left border in the squad color

**Animation:**
- When the component loads, rows fade in with staggered delay
- Progress bars animate from 0 to their value
- Overall percentage counts up with a number animation

---

## 6. User Flows

### Flow 1: Create a Global Milestone

1. User navigates to PI detail
2. Clicks "Add milestone"
3. Dialog opens with scope defaulting to "Global"
4. User fills in title, optional description, optional target date
5. Clicks "Create"
6. Milestone appears in timeline with globe badge
7. Success: subtle toast notification "Milestone created"

### Flow 2: Create a Squad Milestone

1. User navigates to PI detail
2. Clicks "Add milestone"
3. Dialog opens
4. User selects "Squad" radio button
5. Squad dropdown appears (animated)
6. User selects their squad from dropdown
7. Fills in title and other fields
8. Clicks "Create"
9. Milestone appears in timeline with squad-colored badge
10. Success: toast notification "Squad milestone created"

### Flow 3: View Road to Product

1. User navigates to PI detail
2. Clicks "Road to Product" button (added next to milestone section header)
3. Roadmap view loads with animated progress
4. User sees overall progress and all milestones grouped by status
5. Clicks any milestone row to navigate to detail view

### Flow 4: Filter Milestones by Scope

1. User is on PI detail
2. Uses filter toggle: "All" | "Global" | "My Squads"
3. Timeline updates instantly (no page reload)
4. Filter state persists during the session (in component signal)

---

## 7. Accessibility Considerations

- All interactive elements have proper `aria-label` attributes
- Scope badges use both icon and text (not icon-only)
- Color is never the sole indicator of scope — text labels are always present
- Progress percentages are announced by screen readers
- Keyboard navigation: filter bar is tabbable, dialog form follows standard focus trap
- Contrast ratios meet WCAG AA (verified against dark theme background)

---

## 8. Responsive Design

**Desktop (>1024px):**
- Full horizontal timeline in PI detail
- Roadmap shows all columns

**Tablet (768px-1024px):**
- Timeline scrolls horizontally (already implemented)
- Roadmap stacks into two columns

**Mobile (<768px):**
- Timeline scrolls horizontally with touch
- Filter bar collapses to a dropdown
- Roadmap becomes a single-column list
- Create/edit dialog becomes full-screen bottom sheet

---

## 9. Animation & Motivation Details

### Progress Celebrations

When a milestone reaches 100%:
- The progress bar fills with a smooth animation
- A subtle confetti-like particle effect appears briefly (CSS-only, using pseudo-elements)
- The milestone card gets a green glow that fades after 2 seconds
- Text changes to "Milestone complete!" with a celebration emoji

### Roadmap Loading

- Overall progress percentage counts up from 0 to actual value over 800ms
- Progress bar fills with a spring-like easing curve
- Milestone rows stagger-fade in (50ms delay per row)

### Filter Transitions

- When filtering milestones, non-matching nodes fade out and shrink
- Matching nodes smoothly reposition using FLIP animation technique
- Duration: 250ms with ease-out curve

---

## 10. Files to Create or Modify (Frontend)

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `team-manager-ui/src/app/core/models/milestone.model.ts` | Add `MilestoneScope` type, `scope`, `squadId`, `squadName` fields, `MilestoneRoadmap` interface |
| MODIFY | `team-manager-ui/src/app/core/services/milestone.service.ts` | Add `getRoadmap()`, update `getByPI()` with optional params, update `create()`/`update()` |
| MODIFY | `team-manager-ui/src/app/features/pi-detail/pi-detail.component.ts` | Add filter bar, scope badges, enhanced add milestone dialog, roadmap link |
| MODIFY | `team-manager-ui/src/app/features/milestones/milestone-detail.component.ts` | Add scope badge in header, "What's next" section |
| NEW | `team-manager-ui/src/app/features/milestones/milestone-roadmap.component.ts` | Road to Product view component |
| NEW | `team-manager-ui/src/app/shared/components/milestone-scope-badge.component.ts` | Reusable scope badge component |
| MODIFY | `team-manager-ui/src/app/features/milestones/milestones.routes.ts` | Add roadmap route |
