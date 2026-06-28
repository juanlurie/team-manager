# UX Specification: Leaderboard Member Points History

## 1. User Flow

1. User views leaderboard (podium + rankings)
2. User clicks any member card/row
3. Dialog opens showing:
   - Member header with avatar, name, total points
   - Chronological list of all point sources
4. User scrolls through history
5. User closes dialog (X button or click outside)
6. Returns to leaderboard — no data refresh needed

## 2. Visual Design Specifications

### Dialog Layout
- **Width**: 480px (same as current member form)
- **Background**: `#1a2636` (consistent with app)
- **Border radius**: 12px
- **Max height**: 80vh with scrollable content

### Header Section
```
┌─────────────────────────────────────────┐
│ [X]                                     │
│                                         │
│    [Avatar]  Member Name                │
│              1,250 points               │
│                                         │
├─────────────────────────────────────────┤
```

- Avatar: 48px circle, initials, blue border
- Name: 1.1rem, font-weight 700
- Total points: 1.4rem, font-weight 900, gold color (#FFD700)
- Close button: top-right, subtle icon

### History Entries
Each entry row:
```
┌─────────────────────────────────────────┐
│ 🏅  Win of the Week          +50 pts   │
│     May 12, 2026                        │
├─────────────────────────────────────────┤
│ 🎯  Sprint participation      +5 pts   │
│     May 5, 2026                         │
├─────────────────────────────────────────┤
│ ⭐  Bonus: Helped with demo  +20 pts   │
│     Apr 28, 2026                        │
└─────────────────────────────────────────┘
```

### Source Icons & Colors
| Source | Icon | Color | Background |
|--------|------|-------|------------|
| Badge (general) | 🏅 | #ce93d8 | rgba(171,71,188,0.15) |
| Win of Week | 🏆 | #FFD700 | rgba(255,215,0,0.15) |
| Sprint | 🏃 | #64b5f6 | rgba(100,181,246,0.15) |
| Bonus | ⭐ | #ffb74d | rgba(255,167,38,0.15) |

### Entry Row Styling
- Padding: 12px 16px
- Border bottom: 1px solid rgba(255,255,255,0.04)
- Hover: background rgba(255,255,255,0.03)
- Source icon: 18px, left-aligned
- Reason text: 0.85rem, font-weight 500
- Date text: 0.72rem, opacity 0.4, below reason
- Points: right-aligned, 0.9rem, font-weight 700, source color

### Empty State
```
┌─────────────────────────────────────────┐
│                                         │
│           🏆                              │
│                                         │
│       No points earned yet              │
│                                         │
└─────────────────────────────────────────┘
```
- Centered, padding 48px
- Icon: 48px, opacity 0.3
- Text: 0.9rem, opacity 0.5

### Date Formatting
- Last 7 days: "2 days ago", "Yesterday"
- Older: "May 12, 2026"
- Very old: "Jan 2026" (month + year only)

## 3. Component States

### Loading
- Skeleton rows (3-4) with animated shimmer
- Header shows avatar placeholder

### Error
- "Failed to load history" message
- Retry button

### Empty
- As shown above

### Populated
- Scrollable list with sticky header
- Smooth scroll behavior

## 4. Responsive Behavior
- Dialog width: 480px on desktop, 100vw - 32px on mobile (max 480px)
- Entry rows wrap reason text if too long
- Points always visible on right

## 5. Accessibility
- Dialog has aria-label "Points history for [Member Name]"
- Close button has aria-label "Close"
- History list has role="list"
- Each entry has role="listitem"
- Keyboard: Escape closes dialog
- Focus trap within dialog
- Sufficient color contrast (4.5:1 minimum)
