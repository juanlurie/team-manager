# Coffee Run — UX Design Document

> Date: 2026-05-23
> Author: UX Designer
> Status: Proposal
> Based on: Architecture Rethink (arch.md)

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Speed over ceremony** | Placing an order should take under 15 seconds for a returning user |
| **Progressive disclosure** | Show only what's needed; reveal advanced options on demand |
| **Real-time confidence** | Users always see the current state — no stale data, no manual refresh |
| **Mobile-first, desktop-enhanced** | Designed for thumb-reach on phones; expands gracefully on larger screens |
| **Delightful micro-interactions** | Subtle animations confirm actions without getting in the way |
| **Forgiving by default** | Easy to edit, easy to cancel, clear undo paths |

---

## 2. User Journeys

### 2.1 Initiator Journey — Creating and Managing a Run

```
┌──────────────────────────────────────────────────────────────────────┐
│  INITIATOR: "I'm going to the cafe — who wants anything?"            │
└──────────────────────────────────────────────────────────────────────┘

Step 1: Start a Run
  ┌──────────────────────────────────────────────────────────────────┐
  │  User taps "New Run" from the Run List screen                    │
  │  → "Start a Coffee Run" dialog appears                           │
  │  → Fields: Title (optional), Description (optional),             │
  │    Location (optional), Deadline (optional quick-pick)           │
  │  → "Start from template" dropdown with recent/team templates     │
  │  → Primary button: "Create Run"                                  │
  │  → Secondary button: "Cancel"                                    │
  └──────────────────────────────────────────────────────────────────┘

Step 2: Build the Menu (Draft State)
  ┌──────────────────────────────────────────────────────────────────┐
  │  User lands on Run Detail in Draft state                         │
  │  → Menu section shows "Add items to your menu" empty state       │
  │  → "Add Item" button opens inline form or slide-up panel         │
  │  → Fields: Name*, Price*, Category (dropdown), Max Qty (opt)     │
  │  → Items appear in a sortable list with drag handles             │
  │  → "Preview as Orderer" button to see how it looks               │
  │  → Primary CTA: "Publish Run" — transitions to Open state        │
  │  → Secondary: "Save as Template" for future reuse                │
  └──────────────────────────────────────────────────────────────────┘

Step 3: Monitor Orders (Open State)
  ┌──────────────────────────────────────────────────────────────────┐
  │  Run is live — team members are ordering                         │
  │  → Real-time toast: "Sarah placed an order — R85.00"             │
  │  → Order count badge updates live                                │
  │  → Running total visible in header: "5 orders · R342.50"         │
  │  → Deadline countdown visible: "Closes in 23 min"                │
  │  → "Close Run" button enabled (always available)                 │
  │  → "Cancel Run" available in overflow menu                       │
  │  → Stock indicators update live as items are ordered             │
  └──────────────────────────────────────────────────────────────────┘

Step 4: Close the Run
  ┌──────────────────────────────────────────────────────────────────┐
  │  User taps "Close Run"                                           │
  │  → Confirmation dialog: "Close this run? No more orders will     │
  │    be accepted. 5 orders · R342.50 total"                        │
  │  → Confirm: "Close Run" / Cancel                                 │
  │  → Run transitions to Closed state                               │
  │  → Auto-navigates to Summary view                                │
  └──────────────────────────────────────────────────────────────────┘

Step 5: Review Summary (Closed State)
  ┌──────────────────────────────────────────────────────────────────┐
  │  Summary screen shows:                                           │
  │  → Grand total prominently displayed                             │
  │  → Per-person breakdown: name, items, amount owed                │
  │  → Per-item totals: name, category, total qty, total amount      │
  │  → "Copy Totals" button (clipboard-friendly format)              │
  │  → "Save Menu as Template" button                                │
  │  → "Mark Orders as Picked Up" bulk action                        │
  └──────────────────────────────────────────────────────────────────┘
```

### 2.2 Orderer Journey — Placing an Order

```
┌──────────────────────────────────────────────────────────────────────┐
│  ORDERER: "I want a coffee!"                                         │
└──────────────────────────────────────────────────────────────────────┘

Step 1: Discover the Run
  ┌──────────────────────────────────────────────────────────────────┐
  │  Option A — Notification:                                        │
  │    → Push/in-app toast: "Alex started a coffee run — closes in   │
  │      30 min. Tap to order."                                      │
  │    → Tap notification → deep link to Run Detail                  │
  │                                                                  │
  │  Option B — Run List:                                            │
  │    → Open runs appear at top with "Order" badge                  │
  │    → Shows initiator, deadline countdown, item count             │
  │    → Tap a run → Run Detail                                      │
  └──────────────────────────────────────────────────────────────────┘

Step 2: Browse the Menu
  ┌──────────────────────────────────────────────────────────────────┐
  │  Run Detail shows menu grouped by category                       │
  │  → Collapsible sections: "Coffee", "Food", "Cold Drinks"         │
  │  → Each item: name, price, quantity stepper, stock indicator     │
  │  → Unavailable items grayed out with "Sold Out" badge            │
  │  → Low-stock items show "Only 2 left" warning                    │
  │  → Running order total sticky at bottom of screen                │
  └──────────────────────────────────────────────────────────────────┘

Step 3: Build the Order
  ┌──────────────────────────────────────────────────────────────────┐
  │  User taps +/- steppers to select quantities                     │
  │  → First item selection reveals "Notes" field (optional)         │
  │  → Notes field: "e.g., oat milk, no sugar"                       │
  │  → Order total updates live as quantities change                 │
  │  → "Place Order" button activates when at least 1 item selected  │
  │  → If user already has an order: "Update Order" button shown     │
  └──────────────────────────────────────────────────────────────────┘

Step 4: Confirm the Order
  ┌──────────────────────────────────────────────────────────────────┐
  │  User taps "Place Order"                                         │
  │  → Optimistic UI: order appears immediately with "Placed" state  │
  │  → Success toast: "Order placed! R85.00 — Alex will collect"     │
  │  → If validation fails (item sold out): inline error + recovery  │
  │  → Order status shows "Placed" with icon                         │
  └──────────────────────────────────────────────────────────────────┘

Step 5: Track Order Status
  ┌──────────────────────────────────────────────────────────────────┐
  │  After run closes:                                               │
  │  → Notification: "Coffee run closed! Your order: R85.00"         │
  │  → Order status updates: Placed → Confirmed → PickedUp           │
  │  → Initiator marks status; orderer sees live update              │
  │  → "Picked Up" shows checkmark + completion animation            │
  └──────────────────────────────────────────────────────────────────┘
```

### 2.3 Admin / Team Lead Journey

```
┌──────────────────────────────────────────────────────────────────────┐
│  ADMIN: "I need to manage templates and oversee runs"                │
└──────────────────────────────────────────────────────────────────────┘

Step 1: Manage Templates
  ┌──────────────────────────────────────────────────────────────────┐
  │  Navigate to "Manage Menus" from sidebar or run detail           │
  │  → Template list with filters: All / Personal / Team / Archived  │
  │  → Each template card: name, scope badge, item count, creator    │
  │  → Team leads see all templates; others see personal + team      │
  │  → "New Template" button (top right)                             │
  │  → "Import JSON" button                                          │
  │  → Archive action (soft delete) with undo toast                  │
  └──────────────────────────────────────────────────────────────────┘

Step 2: Create / Edit Template
  ┌──────────────────────────────────────────────────────────────────┐
  │  Template Editor screen                                          │
  │  → Template name field at top                                    │
  │  → Scope toggle: Personal / Team (team leads can set Team)       │
  │  → Item list with add/edit/delete/reorder                        │
  │  → Price is optional (suggested, not enforced)                   │
  │  → Category assignment per item                                  │
  │  → "Save" auto-saves with debounce; manual save button too       │
  │  → "Use This Template" → starts a new run pre-populated          │
  └──────────────────────────────────────────────────────────────────┘

Step 3: Admin Override
  ┌──────────────────────────────────────────────────────────────────┐
  │  Team leads can:                                                 │
  │  → Delete any template (with confirmation + audit log)           │
  │  → Cancel any open run (with notification to initiator)          │
  │  → View all runs across the team                                 │
  │  → See run analytics (future)                                    │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen Layouts

### 3.1 Run List Screen

```
┌─────────────────────────────────────────────────────────┐
│  ☰  Coffee Runs                           [+ New Run]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [All] [Open] [Closed] [Mine]          [🔍 Search...]   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Monday Morning Run              [OPEN] 🟢     │ │
│  │  by Alex · 12 items · 8 orders · R542.00         │ │
│  │  ⏰ Closes in 18 min    📍 Blue Bean Cafe         │ │
│  │                              [View] [Quick Order] │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Afternoon Tea Run               [OPEN] 🟢     │ │
│  │  by Sam · 6 items · 3 orders · R185.00           │ │
│  │  ⏰ Closes in 45 min    📍 Kitchen                 │ │
│  │                              [View] [Quick Order] │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Friday Treat                    [CLOSED] ⚫    │ │
│  │  by Jordan · 10 items · 12 orders · R890.00      │ │
│  │  Closed 2 hours ago                               │ │
│  │                                       [View]      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Quick Espresso Run              [DRAFT] 🟡    │ │
│  │  by You · 4 items · 0 orders                     │ │
│  │  Created 10 min ago                               │ │
│  │                        [Edit] [Publish] [Delete]  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ← 1  2  3  4  5 →                  Showing 1-5 of 47  │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Status filter tabs for quick segmentation
- Search bar for finding runs by title, initiator, or location
- Each run card shows: status badge, initiator, item/order counts, total, deadline/location
- Open runs show "Quick Order" for one-tap ordering
- Draft runs (owned by user) show edit/publish/delete actions
- Pagination at bottom

### 3.2 Run Detail — Draft State (Initiator View)

```
┌─────────────────────────────────────────────────────────┐
│  ←  ☕ Monday Morning Run          [DRAFT] 🟡  [⋮]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 by You · Created 5 min ago                          │
│  📍 Blue Bean Cafe                                      │
│  ⏰ Deadline: Today 10:30 AM   [Edit]                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  MENU                              [+ Add Item]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Coffee ─────────────────────────────────────────┐  │
│  │  ☰  Latte           R45.00    [Edit] [Delete]    │  │
│  │  ☰  Cappuccino      R42.00    [Edit] [Delete]    │  │
│  │  ☰  Espresso        R28.00    [Edit] [Delete]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Food ───────────────────────────────────────────┐  │
│  │  ☰  Muffin          R35.00    [Edit] [Delete]    │  │
│  │     ⚠️ Only 3 available                          │  │
│  │  ☰  Croissant       R30.00    [Edit] [Delete]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  +  Tap to add a new menu item                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Preview as Orderer]     [Save as Template]           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │            🚀  Publish Run                        │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Draft badge (yellow) signals "not yet visible to team"
- Inline metadata editing (title, location, deadline)
- Category-grouped menu items with drag handles (☰) for reordering
- Stock warnings visible during menu building
- "Preview as Orderer" lets initiator see the ordering experience
- Publish is the primary CTA — big, prominent button

### 3.3 Run Detail — Open State (Orderer View)

```
┌─────────────────────────────────────────────────────────┐
│  ←  ☕ Monday Morning Run          [OPEN] 🟢  [⋮]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 by Alex · 12 items · 📍 Blue Bean Cafe              │
│  ⏰ Closes in 18:42                    [Share]          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  MENU                                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼  Coffee                               (3 items)      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Latte                              R45.00       │  │
│  │  ┌────┐                           ┌────┐         │  │
│  │  │  - │                           │  2 │         │  │
│  │  └────┘                           └────┘         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Cappuccino                         R42.00       │  │
│  │  ┌────┐                           ┌────┐         │  │
│  │  │  - │                           │  1 │         │  │
│  │  └────┘                           └────┘         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Espresso                           R28.00       │  │
│  │  ┌────┐                           ┌────┐         │  │
│  │  │  + │                           │  0 │         │  │
│  │  └────┘                           └────┘         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ▶  Food                                 (2 items)      │
│  ▶  Cold Drinks                          (1 item)       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📝 Notes: oat milk for the latte, please               │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │  Your Order: 3 items · R132.00                    │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │        🛒  Place Order                      │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Live countdown timer creates urgency
- Collapsible category sections — expand the one you care about
- Quantity steppers are large, thumb-friendly targets
- Running total sticky at bottom — always visible
- Notes field appears once user starts ordering
- "Place Order" button is full-width, prominent
- If user already has an order, button reads "Update Order" and shows current order summary

### 3.4 Run Detail — Open State (Initiator View)

```
┌─────────────────────────────────────────────────────────┐
│  ←  ☕ Monday Morning Run          [OPEN] 🟢  [⋮]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 by You · 12 items · 📍 Blue Bean Cafe               │
│  ⏰ Closes in 18:42                    [Close Run]      │
│                                                         │
│  📊 8 orders · R542.00 total           [View Summary]   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Menu]  [Orders (8)]  [Summary]                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Recent Orders ──────────────────────────────────┐  │
│  │                                                   │  │
│  │  Sarah                  R85.00   Just now 🟢     │  │
│  │  2× Latte, 1× Muffin                            │  │
│  │                                                   │  │
│  │  Mike                   R45.00   3 min ago 🟢    │  │
│  │  1× Latte                                       │  │
│  │                                                   │  │
│  │  Jess                   R112.00  8 min ago 🟢    │  │
│  │  2× Cappuccino, 1× Croissant                    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Menu ───────────────────────────────────────────┐  │
│  │  ▼ Coffee                                        │  │
│  │    Latte        R45.00   📦 18 remaining         │  │
│  │    Cappuccino   R42.00   📦 20 remaining         │  │
│  │    Espresso     R28.00   📦 ∞                     │  │
│  │  ▼ Food                                          │  │
│  │    Muffin       R35.00   📦 1 remaining  ⚠️      │  │
│  │    Croissant    R30.00   📦 3 remaining          │  │
│  │                                                   │  │
│  │    [+ Add Item]  [Toggle Availability]            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │            🔒  Close Run                          │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Initiator sees orders tab with live feed of incoming orders
- Real-time toast notifications for new orders
- Stock remaining counts update live
- "Toggle Availability" lets initiator mark items as unavailable on the fly
- Summary tab accessible for quick totals check
- Close Run always accessible

### 3.5 Run Detail — Closed State (Summary View)

```
┌─────────────────────────────────────────────────────────┐
│  ←  ☕ Monday Morning Run         [CLOSED] ⚫  [⋮]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 by Alex · 📍 Blue Bean Cafe                         │
│  Closed at 10:32 AM · 8 orders                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Summary]  [Orders]  [Menu]                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │         R 542.00                                  │ │
│  │         Total to Collect                          │ │
│  │                                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │  📋 Copy Totals                             │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Who Owes What ──────────────────────────────────┐  │
│  │                                                   │  │
│  │  Sarah        2× Latte, 1× Muffin     R85.00  ✅ │  │
│  │  Mike         1× Latte                R45.00  ✅ │  │
│  │  Jess         2× Cappuccino, 1× Crois R112.00 ⏳ │  │
│  │  Tom          1× Espresso, 1× Muffin  R63.00  ⏳ │  │
│  │  ...and 4 more                                    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Items Ordered ──────────────────────────────────┐  │
│  │                                                   │  │
│  │  Latte          8×      R360.00                   │  │
│  │  Cappuccino     5×      R210.00                   │  │
│  │  Muffin         4×      R140.00                   │  │
│  │  Croissant      3×       R90.00                   │  │
│  │  Espresso       2×       R56.00                   │  │
│  │                                                   │  │
│  │  Total items: 22                                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [Save Menu as Template]    [Mark All Picked Up]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Grand total is the hero — large, centered
- "Copy Totals" creates a clipboard-friendly text summary for sharing
- Per-person breakdown with payment status indicators (✅ collected, ⏳ pending)
- Per-item totals for the initiator to know what to order from the cafe
- "Save Menu as Template" for quick reuse
- "Mark All Picked Up" bulk status update

### 3.6 Manage Templates Screen

```
┌─────────────────────────────────────────────────────────┐
│  ←  Menu Templates                    [+ New] [Import]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [All] [Personal] [Team] [Archived]                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Office Cafe                    [TEAM] 👥      │ │
│  │  15 items · by Alex · Created 2 weeks ago         │ │
│  │                              [Edit] [Use] [⋮]    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Quick Espresso                 [PERSONAL] 👤  │ │
│  │  4 items · by You · Created 1 month ago           │ │
│  │                              [Edit] [Use] [⋮]    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Tea & Snacks                   [TEAM] 👥      │ │
│  │  8 items · by Sam · Created 3 weeks ago           │ │
│  │                              [Edit] [Use] [⋮]    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ☕ Old Cafe Menu          [ARCHIVED] 📦          │ │
│  │  12 items · by Jordan · Archived 2 months ago     │ │
│  │                        [Restore] [Delete] [⋮]    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ← 1  2 →                            Showing 1-4 of 7  │
└─────────────────────────────────────────────────────────┘
```

### 3.7 Template Editor Screen

```
┌─────────────────────────────────────────────────────────┐
│  ←  Office Cafe Template               [Saved ✓] [⋮]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name:  Office Cafe                                     │
│                                                         │
│  Scope:  (●) Personal   (○) Team                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ITEMS                             [+ Add Item]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Coffee ─────────────────────────────────────────┐  │
│  │  ☰  Latte            R45.00   [Edit] [Delete]    │  │
│  │  ☰  Cappuccino       R42.00   [Edit] [Delete]    │  │
│  │  ☰  Espresso         R28.00   [Edit] [Delete]    │  │
│  │  ☰  Americano        R30.00   [Edit] [Delete]    │  │
│  │  ☰  Flat White       R40.00   [Edit] [Delete]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Food ───────────────────────────────────────────┐  │
│  │  ☰  Muffin           R35.00   [Edit] [Delete]    │  │
│  │  ☰  Croissant        R30.00   [Edit] [Delete]    │  │
│  │  ☰  Cookie           R18.00   [Edit] [Delete]    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  +  Tap to add a new item                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │            ☕  Start Run from This Template        │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key elements:**
- Auto-save with visual indicator ("Saved ✓")
- Scope toggle for Personal/Team (Team option only for team leads)
- Drag-and-drop reordering within and across categories
- "Start Run from This Template" is the primary action — templates exist to be used

### 3.8 Add/Edit Menu Item Dialog (Slide-up Panel)

```
┌─────────────────────────────────────────────────────────┐
│  ───                                            [✕]    │
│                                                         │
│  Add Menu Item                                          │
│                                                         │
│  Name *                                                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Latte                                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Price *                                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │  R   45.00                                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Category                                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Coffee                              [▾]          │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ○ Coffee    ○ Food    ○ Cold Drinks    [+ New]   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Max Quantity (leave empty for unlimited)               │
│  ┌───────────────────────────────────────────────────┐ │
│  │  20                                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Add Item                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.9 Save as Template Dialog

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              Save Menu as Template                      │
│                                                         │
│  Template Name *                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Office Cafe                                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Scope                                                  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  👤 Personal │  │  👥 Team     │                    │
│  │  Just for you│  │  Everyone    │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Save Template                             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.10 Start a Run Dialog

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              Start a Coffee Run                         │
│                                                         │
│  Title (optional)                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Monday Morning Run                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Location (optional)                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Blue Bean Cafe                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Deadline (optional)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  15 min      │ │  30 min      │ │  1 hour      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌───────────────────────────────┐   │
│  │  Custom      │ │  Today 10:30 AM      [▾]      │   │
│  └──────────────┘ └───────────────────────────────┘   │
│                                                         │
│  Start from template (optional)                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Office Cafe (15 items)              [▾]          │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Create Run                                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Component Hierarchy

```
CoffeeRunShellComponent                    (shell with router-outlet, shared state)
│
├── RunListComponent                       (/coffee-runs)
│   ├── RunFilterBarComponent              (status tabs, search)
│   ├── RunCardComponent                   (reusable run summary card)
│   │   ├── StatusBadgeComponent           (colored status indicator)
│   │   ├── CountdownTimerComponent        (live deadline countdown)
│   │   └── RunActionsComponent            (contextual action buttons)
│   └── PaginationComponent                (reusable pagination)
│
├── RunDetailComponent                     (/coffee-runs/:id)
│   ├── RunHeaderComponent                 (title, status, metadata, countdown)
│   │   ├── StatusBadgeComponent
│   │   ├── CountdownTimerComponent
│   │   └── RunMenuComponent               (header actions dropdown)
│   │
│   ├── TabNavComponent                    (Menu / Orders / Summary tabs)
│   │
│   ├── MenuSectionComponent               (menu display + editing)
│   │   ├── CategoryGroupComponent         (collapsible category section)
│   │   │   ├── MenuItemCardComponent      (single item display)
│   │   │   │   ├── QuantityStepperComponent  (+/- control)
│   │   │   │   ├── StockIndicatorComponent   (remaining count)
│   │   │   │   └── AvailabilityToggleComponent
│   │   │   └── AddItemInlineComponent     (inline add form)
│   │   ├── MenuItemEditorDialog           (slide-up panel for add/edit)
│   │   └── SortableListDirective          (drag-and-drop reordering)
│   │
│   ├── OrderSectionComponent              (order placement)
│   │   ├── OrderItemRowComponent          (item + stepper for orderers)
│   │   ├── OrderNotesComponent            (notes textarea)
│   │   ├── OrderTotalBarComponent         (sticky bottom bar with total)
│   │   └── OrderConfirmationToast         (success feedback)
│   │
│   ├── OrdersListComponent                (all orders view)
│   │   ├── OrderCardComponent             (single order display)
│   │   │   ├── OrderStatusBadgeComponent
│   │   │   └── OrderItemsListComponent
│   │   └── OrderStatusDropdownComponent   (initiator: change order status)
│   │
│   ├── RunSummaryComponent                (initiator-only summary)
│   │   ├── GrandTotalComponent            (hero total display)
│   │   ├── PersonBreakdownComponent       (who owes what)
│   │   │   └── PaymentStatusIconComponent
│   │   ├── ItemTotalsComponent            (per-item summary)
│   │   └── CopyTotalsButtonComponent      (clipboard export)
│   │
│   └── RunStateBannerComponent            (contextual state banner)
│       (Draft: "Preview mode", Closing: "Final 5 minutes!", etc.)
│
├── ManageMenusComponent                   (/coffee-runs/templates)
│   ├── TemplateFilterBarComponent
│   ├── TemplateCardComponent
│   │   ├── ScopeBadgeComponent
│   │   └── TemplateActionsComponent
│   └── PaginationComponent
│
├── TemplateEditorComponent                (/coffee-runs/templates/:id)
│   ├── TemplateHeaderComponent            (name, scope, save status)
│   ├── TemplateItemListComponent
│   │   ├── TemplateItemCardComponent
│   │   └── AddItemInlineComponent
│   └── TemplateItemEditorDialog
│
├── StartRunDialogComponent                (modal)
│   ├── DeadlinePickerComponent
│   └── TemplateSelectorComponent
│
└── shared/
    ├── QuantityStepperComponent           (reusable +/- with min/max)
    ├── StatusBadgeComponent               (reusable status indicator)
    ├── CountdownTimerComponent            (reusable live countdown)
    ├── SaveTemplateDialogComponent        (modal)
    ├── ConfirmDialogComponent             (reusable confirmation)
    ├── ToastNotificationComponent         (real-time toasts)
    ├── EmptyStateComponent                (reusable empty state)
    ├── SkeletonLoaderComponent            (loading placeholders)
    └── SignalRConnectionIndicator         (connection status dot)
```

### Component Responsibility Summary

| Component | Responsibility |
|-----------|---------------|
| `CoffeeRunShellComponent` | Route container, SignalR connection lifecycle, global toast display |
| `RunListComponent` | Fetch paginated runs, apply filters, render cards |
| `RunCardComponent` | Display run summary; adapt actions based on user role and run state |
| `RunDetailComponent` | Orchestrate tabs, manage SignalR subscription for a specific run |
| `RunHeaderComponent` | Display run metadata, countdown, state-specific actions |
| `MenuSectionComponent` | Render menu by category; show edit controls for initiator |
| `CategoryGroupComponent` | Collapsible category with item count; animate expand/collapse |
| `MenuItemCardComponent` | Display item info; render stepper for orderers, edit controls for initiator |
| `QuantityStepperComponent` | Reusable +/- control with min (0), max (99 or stock limit), keyboard support |
| `StockIndicatorComponent` | Show remaining quantity; color-coded (green/amber/red) |
| `OrderSectionComponent` | Collect order items, manage notes, compute running total |
| `OrderTotalBarComponent` | Sticky bottom bar showing item count + total + action button |
| `OrdersListComponent` | Display all orders; allow initiator to update order status |
| `RunSummaryComponent` | Display grand total, per-person breakdown, per-item totals |
| `RunStateBannerComponent` | Contextual banner for state-specific messaging |
| `ManageMenusComponent` | Template list with scope filters and pagination |
| `TemplateEditorComponent` | Full template CRUD with auto-save |
| `StartRunDialogComponent` | Modal for creating a new run with optional template |
| `SaveTemplateDialogComponent` | Modal for saving current menu as template |
| `ToastNotificationComponent` | Real-time notification display (SignalR-driven) |
| `SkeletonLoaderComponent` | Loading placeholders for all async content |

---

## 5. Interaction Patterns

### 5.1 Ordering Flow

```
User Action              →  System Response              →  Visual Feedback
─────────────────────────────────────────────────────────────────────────────
Tap quantity "+"         →  Increment counter            →  Number animates up
                         →  Update running total         →  Total slides in
                         →  Enable "Place Order" button  →  Button fades from
                                                          disabled to active

Tap quantity "-"         →  Decrement counter            →  Number animates down
(to 0)                   →  Remove item from order       →  Row fades out
                         →  Recalculate total            →  Total updates

Tap "Place Order"        →  Optimistic UI update         →  Button → spinner
                         →  POST /orders                 →  Toast: "Order placed!"
                         →  SignalR broadcast            →  Others see new order

Tap "Update Order"       →  PUT /orders/{id}             →  Button → spinner
                         →  Optimistic update            →  Toast: "Order updated!"

Tap "Delete Order"       →  Confirmation dialog          →  "Remove your order?"
(from overflow menu)     →  DELETE /orders/{id}          →  Order row slides out
                         →  Reset steppers to 0          →  Toast: "Order removed"
```

### 5.2 Menu Management (Initiator)

```
User Action              →  System Response              →  Visual Feedback
─────────────────────────────────────────────────────────────────────────────
Tap "+ Add Item"         →  Slide-up panel opens         →  Panel animates up
                         →  Focus on Name field          →  Keyboard appears

Fill form + "Add Item"   →  POST /menu-items             →  Button → spinner
                         →  Item appended to list        →  Item fades in with
                                                          highlight animation

Drag item (☰ handle)     →  Drag ghost follows finger    →  Drop zone highlights
                         →  PUT /menu-items/reorder      →  Items reorder smoothly

Tap availability toggle  →  PATCH /availability          →  Toggle animates
                         →  Item grays out for orderers  →  "Unavailable" badge

Tap "Delete Item"        →  If ordered: 409 error        →  Toast: "Cannot delete —
                                                          has orders"
                         →  If not ordered: DELETE       →  Item slides out
```

### 5.3 Run Lifecycle Actions

```
User Action              →  System Response              →  Visual Feedback
─────────────────────────────────────────────────────────────────────────────
Tap "Publish Run"        →  POST /publish                →  Button → spinner
(Draft → Open)           →  SignalR: RunStatusChanged    →  Badge: yellow → green
                         →  All users see run appear     →  Toast to team:
                                                          "New coffee run!"

Tap "Close Run"          →  Confirmation dialog          →  Shows order count
(Open → Closed)          →  POST /close                  →  + total
                         →  SignalR: RunStatusChanged    →  Badge: green → black
                         →  Orders locked                →  Navigate to Summary
                         →  Toast to all: "Run closed"

Deadline reached         →  Background worker triggers   →  Auto-transition
(Open → Closing → Closed)→  5-min Closing grace period   →  Banner: "Closing in
                                                          5 minutes!"
                         →  Then auto-close              →  Notifications sent

Tap "Cancel Run"         →  Confirmation dialog          →  "Cancel this run?
(Any → Cancelled)        →  POST /cancel                 →  Orders will be deleted"
                         →  SignalR broadcast            →  Badge → red/strikethrough
                         →  Toast to all: "Run cancelled"
```

### 5.4 Real-Time Interactions

```
SignalR Event            →  UI Response
─────────────────────────────────────────────────────────────────────────────
OrderPlaced              →  Toast notification (non-initiator: "Sarah ordered")
                         →  Order count badge increments
                         →  If viewing Orders tab: new order card slides in
                         →  Stock indicators update

OrderUpdated             →  If viewing Orders tab: order card updates in place
                         →  Stock indicators update

OrderDeleted             →  If viewing Orders tab: order card slides out
                         →  Order count badge decrements
                         →  Stock indicators update

MenuUpdated              →  Menu list refreshes (smooth transition)
                         →  If item user has in order is removed: warning toast

ItemAvailabilityChanged  →  Item grays out or becomes available
                         →  If user has unavailable item in order: warning +
                            option to remove

RunStatusChanged         →  Status badge updates with animation
                         →  If Closing: urgency banner appears
                         →  If Closed: navigate to Summary (if on detail page)
                         →  If Cancelled: strikethrough + notification

RunCreated               →  Toast: "Alex started a coffee run"
                         →  Run appears in list (if viewing list)
```

### 5.5 Template Interactions

```
User Action              →  System Response              →  Visual Feedback
─────────────────────────────────────────────────────────────────────────────
Tap "Use Template"       →  Start Run dialog opens       →  Template pre-selected
                         →  Pre-fills menu               →  "Starting from:
                                                          Office Cafe"

Tap "Import JSON"        →  File picker opens            →  Select .json file
                         →  Parse and preview            →  Preview dialog shows
                                                          items to be imported
                         →  Confirm import               →  Toast: "Imported 12 items"

Tap "Archive"            →  Soft delete (IsArchived=true)→  Card fades + moves to
                                                          Archived tab
                         →  Undo toast (5 sec)           →  "Template archived"
                                                          [Undo]

Tap "Restore"            →  IsArchived=false             →  Card moves back to
(from Archived)          →                                active list
```

---

## 6. Mobile-First Design

### 6.1 Breakpoint Strategy

```
Mobile (default)         320px - 767px    Single column, full-width cards
Tablet                   768px - 1023px   Two-column grid for run cards
Desktop                  1024px+          Three-column grid, side-by-side panels
```

### 6.2 Mobile-Specific Considerations

**Touch Targets:**
- All interactive elements minimum 44×44px (Apple HIG / Material guideline)
- Quantity steppers: 48×48px buttons with 16px gap
- Card tap areas extend to full card width, not just button labels

**Thumb Zone Layout:**
```
┌─────────────────────┐
│  Header (reach: ✗)  │  ← Back, title, overflow menu
├─────────────────────┤
│                     │
│  Content (reach: ~) │  ← Scrollable menu, orders
│                     │
├─────────────────────┤
│  Sticky Bar (reach: ✓)│ ← Order total + Place Order button
└─────────────────────┘
```
- Primary actions (Place Order, Close Run) anchored to bottom within thumb reach
- Secondary actions (Edit, Delete) in overflow menu at top

**Gesture Support:**
| Gesture | Action |
|---------|--------|
| Swipe left on run card | Quick actions: View / Order / Delete |
| Swipe left on order card | Status change: Confirm / Picked Up |
| Pull to refresh | Refresh run list (fallback if SignalR disconnected) |
| Long press on menu item | Quick edit (mobile shortcut) |
| Pinch on template editor | Not supported — use drag handles |

**Mobile-Optimized Dialogs:**
- All dialogs are bottom sheets (slide up from bottom) on mobile
- Full-screen on screens < 480px
- Dismissible by swiping down or tapping backdrop
- Keyboard-aware: dialogs resize when virtual keyboard appears

**Mobile Navigation:**
```
┌─────────────────────┐
│  ☰  Coffee Runs     │  ← Hamburger or back
├─────────────────────┤
│  [Runs] [Templates] │  ← Bottom tab bar (mobile only)
└─────────────────────┘
```
- Bottom tab bar on mobile: Runs | Templates
- Desktop: sidebar navigation

**Performance on Mobile:**
- Skeleton loaders instead of spinners (perceived speed)
- Lazy-load order details (don't fetch full order list until tab selected)
- Debounce quantity stepper changes (300ms) before API call
- Optimistic UI for all mutations (update before server confirms)

### 6.3 Responsive Layout Transitions

**Run List:**
```
Mobile:                  Tablet:                  Desktop:
┌──────────────┐         ┌────────┬────────┐      ┌────┬────┬────┐
│ Card (full)  │         │ Card   │ Card   │      │ C  │ C  │ C  │
├──────────────┤         ├────────┼────────┤      ├────┼────┼────┤
│ Card (full)  │         │ Card   │ Card   │      │ C  │ C  │ C  │
├──────────────┤         └────────┴────────┘      └────┴────┴────┘
│ Card (full)  │
└──────────────┘
```

**Run Detail:**
```
Mobile:                  Tablet:                  Desktop:
┌──────────────┐         ┌──────────────────┐     ┌─────────┬─────────┐
│ Header       │         │ Header           │     │ Menu    │ Orders  │
├──────────────┤         ├──────────────────┤     │         │         │
│ Tab content  │         │ Tab content      │     ├─────────┤         │
│ (full width) │         │ (full width)     │     │ Summary │         │
├──────────────┤         └──────────────────┘     └─────────┴─────────┘
│ Sticky bar   │
└──────────────┘
```

---

## 7. State Transitions

### 7.1 Run State Machine — Visual Description

```
                    ┌──────────────────┐
                    │                  │
                    │     DRAFT        │
                    │  🟡 Yellow badge │
                    │  "Building menu" │
                    │                  │
                    └────────┬─────────┘
                             │
                             │ Initiator taps "Publish Run"
                             │ POST /publish
                             │
                             ▼
                    ┌──────────────────┐
             ┌──────│                  │
             │      │      OPEN        │
             │      │  🟢 Green badge  │
             │      │  "Accepting      │◄──────┐
             │      │   orders"        │       │
             │      │                  │       │ Deadline reached
             │      └────────┬─────────┘       │ or initiator
             │               │                 │ triggers close
             │               │ Initiator taps  │
             │               │ "Close Run"     │
             │               │ POST /close     │
             │               ▼                 │
             │      ┌──────────────────┐       │
             │      │                  │       │
             │      │    CLOSING       │───────┘
             │      │  🟠 Orange badge │  (auto after 5 min)
             │      │  "Final 5 min!"  │
             │      │  [Banner shown]  │
             │      │                  │
             │      └────────┬─────────┘
             │               │
             │               │ Auto or manual
             │               │
             │               ▼
             │      ┌──────────────────┐
             │      │                  │
             │      │    CLOSED        │
             │      │  ⚫ Black badge  │
             │      │  "Orders locked" │
             │      │  [Summary shown] │
             │      │                  │
             │      └──────────────────┘
             │
             │ (any state before Closed)
             │ Initiator/Admin taps "Cancel"
             │ POST /cancel
             │
             ▼
    ┌──────────────────┐
    │                  │
    │   CANCELLED      │
    │  🔴 Red badge    │
    │  "Run voided"    │
    │  [Strikethrough] │
    │                  │
    └──────────────────┘
```

### 7.2 Order State Machine

```
    ┌──────────────────┐
    │                  │
    │    PLACED        │
    │  🟢 Green dot    │
    │  "Order received"│
    │                  │
    └────────┬─────────┘
             │
             │ Initiator marks confirmed
             │ PATCH /orders/{id}/status
             │
             ▼
    ┌──────────────────┐
    │                  │
    │   CONFIRMED      │
    │  🔵 Blue dot     │
    │  "Being prepared"│
    │                  │
    └────────┬─────────┘
             │
             │ Initiator marks picked up
             │ PATCH /orders/{id}/status
             │
             ▼
    ┌──────────────────┐
    │                  │
    │   PICKED UP      │
    │  ✅ Green check  │
    │  "Collected"     │
    │  [Completion     │
    │   animation]     │
    │                  │
    └──────────────────┘
```

### 7.3 UI Responses to State Changes

| Transition | Banner | Badge | Actions Available | Notification |
|------------|--------|-------|-------------------|--------------|
| Draft → Open | None | 🟡 → 🟢 | Publish hidden, Close visible | Toast to all team members |
| Open → Closing | 🟠 "Closing in 5 min!" | 🟢 → 🟠 | Close still visible | Toast: "Run closing soon" |
| Closing → Closed | None | 🟠 → ⚫ | Close hidden, Summary shown | Toast: "Run closed" |
| Any → Cancelled | 🔴 "This run was cancelled" | → 🔴 + strikethrough | All actions disabled | Toast: "Run cancelled" |
| Placed → Confirmed | None | 🟢 → 🔵 dot | Status dropdown updates | Toast to orderer |
| Confirmed → PickedUp | None | 🔵 → ✅ | Status dropdown updates | Toast to orderer + confetti 🎉 |

---

## 8. Accessibility

### 8.1 Keyboard Navigation

**Global Shortcuts:**
| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift+Tab` | Move focus to previous interactive element |
| `Enter` / `Space` | Activate focused button or toggle |
| `Escape` | Close dialog, cancel inline edit, dismiss toast |
| `Arrow Up/Down` | Navigate within stepper, list items, dropdowns |
| `Arrow Left/Right` | Switch between tabs (Menu/Orders/Summary) |
| `/` | Focus search bar (when not in input) |
| `N` | New run (when not in input) |

**Focus Management:**
- Focus trap within all dialogs and slide-up panels
- Focus returns to triggering element when dialog closes
- Visible focus ring on all interactive elements (2px solid, high contrast)
- Skip link: "Skip to main content" at top of page

**Keyboard Stepper Pattern:**
```
┌─────┐
│  -  │  ← Tab stops here first
└─────┘
┌─────┐
│  2  │  ← Arrow Up/Down to change value
└─────┘
┌─────┐
│  +  │  ← Tab stops here second
└─────┘
```

### 8.2 Screen Reader Support

**ARIA Labels:**
```html
<!-- Run status badge -->
<span role="status" aria-label="Status: Open - accepting orders">
  🟢 OPEN
</span>

<!-- Quantity stepper -->
<div role="group" aria-label="Latte quantity">
  <button aria-label="Decrease Latte quantity">−</button>
  <span aria-live="polite" aria-atomic="true">2</span>
  <button aria-label="Increase Latte quantity">+</button>
</div>

<!-- Countdown timer -->
<span aria-live="polite" aria-atomic="true">
  Closes in 18 minutes and 42 seconds
</span>

<!-- Order total bar -->
<div role="status" aria-live="polite">
  Your order: 3 items, R132.00
</div>

<!-- Stock indicator -->
<span role="alert" aria-label="Only 1 Muffin remaining">
  ⚠️ Only 1 left
</span>
```

**Live Regions:**
| Region | `aria-live` | Content |
|--------|-------------|---------|
| Order placed | `polite` | "Sarah placed an order — R85.00" |
| Run status change | `assertive` | "Coffee run has been closed" |
| Countdown (last 5 min) | `polite` | "Closes in 2 minutes" |
| Stock warning | `assertive` | "Latte is now sold out" |
| Toast notifications | `polite` | All toast messages |
| Save status | `polite` | "Template saved" |

**Screen Reader Announcements for State Changes:**
```
Draft → Open:    "Coffee run is now open. Team members can place orders."
Open → Closing:  "Coffee run is closing in 5 minutes. Place your orders now."
Closing → Closed:"Coffee run is now closed. No more orders accepted."
Any → Cancelled: "Coffee run has been cancelled. All orders have been removed."
```

### 8.3 Color Contrast

**Color Palette — WCAG AA Compliant:**

| Element | Background | Foreground | Ratio |
|---------|-----------|------------|-------|
| Status: Open (green) | `#166534` | `#FFFFFF` | 7.2:1 ✓ |
| Status: Draft (yellow) | `#854D0E` | `#FFFFFF` | 7.8:1 ✓ |
| Status: Closing (orange) | `#9A3412` | `#FFFFFF` | 5.1:1 ✓ |
| Status: Closed (black) | `#1F2937` | `#FFFFFF` | 12.6:1 ✓ |
| Status: Cancelled (red) | `#991B1B` | `#FFFFFF` | 6.5:1 ✓ |
| Primary button | `#7C3AED` | `#FFFFFF` | 5.9:1 ✓ |
| Primary button hover | `#6D28D9` | `#FFFFFF` | 6.5:1 ✓ |
| Body text | `#FFFFFF` | `#111827` | 16.1:1 ✓ |
| Secondary text | `#FFFFFF` | `#6B7280` | 5.7:1 ✓ |
| Link text | `#7C3AED` | `#FFFFFF` | 5.9:1 ✓ |
| Error text | `#991B1B` | `#FFFFFF` | 6.5:1 ✓ |
| Success text | `#166534` | `#FFFFFF` | 7.2:1 ✓ |

**Color is never the sole indicator:**
- Status badges combine color + icon + text label
- Stock warnings combine color + icon + text ("Only 1 left")
- Selected items show a checkmark icon, not just a color change
- Form errors show icon + text, not just red border

### 8.4 Reduced Motion

**Respects `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

| Animation | Default | Reduced Motion |
|-----------|---------|----------------|
| Item fade in | 200ms fade + slide | Instant appearance |
| Card slide out | 300ms slide + fade | Instant removal |
| Toast slide in | 300ms slide from top | Instant appearance |
| Countdown update | Smooth number transition | Instant number change |
| Dialog open | 250ms slide up | Instant appearance |
| Drag ghost | Follows with easing | Immediate position |
| Confetti (picked up) | Particle animation | Static checkmark icon |

### 8.5 Focus Order

**Logical tab order for Run Detail (Orderer view):**
```
1. Back button
2. Run title
3. Deadline countdown
4. Share button
5. Menu section header
6. Category 1 header (expand/collapse)
7. Item 1 name
8. Item 1 quantity (-)
9. Item 1 quantity (value)
10. Item 1 quantity (+)
11. Item 2 name
12. Item 2 quantity (-)
... (repeat for each item)
13. Notes field
14. Place Order button
```

---

## 9. Microcopy

### 9.1 Button Labels

| Context | Button | Label |
|---------|--------|-------|
| Run list — primary | Create new run | `+ New Run` |
| Run list — card action (open) | View run detail | `View` |
| Run list — card action (open) | Quick order | `Quick Order` |
| Run detail — draft | Publish the run | `🚀 Publish Run` |
| Run detail — draft | Preview ordering experience | `Preview as Orderer` |
| Run detail — draft | Save menu for reuse | `Save as Template` |
| Run detail — open (initiator) | Close the run | `🔒 Close Run` |
| Run detail — open (orderer) | Submit order | `🛒 Place Order` |
| Run detail — open (has order) | Update existing order | `✏️ Update Order` |
| Run detail — closed | Copy totals to clipboard | `📋 Copy Totals` |
| Run detail — closed | Save menu as template | `💾 Save Menu as Template` |
| Run detail — closed | Mark all orders picked up | `✅ Mark All Picked Up` |
| Menu item — initiator | Add new item | `+ Add Item` |
| Menu item — initiator | Edit item | `Edit` |
| Menu item — initiator | Delete item | `Delete` |
| Template list | Create template | `+ New Template` |
| Template list | Import from JSON | `📥 Import JSON` |
| Template editor | Start a run | `☕ Start Run from This Template` |
| Template editor — save status | Auto-save indicator | `Saved ✓` |
| Dialog — cancel | Close without saving | `Cancel` |
| Dialog — confirm | Proceed with action | (context-specific, see below) |

### 9.2 Tooltips

| Element | Tooltip |
|---------|---------|
| Status badge (Open) | "Accepting orders" |
| Status badge (Draft) | "Not yet visible to team" |
| Status badge (Closing) | "Closing soon — last chance to order" |
| Status badge (Closed) | "Orders locked — run complete" |
| Status badge (Cancelled) | "This run was cancelled" |
| Countdown timer | "Orders close at [time]" |
| Stock indicator (low) | "Only X remaining — first come, first served" |
| Stock indicator (out) | "Sold out — no more available" |
| Availability toggle | "Hide this item from orderers" |
| Share button | "Share run link with team" |
| Copy Totals button | "Copy order summary to clipboard" |
| Quick Order button | "Open ordering screen directly" |
| Preview as Orderer | "See how this run looks to team members" |
| Scope badge (Team) | "Visible to all team members" |
| Scope badge (Personal) | "Only visible to you" |
| Drag handle (☰) | "Drag to reorder" |
| SignalR indicator (green) | "Live updates connected" |
| SignalR indicator (red) | "Connection lost — showing cached data" |

### 9.3 Empty States

| Screen | Empty State |
|--------|-------------|
| Run list (no runs) | **Title:** No coffee runs yet<br>**Body:** Start the first run and get the team's orders rolling.<br>**Action:** `+ Start a Run` |
| Run list (no matching filters) | **Title:** No runs match your filters<br>**Body:** Try adjusting your search or filter criteria.<br>**Action:** `Clear Filters` |
| Menu (draft, no items) | **Title:** Build your menu<br>**Body:** Add items that the team can order. You can always edit before publishing.<br>**Action:** `+ Add First Item` |
| Orders (open, no orders yet) | **Title:** No orders yet<br>**Body:** Share the run with the team and orders will appear here in real time.<br>**Action:** `Share Run` |
| Orders (closed, no orders) | **Title:** No orders were placed<br>**Body:** This run closed without any orders. |
| Summary (closed, no orders) | **Title:** Nothing to summarize<br>**Body:** No orders were placed in this run. |
| Templates (no templates) | **Title:** No saved menus<br>**Body:** Create a template to quickly start future runs with your favorite items.<br>**Action:** `+ Create Template` |
| Templates (no matching filters) | **Title:** No templates match your filters<br>**Body:** Try a different scope or clear your filters.<br>**Action:** `Clear Filters` |
| Template items (empty) | **Title:** This template is empty<br>**Body:** Add items to build your menu template.<br>**Action:** `+ Add First Item` |

### 9.4 Error Messages

| Scenario | Message | Recovery |
|----------|---------|----------|
| Place order — item sold out | "Sorry, [Item] is no longer available. It was sold out while you were ordering." | Remove item from order, highlight in red |
| Place order — stock exceeded | "Only [N] [Item] remaining. Your order has been adjusted." | Auto-adjust quantity, show toast |
| Place order — run closed | "This run has closed. Orders are no longer being accepted." | Disable order UI, show closed state |
| Place order — network error | "Couldn't place your order. Check your connection and try again." | Retry button, keep form data |
| Place order — duplicate | "You already have an order in this run. Update it instead." | Switch to "Update Order" mode |
| Delete menu item — has orders | "Can't delete [Item] — it has orders. Toggle availability instead." | Suggest availability toggle |
| Delete template — not owner | "Only the creator can delete this template." | Disable delete button, show tooltip |
| Import JSON — invalid format | "This file doesn't look like a valid menu template. Check the format and try again." | Show expected format example |
| Import JSON — server error | "Couldn't import the template. Try again or contact support if it persists." | Retry button |
| SignalR disconnected | "Live updates disconnected. Showing last known data." | Auto-reconnect indicator, manual refresh button |
| Deadline passed — late order | "The ordering deadline has passed. This run is now closed." | Redirect to closed view |
| Create run — validation | "Please fill in all required fields." | Highlight invalid fields inline |
| Price — invalid format | "Enter a valid price (e.g., 45.00)" | Inline validation on blur |
| Name — too long | "Name must be 150 characters or less" | Character counter: "142/150" |
| Notes — too long | "Notes must be 500 characters or less" | Character counter: "480/500" |

### 9.5 Success Messages (Toasts)

| Event | Toast Message |
|-------|---------------|
| Run created | "Coffee run created! Share it with the team." |
| Run published | "Run is live! Team members can now order." |
| Run closed | "Run closed. [N] orders · R[total] total." |
| Run cancelled | "Run cancelled. All orders have been removed." |
| Order placed | "Order placed! R[total] — [Initiator] will collect." |
| Order updated | "Order updated! New total: R[total]." |
| Order deleted | "Order removed." |
| Order confirmed | "[Name]'s order confirmed." |
| Order picked up | "[Name] picked up their order! 🎉" |
| Menu item added | "[Item] added to menu." |
| Menu item updated | "[Item] updated." |
| Menu item deleted | "[Item] removed from menu." |
| Template created | "Template saved! Use it to start future runs." |
| Template updated | "Template updated." |
| Template archived | "Template archived." + `[Undo]` |
| Template imported | "Imported [N] items into [Template Name]." |
| Totals copied | "Order summary copied to clipboard." |
| Deadline extended | "Deadline extended to [time]." |

### 9.6 Confirmation Dialogs

| Action | Title | Body | Confirm Button | Cancel Button |
|--------|-------|------|----------------|---------------|
| Close run | Close this run? | "[N] orders · R[total] total. No more orders will be accepted." | `Close Run` | `Keep Open` |
| Cancel run | Cancel this run? | "All [N] orders will be removed. This cannot be undone." | `Cancel Run` | `Keep Running` |
| Delete run | Delete this run? | "This will permanently delete the run and all orders." | `Delete` | `Keep` |
| Delete order | Remove your order? | "Your order of R[total] will be removed." | `Remove Order` | `Keep Order` |
| Delete menu item | Remove [Item]? | "This item will be removed from the menu." | `Remove` | `Cancel` |
| Delete template | Delete [Template]? | "This will permanently delete the template and all its items." | `Delete` | `Cancel` |
| Archive template | Archive [Template]? | "The template will be hidden from the active list but can be restored." | `Archive` | `Cancel` |
| Publish run | Publish this run? | "The team will be notified and can start ordering. Make sure your menu is ready." | `Publish` | `Review Menu` |

---

## 10. Design Tokens

### 10.1 Color Tokens

```
--color-primary:        #7C3AED    /* Purple — primary actions */
--color-primary-hover:  #6D28D9
--color-primary-light:  #EDE9FE

--color-success:        #166534    /* Green — open, confirmed, picked up */
--color-warning:        #854D0E    /* Yellow/amber — draft, low stock */
--color-danger:         #991B1B    /* Red — cancelled, errors */
--color-info:           #1E40AF    /* Blue — confirmed, info */
--color-closed:         #1F2937    /* Dark — closed state */
--color-closing:        #9A3412    /* Orange — closing grace period */

--color-bg-primary:     #FFFFFF
--color-bg-secondary:   #F9FAFB
--color-bg-tertiary:    #F3F4F6

--color-text-primary:   #111827
--color-text-secondary: #6B7280
--color-text-tertiary:  #9CA3AF
--color-text-inverse:   #FFFFFF

--color-border:         #E5E7EB
--color-border-focus:   #7C3AED

--color-stock-high:     #166534    /* > 50% remaining */
--color-stock-medium:   #854D0E    /* 10-50% remaining */
--color-stock-low:      #991B1B    /* < 10% remaining */
--color-stock-out:      #6B7280    /* 0 remaining */
```

### 10.2 Spacing Tokens

```
--space-xs:   4px
--space-sm:   8px
--space-md:   16px
--space-lg:   24px
--space-xl:   32px
--space-2xl:  48px
```

### 10.3 Typography Tokens

```
--font-family:      'Inter', system-ui, -apple-system, sans-serif

--text-xs:          12px / 16px   /* Badges, helper text */
--text-sm:          14px / 20px   /* Body text, labels */
--text-base:        16px / 24px   /* Primary content */
--text-lg:          18px / 28px   /* Section headers */
--text-xl:          24px / 32px   /* Page titles */
--text-2xl:         32px / 40px   /* Hero totals */
--text-3xl:         40px / 48px   /* Grand total (summary) */

--font-normal:      400
--font-medium:      500
--font-semibold:    600
--font-bold:        700
```

### 10.4 Border Radius Tokens

```
--radius-sm:    4px   /* Badges, small elements */
--radius-md:    8px   /* Cards, inputs, buttons */
--radius-lg:    12px  /* Dialogs, large cards */
--radius-xl:    16px  /* Mobile bottom sheets */
--radius-full:  9999px /* Pills, avatars */
```

---

## 11. Animation Specifications

### 11.1 Timing Functions

```
--ease-out:       cubic-bezier(0.0, 0.0, 0.2, 1)   /* Enter animations */
--ease-in:        cubic-bezier(0.4, 0.0, 1, 1)     /* Exit animations */
--ease-standard:  cubic-bezier(0.4, 0.0, 0.2, 1)   /* General transitions */
--ease-bounce:    cubic-bezier(0.34, 1.56, 0.64, 1) /* Micro-interactions */
```

### 11.2 Animation Catalog

| Animation | Duration | Timing | Trigger |
|-----------|----------|--------|---------|
| Card enter | 200ms | ease-out | Run appears in list |
| Card exit | 150ms | ease-in | Run deleted/archived |
| Item enter | 200ms | ease-out | Menu item added |
| Item exit | 150ms | ease-in | Menu item removed |
| Toast enter | 300ms | ease-out | Notification appears |
| Toast exit | 200ms | ease-in | Notification dismissed |
| Dialog enter | 250ms | ease-out | Modal opens |
| Dialog exit | 200ms | ease-in | Modal closes |
| Bottom sheet enter | 300ms | ease-out | Mobile dialog opens |
| Bottom sheet exit | 250ms | ease-in | Mobile dialog closes |
| Number change | 150ms | ease-bounce | Stepper value changes |
| Badge change | 200ms | ease-standard | Status transition |
| Tab switch | 150ms | ease-standard | Tab navigation |
| Skeleton pulse | 1.5s | ease-in-out | Loading state |
| Countdown pulse | 500ms | ease-bounce | Last 60 seconds |
| Confetti burst | 1.5s | custom | Order picked up |

---

## 12. Notification Strategy

### 12.1 Notification Channels

| Channel | When Used | Example |
|---------|-----------|---------|
| In-app toast | Real-time events while app is open | "Sarah placed an order" |
| In-app banner | State changes affecting current view | "Run closing in 5 min" |
| Push notification | App is in background | "New coffee run from Alex" |
| Email (future) | Critical events when offline | "Your order was picked up" |

### 12.2 Notification Permissions

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Stay in the loop ☕                                     │
│                                                         │
│  Get notified when:                                     │
│                                                         │
│  ☑  A new coffee run starts                            │
│  ☑  An order is placed in your run                     │
│  ☑  A run you're in is closing soon                    │
│  ☑  A run you're in is closed                          │
│  ☑  Your order status changes                          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Enable Notifications                      │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Maybe later]                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 13. Error Handling Strategy

### 13.1 Error States by Severity

| Severity | UI Treatment | Example |
|----------|-------------|---------|
| **Info** | Toast (auto-dismiss 4s) | "Order placed" |
| **Warning** | Toast with action (10s) | "Item sold out — adjust order?" |
| **Error** | Inline form error + toast | "Couldn't save — check connection" |
| **Critical** | Full-screen error view | "Service unavailable" |

### 13.2 Connection Loss Handling

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  Connection lost                                    │
│  Showing last known data. Reconnecting...               │
│  [Refresh Now]                                          │
└─────────────────────────────────────────────────────────┘
```

- SignalR connection indicator in header (green/red dot)
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- After 3 failed reconnects: show manual refresh button
- Queue mutations while offline; replay on reconnect (optimistic with rollback)

### 13.3 Optimistic Update Rollback

```
User action → Optimistic UI update → API call
                                        │
                                   Success → Toast confirmation
                                        │
                                   Failure → Revert UI + error toast
                                              "Couldn't update order.
                                               Your changes were not saved."
```

---

## 14. Onboarding (First-Time User)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Welcome to Coffee Runs! ☕                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  1. Start a run                                   │ │
│  │     Set a deadline and build your menu            │ │
│  │                                                   │ │
│  │  2. Team members order                            │ │
│  │     They pick items and add notes                 │ │
│  │                                                   │ │
│  │  3. Close and collect                             │ │
│  │     See exactly what to order and who owes what   │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Got it — Let's Go!                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Contextual hints (dismissable, shown once):**
- First time viewing a run: "Tap items to add them to your order"
- First time as initiator: "Add items to your menu, then publish when ready"
- First time seeing deadline: "Orders close when the timer reaches zero"

---

## 15. Summary

This UX design transforms the Coffee Run feature from a functional single-page app into a modern, real-time, multi-role experience. Key improvements over the current UX:

| Current | Rethought |
|---------|-----------|
| Single page, no structure | Multi-screen with clear information architecture |
| No real-time updates | SignalR-driven live updates with toast notifications |
| No deadline or urgency | Countdown timers, closing grace period, auto-close |
| Flat menu list | Categorized, collapsible, sortable menu with stock limits |
| No run summary | Comprehensive initiator summary with per-person and per-item breakdowns |
| `prompt()` for templates | Polished dialog with scope selection |
| No notifications | Multi-channel notifications (in-app, push, email future) |
| No order status | Three-stage order tracking (Placed → Confirmed → PickedUp) |
| No search/filter | Paginated list with status, initiator, and date filters |
| Hardcoded currency | Configurable currency via design tokens |
| No accessibility | Full keyboard navigation, screen reader support, WCAG AA contrast |
| No mobile optimization | Mobile-first with thumb-zone layout, bottom sheets, gestures |
