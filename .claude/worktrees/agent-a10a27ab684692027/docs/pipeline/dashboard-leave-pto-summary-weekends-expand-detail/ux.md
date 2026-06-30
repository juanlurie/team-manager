# UX Design: Dashboard Leave & PTO Summary with Weekends & Expandable Detail

## 1. User Flow

1. User lands on the sprint dashboard (`/dashboard`). The page loads, including the **Leave & PTO Summary** card in its **collapsed** state.
2. The collapsed card shows three quick stats: *"X on leave today · Y members on leave · Z calendar days"* with a chevron-down icon on the right.
3. User clicks the card's header bar (or the chevron icon). The card **expands** with a smooth transition, revealing:
   - **By Type** section — rows grouped by leave type (Annual / Sick / Other) with record counts and day totals.
   - **Team Members** section — per-member cards listing each member's records with start/end dates, working days, and calendar days.
4. User clicks the header or chevron again to **collapse** the card back to its summary state.
5. If the sprint has no leave records, the card shows an empty-state message instead of the expandable detail.

---

## 2. Visual Design — Collapsed State

```
┌──────────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                           ▼     │
│                                                          │
│  3 on leave today · 8 members on leave · 34 calendar days│
└──────────────────────────────────────────────────────────┘
```

### Card Container
| Property | Value |
|---|---|
| `border-radius` | `10px` |
| `background` | `rgba(206,147,216,0.06)` |
| `border` | `1px solid rgba(206,147,216,0.18)` |
| `padding` | `14px 18px` |
| `margin-bottom` | `28px` |

Matches the existing celebration card and old "On Leave" section exactly.

### Header Row
| Property | Value |
|---|---|
| Layout | `display:flex; align-items:center; gap:8px` |
| Icon | `beach_access` (Material icon) |
| Icon color | `#ce93d8` |
| Icon sizing | `font-size:16px; width:16px; height:16px; line-height:16px` |
| Title text | `"LEAVE & PTO SUMMARY"` |
| Title font-size | `0.75rem` |
| Title font-weight | `700` |
| Title text-transform | `uppercase` |
| Title letter-spacing | `0.08em` |
| Title color | `#ce93d8` |
| Chevron icon | `expand_more` (collapsed) / `expand_less` (expanded) |
| Chevron color | `#ce93d8` at `opacity:0.5` |
| Chevron sizing | `font-size:20px; width:20px; height:20px; line-height:20px` |
| Chevron position | `margin-left:auto` (right-aligned) |

### Stats Line
| Property | Value |
|---|---|
| Layout | `display:flex; align-items:center; gap:4px; flex-wrap:wrap` |
| Position | Below header, `margin-top:8px` |
| Text | `"X on leave today · Y members on leave · Z calendar days"` |
| Font-size | `0.82rem` |
| Opacity | `0.75` |
| Line-height | `1.5` |
| Bullet separator | `·` (middle dot) with `opacity:0.4` |

Falls below the header row, separated by `10px` gap.

### Hover
| Property | Value |
|---|---|
| Card hover | `cursor:pointer` |
| Card hover effect | `filter:brightness(1.25)` |
| Transition | `filter 0.15s` |
| Implementation | Same pattern as stat cards: `class="stat-card"` with the CSS rule `.stat-card:hover { filter:brightness(1.25); }` |

### Focus / Active
| Property | Value |
|---|---|
| Focus-visible | `outline:2px solid #ce93d8; outline-offset:2px` |

---

## 3. Visual Design — Expanded State

When expanded, the card height grows smoothly (transition on `max-height` or Angular animation). The following content appears **below** the header and stats line, separated by a `1px solid rgba(206,147,216,0.12)` divider:

```
┌──────────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                           ▲     │
│                                                          │
│  3 on leave today · 8 members on leave · 34 calendar days│
│ ──────────────────────────────────────────────────────── │
│                                                          │
│  By Type                                                  │
│                                                          │
│  Annual ──────────────────────────────────────────────   │
│  5 records                   12 working days  16 cal days│
│                                                          │
│  Sick ────────────────────────────────────────────────   │
│  2 records                    3 working days   4 cal days│
│                                                          │
│  Other ───────────────────────────────────────────────   │
│  1 record                     2 working days   3 cal days│
│                                                          │
│  Team Members                                             │
│                                                          │
│  ┌─ Alice Smith ─── 3 records ── 8 working days ──────┐ │
│  │                                                     │ │
│  │  Annual  10 Jan – 12 Jan    3 work   4 cal   📝    │ │
│  │  Sick    15 Jan – 15 Jan    1 work   1 cal         │ │
│  │  Other   20 Jan – 22 Jan    2 work   3 cal         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Bob Jones ──── 1 record ─── 2 working days ───────┐ │
│  │                                                     │ │
│  │  Annual  05 Jan – 08 Jan    2 work   4 cal          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Divider
| Property | Value |
|---|---|
| `border-top` | `1px solid rgba(206,147,216,0.12)` |
| `margin` | `12px 0 14px` |

### Section: "By Type"
| Property | Value |
|---|---|
| Section header text | `"By Type"` |
| Section header font-size | `0.7rem` |
| Section header font-weight | `600` |
| Section header text-transform | `uppercase` |
| Section header letter-spacing | `0.07em` |
| Section header opacity | `0.45` |
| Section header margin-bottom | `8px` |

#### Type rows
| Property | Value |
|---|---|
| Layout | `display:flex; align-items:center; padding:6px 0` |
| Type name | `font-size:0.82rem; font-weight:600; min-width:80px` |
| Type color | `#ce93d8` for the type name |
| Count | `font-size:0.75rem; opacity:0.55; flex:1` |
| Working days | `font-size:0.75rem; opacity:0.7; min-width:90px; text-align:right` |
| Calendar days | `font-size:0.75rem; font-weight:600; opacity:0.9; min-width:80px; text-align:right` |
| Bottom border | `border-bottom:1px solid rgba(206,147,216,0.07)` (last row omitted) |

### Section: "Team Members"
| Property | Value |
|---|---|
| Section header text | `"Team Members"` |
| Section header font-size | `0.7rem` |
| Section header font-weight | `600` |
| Section header text-transform | `uppercase` |
| Section header letter-spacing | `0.07em` |
| Section header opacity | `0.45` |
| Section header margin | `16px 0 8px` |

#### Member Card
Each member gets a card similar to the discussion/retro rows but with purple tones.

| Property | Value |
|---|---|
| `border-radius` | `10px` |
| `background` | `rgba(206,147,216,0.04)` |
| `border` | `1px solid rgba(206,147,216,0.13)` |
| `padding` | `11px 16px` |
| `margin-bottom` | `6px` |
| `transition` | `background 0.15s` |
| `hover background` | `rgba(206,147,216,0.08)` |

##### Member Header Row
| Property | Value |
|---|---|
| Layout | `display:flex; align-items:center; gap:10px` |
| Member name | `font-size:0.88rem; font-weight:600` |
| Record count badge | `font-size:0.68rem; font-weight:600; border-radius:8px; padding:2px 8px; background:rgba(206,147,216,0.15); color:#ce93d8` |
| Working days total | `font-size:0.75rem; opacity:0.5; margin-left:auto` |

##### Individual Record Row
| Property | Value |
|---|---|
| Layout | `display:flex; align-items:center; gap:8px; padding:4px 0 4px 4px; margin-top:6px` |
| Type badge | `font-size:0.68rem; font-weight:600; border-radius:6px; padding:2px 8px; min-width:44px; text-align:center` |
| Annual badge bg | `rgba(206,147,216,0.18)` |
| Annual badge color | `#ce93d8` |
| Sick badge bg | `rgba(239,83,80,0.13)` |
| Sick badge color | `#ef9a9a` |
| Other badge bg | `rgba(255,255,255,0.08)` |
| Other badge color | `rgba(255,255,255,0.45)` |
| Date range | `font-size:0.78rem; opacity:0.7; flex:1` |
| Working days label | `font-size:0.72rem; opacity:0.5; min-width:48px; text-align:right` |
| Calendar days label | `font-size:0.72rem; font-weight:600; opacity:0.8; min-width:44px; text-align:right` |
| Notes icon | `notes` Material icon, `font-size:14px; opacity:0.3`, shown only when `notes` is non-null |

---

## 4. Interaction Design

### Toggle
- Click target: The entire card header area (`display:flex; align-items:center` row containing the icon, title, and chevron).
- Click fires `toggleExpanded()` which flips the `expanded` signal.
- Chevron toggles between `expand_more` (collapsed) and `expand_less` (expanded).

### Hover
- Card itself uses the `.stat-card` hover class: `filter:brightness(1.25)` with `transition:filter 0.15s`.

### Expand Animation
Two options (pick one):

**Option A — CSS max-height transition:**
```
.wrapper {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.wrapper.expanded {
  max-height: 2000px;  /* large enough to fit content */
}
```

**Option B — Angular `@trigger` animation (recommended for consistency):**
```typescript
animations: [
  trigger('expandCollapse', [
    state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
    state('expanded', style({ height: '*', opacity: 1 })),
    transition('collapsed <=> expanded', animate('200ms ease-out'))
  ])
]
```

Either approach is acceptable. The animation should run **200–300ms** with `ease-out` easing.

### Empty State
When `leaveSummary` has `membersOnLeaveTotal === 0`:

```
┌──────────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                                  │
│                                                          │
│  No leave records this sprint       ✓                    │
└──────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Icon | `check_circle` at `color:#ce93d8; opacity:0.5; font-size:16px` |
| Text | `"No leave records this sprint"` at `font-size:0.85rem; opacity:0.45` |
| Layout | `display:flex; align-items:center; gap:8px; padding:12px 16px` |

Matches the pattern used in the "No open discussions" empty state (line 136–141 of sprint-dashboard.component.ts). No expand chevron is shown — the card is not interactive.

### Loading State
The parent `SprintDashboardComponent` already shows a `<mat-spinner>` when `loading()` is true. The leave summary data is fetched as part of the same `forkJoin` in `load()`, so no separate loading state is needed inside the card. The card simply does not render until `leaveSummary()` is non-null (`@if (leaveSummary())`).

---

## 5. Responsive Behavior

### Mobile (viewport < 600px)
| Element | Behavior |
|---|---|
| Header row | Icon + title stay on one line; chevron stays right-aligned |
| Stats line | Wraps naturally via `flex-wrap:wrap`. Text breaks into multiple lines: "3 on leave today ·" on one line, "8 members on leave ·" on next, "34 calendar days" on next |
| By Type rows | Each row stacks vertically. On very narrow screens (< 360px), the type name, record count, working days, and calendar days each take a separate line |
| Member cards | Collapse to full width (no side effects — they are already full-width) |
| Per-member records | Each record row stacks vertically: type badge on its own line, date range below, day counts inline below that |
| Font sizes | Remain at `0.82rem` / `0.75rem` / `0.88rem` — no responsive font-size changes |
| Card padding | Reduces to `12px 14px` on screens < 480px |

### Tablet (viewport 600–960px)
| Element | Behavior |
|---|---|
| All elements | Behave identically to desktop. No changes needed |

### Desktop (> 960px)
Full layout as described in sections 2 and 3.

---

## 6. Accessibility

### ARIA / Role
| Element | Attribute |
|---|---|
| Toggle area (header row) | `role="button"`, `tabindex="0"` |
| Expanded state | `[attr.aria-expanded]="expanded()"` on the toggle element |
| Card container | No role needed — it's a section of content |
| Chevron icon | `aria-hidden="true"` |

### Keyboard
| Key | Action |
|---|---|
| `Enter` | Toggle expand/collapse |
| `Space` | Toggle expand/collapse |

Implementation:
```html
<div role="button" tabindex="0"
     [attr.aria-expanded]="expanded()"
     (click)="toggleExpanded()"
     (keydown.enter)="toggleExpanded()"
     (keydown.space)="toggleExpanded(); $event.preventDefault()">
```

### Focus Management
- Focus is managed natively via `tabindex="0"` on the toggle element.
- Focus-visible outline uses `outline:2px solid #ce93d8; outline-offset:2px` (or browser default).

### Color Contrast
| Text | Background | Ratio |
|---|---|---|
| `#ce93d8` (header) | `rgba(206,147,216,0.06)` | Cross-reference against dark bg — passes WCAG AA for large text |
| `opacity:0.75` on `#fff` (stats) | `rgba(206,147,216,0.06)` | Sufficient contrast due to dark theme context |
| `opacity:0.45` (section headers) | same | Decorative / non-essential text |

All ratios inherit the existing dark-theme dashboard context. Purple tones (`#ce93d8`) are already used in the old "On Leave" section and pass existing contrast checks.

---

## 7. ASCII Wireframes

### Collapsed state (no leave records — empty state)

```
┌──────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                              │
│                                                      │
│  ✓ No leave records this sprint                      │
└──────────────────────────────────────────────────────┘
```

### Collapsed state (with records)

```
┌──────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                          ▼   │
│                                                      │
│  3 on leave today · 8 members on leave · 34 cal days │
└──────────────────────────────────────────────────────┘
```

### Expanded state (full)

```
┌──────────────────────────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY                          ▲   │
│                                                      │
│  3 on leave today · 8 members on leave · 34 cal days │
│ ───────────────────────────────────────────────────── │
│                                                      │
│ BY TYPE                                              │
│                                                      │
│  Annual  5 records          12 working days   16 cal │
│  Sick    2 records           3 working days    4 cal │
│  Other   1 record            2 working days    3 cal │
│                                                      │
│ TEAM MEMBERS                                         │
│                                                      │
│  ┌─ Alice Smith ── 3 recs ── 8 work days ─────────┐ │
│  │  Annual   10 Jan – 12 Jan  3 work  4 cal   📝  │ │
│  │  Sick     15 Jan – 15 Jan  1 work  1 cal       │ │
│  │  Other    20 Jan – 22 Jan  2 work  3 cal       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ Bob Jones ─── 1 rec ──── 2 work days ─────────┐ │
│  │  Annual   05 Jan – 08 Jan  2 work  4 cal        │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Mobile collapsed (wrapped stat line)

```
┌──────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY      ▼   │
│                                  │
│  3 on leave today ·              │
│  8 members on leave ·            │
│  34 calendar days                │
└──────────────────────────────────┘
```

### Mobile expanded (member record stacking)

```
┌──────────────────────────────────┐
│  🏖 LEAVE & PTO SUMMARY      ▲   │
│  3 on leave today ·              │
│  8 members on leave ·            │
│  34 calendar days                │
│ ───────────────────────────────── │
│                                  │
│ BY TYPE                          │
│  Annual  5 recs  12w   16c      │
│  Sick    2 recs   3w    4c      │
│                                  │
│ TEAM MEMBERS                     │
│                                  │
│  ┌─ Alice Smith ── 3 recs ────┐ │
│  │  Annual                     │ │
│  │  10 Jan – 12 Jan            │ │
│  │  3 work  ·  4 cal      📝  │ │
│  │                             │ │
│  │  Sick                       │ │
│  │  15 Jan – 15 Jan            │ │
│  │  1 work  ·  1 cal          │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## 8. Component Hierarchy

```
SprintDashboardComponent
│
├── CurrentSprintCardComponent
├── Stat pills (inline)                    <a class="stat-card"> x6
├── Sprint progress (inline)
├── Discussions (inline)                   discussion-row class
├── Retro Actions (inline)                 retro-row class
├── PI Progress (inline)
├── Celebrations (inline)
│
├── LeaveSummaryCardComponent              ◄── NEW — replaces old inline "On Leave"
│   ├── Header row (toggle target)
│   │   ├── beach_access icon
│   │   ├── "LEAVE & PTO SUMMARY" title
│   │   └── expand_more / expand_less icon
│   ├── Stats line
│   ├── [Collapsed only] Empty state       @if membersOnLeaveTotal === 0
│   ├── [Expanded only] Divider
│   ├── [Expanded only] By Type section
│   │   └── Type row x N
│   └── [Expanded only] Team Members section
│       └── Member card x N
│           ├── Member header (name, badge, total)
│           └── Record row x N
│               ├── Type badge
│               ├── Date range
│               ├── Working days
│               ├── Calendar days
│               └── Notes icon (conditional)
│
├── Blockers section (inline)              blocker-row class
└── (MVP section / future)
```

### Data flow summary

```
SprintDashboardComponent.load()
  │
  └── forkJoin({
        summary:      dashSvc.getSprintSummary(sprint.id),
        blockers:     dashSvc.getBlockers(sprint.id),
        leave:        leaveSvc.getAll({ from: today, to: in7days }),
        discussions:  discussionSvc.getAll(),
        retroActions: retroActionSvc.getBySprintId(sprint.id),
        leaveSummary: dashSvc.getLeaveSummary(sprint.id),   ◄── NEW
        ...
      })
      │
      └── leaveSummary.set(res['leaveSummary'] ?? null)
            │
            ▼
      <app-leave-summary-card [leaveSummary]="leaveSummary()!" />
            │
            └── LeaveSummaryCardComponent
                  ├── Input: leaveSummary (DashboardLeaveSummary)
                  ├── State: expanded (signal<boolean>)
                  └── Renders collapsed or expanded template
```

---

## 9. Color & Token Reference

All colors are literal values matching the existing sprint dashboard visual language:

| Token | Value | Usage |
|---|---|---|
| `--leave-primary` | `#ce93d8` | Icon, title, badges, type names |
| `--leave-bg` | `rgba(206,147,216,0.06)` | Card background |
| `--leave-border` | `rgba(206,147,216,0.18)` | Card border |
| `--leave-bg-row` | `rgba(206,147,216,0.04)` | Member card / type row background |
| `--leave-border-row` | `rgba(206,147,216,0.13)` | Member card border |
| `--leave-bg-annual` | `rgba(206,147,216,0.18)` | Annual badge background |
| `--leave-color-annual` | `#ce93d8` | Annual badge text |
| `--leave-bg-sick` | `rgba(239,83,80,0.13)` | Sick badge background |
| `--leave-color-sick` | `#ef9a9a` | Sick badge text |
| `--leave-bg-other` | `rgba(255,255,255,0.08)` | Other badge background |
| `--leave-color-other` | `rgba(255,255,255,0.45)` | Other badge text |
| `--leave-divider` | `rgba(206,147,216,0.12)` | Section divider |
| `--text-opacity-high` | `0.85` | Primary body text |
| `--text-opacity-med` | `0.55` | Secondary / stat labels |
| `--text-opacity-low` | `0.35` | Tertiary / decorative text |

---

## 10. Implementation Notes for Developer

- The component is **strictly presentational** — it receives the full `DashboardLeaveSummary` object via `@Input()` and manages only its own `expanded` toggle state.
- No `OnInit` or `OnChanges` needed. Signals react declaratively.
- Font sizes use `rem` units throughout (`0.75rem` = ~12px at 16px base, `0.82rem` = ~13px, `0.88rem` = ~14px).
- The chevron icon change is simply: `[innerText]="expanded() ? 'expand_less' : 'expand_more'"` or equivalent.
- The expand animation wrapper wraps only the expandable content (divider + by-type + team-members), not the header + stats line.
- The card's `margin-bottom:28px` is applied to `<app-leave-summary-card>` by the parent via the `style` binding, matching all other sections.
