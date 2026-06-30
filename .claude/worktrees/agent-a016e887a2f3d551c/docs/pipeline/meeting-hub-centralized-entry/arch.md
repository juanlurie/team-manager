# Architecture: Meeting Hub — Centralized Meeting Entry Points

## Problem Statement

The application currently exposes 3 separate meeting-related entries in the primary navigation sidebar:

| Nav Entry | Route | Purpose |
|-----------|-------|---------|
| Meetings | `/meetings` | Meeting Planner — ad-hoc session creation/management |
| Meeting Series | `/meeting-series` | Coordinated multi-meeting scheduling |
| My Meetings | `/my-meetings` | Personalized view of assigned meetings |

Additionally, there is a 4th route `/my-meeting-series` that is not in the navigation at all.

**UX Impact:**
- Users must navigate between 3 different screens to manage all meeting-related tasks
- The sidebar is cluttered with 3 related entries (plus Meeting Types in secondary nav)
- Context switching between screens is jarring — each has its own header, layout, and style
- "My Meetings" and "Meeting Series" have overlapping information (series items vs sessions)
- Mobile users suffer most — 3 separate entries in the "More" sheet

## Proposed Solution

Create a **Meetings Hub** at `/meetings` that consolidates all meeting views under a single navigation entry with tab-based navigation.

### Hub Structure

```
/meetings                          → Hub landing (redirects to /meetings/sessions)
/meetings/sessions                 → Meeting Planner (current /meetings)
/meetings/series                   → Meeting Series list (current /meeting-series)
/meetings/my-meetings              → My Meetings (current /my-meetings)
/meetings/my-series                → My Meeting Series (current /my-meeting-series)
/meetings/locations                → Locations config (current /slot-locations, moved from secondary nav)
```

### Navigation Changes

**PRIMARY_NAV** — Replace 3 entries with 1:
```typescript
// Before:
{ path: '/meetings',       icon: 'event',           label: 'Meetings'     },
{ path: '/meeting-series', icon: 'calendar_month',  label: 'Meeting Series' },
{ path: '/my-meetings',    icon: 'event_available', label: 'My Meetings' },

// After:
{ path: '/meetings', icon: 'event', label: 'Meetings' },
```

**SECONDARY_NAV** — Remove `/slot-locations` (moved into hub):
```typescript
// Before:
{ path: '/slot-locations', icon: 'room', label: 'Locations' },

// After: (removed — accessible via Meetings Hub > Locations tab)
```

**MOBILE** — In the "More" sheet, replace 3 entries with 1:
```typescript
// Before:
{ path: '/meetings',       icon: 'event',          label: 'Meetings'      },
{ path: '/meeting-series', icon: 'calendar_month', label: 'Meeting Series' },
{ path: '/my-meetings',    icon: 'event_available',label: 'My Meetings'   },

// After:
{ path: '/meetings', icon: 'event', label: 'Meetings' },
```

## Route Structure

### New `meetings.routes.ts`

```typescript
export const MEETINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meetings-hub.component').then(m => m.MeetingsHubComponent),
    children: [
      { path: '', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'sessions', loadComponent: () => import('./sessions/meeting-planner.component') },
      { path: 'series', loadChildren: () => import('../meeting-series/meeting-series.routes') },
      { path: 'my-meetings', loadComponent: () => import('./my-meetings.component') },
      { path: 'my-series', loadComponent: () => import('./my-meeting-series.component') },
      { path: 'locations', loadComponent: () => import('./locations-config.component') },
    ]
  },
  // Keep detail/create routes at top level for backward compat
  { path: ':id', loadComponent: () => import('./meeting-detail.component') },
  { path: 'create', loadComponent: () => import('./meeting-create-page.component') },
];
```

### Old Route Redirects (in `app.routes.ts`)

```typescript
// Backward compatibility redirects
{ path: 'meeting-series', redirectTo: 'meetings/series', pathMatch: 'full' },
{ path: 'meeting-series/:id', redirectTo: 'meetings/series/:id', pathMatch: 'full' },
{ path: 'my-meetings', redirectTo: 'meetings/my-meetings', pathMatch: 'full' },
{ path: 'my-meeting-series', redirectTo: 'meetings/my-series', pathMatch: 'full' },
{ path: 'slot-locations', redirectTo: 'meetings/locations', pathMatch: 'full' },
```

## Component Changes

### New Component: `meetings-hub.component.ts`

A wrapper component that provides:
- Tab bar at the top: Sessions | Series | My Meetings | My Series | Locations
- Router outlet below for tab content
- Active tab highlighting based on current route
- Responsive: tabs scroll horizontally on mobile, full width on desktop

```typescript
@Component({
  selector: 'app-meetings-hub',
  template: `
    <div class="hub">
      <nav class="hub-tabs">
        <a class="hub-tab" routerLink="sessions" routerLinkActive="active">Sessions</a>
        <a class="hub-tab" routerLink="series" routerLinkActive="active">Series</a>
        <a class="hub-tab" routerLink="my-meetings" routerLinkActive="active">My Meetings</a>
        <a class="hub-tab" routerLink="my-series" routerLinkActive="active">My Series</a>
        <a class="hub-tab" routerLink="locations" routerLinkActive="active">Locations</a>
      </nav>
      <router-outlet />
    </div>
  `
})
```

### Moved Components

| Current Location | New Location | Notes |
|-----------------|--------------|-------|
| `features/meetings/meeting-planner/` | `features/meetings/sessions/` | Rename folder, no code changes |
| `features/meetings/meeting-detail/` | `features/meetings/` | Stays, just route changes |
| `features/meetings/meeting-create-page/` | `features/meetings/` | Stays, just route changes |
| `features/meetings/meeting-form-dialog/` | `features/meetings/` | No changes |
| `features/meeting-series/meeting-series-list.component.ts` | `features/meeting-series/` | No changes, loaded via child route |
| `features/meeting-series/my-meetings.component.ts` | `features/meetings/my-meetings.component.ts` | Move + update imports |
| `features/meeting-series/my-meeting-series.component.ts` | `features/meetings/my-meeting-series.component.ts` | Move + update imports |
| `features/slot-locations/slot-locations.component.ts` | `features/meetings/locations-config.component.ts` | Move + update imports |

### Components That Stay Unchanged

- All `features/meeting-series/*` components except the 2 moved above — they load as child routes under `/meetings/series`
- All backend code — no API changes needed
- All services and models — no changes

## UX Flow

### Desktop
```
┌─────────────────────────────────────────────────┐
│ Sidebar  │  Meetings Hub                        │
│          │  ┌─────────────────────────────────┐ │
│ Dashboard│  │ [Sessions] Series My Meetings... │ │  ← Tab bar
│ Sprints  │  ├─────────────────────────────────┤ │
│ Features │  │                                  │ │
│ Meetings │  │   Tab content (router-outlet)    │ │
│ (active) │  │                                  │ │
│          │  │                                  │ │
│          │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Mobile
```
┌─────────────────────────┐
│ Meetings Hub            │
│ ┌─────────────────────┐ │
│ │[Sessions]│Series│My │ │  ← Scrollable tabs
│ ├─────────────────────┤ │
│ │                     │ │
│ │  Tab content        │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ [Dashboard] [Sprints]   │  ← Bottom nav
│ [Win] [Team] [More]     │
└─────────────────────────┘
```

## Migration Strategy

### Route Redirects
All old routes redirect to new locations via `redirectTo` in `app.routes.ts`. This preserves:
- Bookmarks
- Deep links from emails/notifications
- External integrations

### Navigation Cleanup
Remove old entries from PRIMARY_NAV, SECONDARY_NAV, MORE_NAV, and BOTTOM_NAV. Only the new `/meetings` entry remains.

### Gradual Deprecation
Keep old route patterns working via redirects for at least one release cycle. No breaking changes.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken bookmarks | Medium | Redirects in app.routes.ts handle all old paths |
| Tab bar too wide on small screens | Low | Horizontal scroll on mobile, or collapse to dropdown |
| Child route complexity | Low | Meeting series routes stay as-is, just nested under hub |
| Import path breaks | Low | Update imports when moving components; Angular compiler catches errors |
| SEO/bookmark confusion | Low | Redirects are permanent; users will naturally use new URLs |
| Performance (lazy loading) | None | All tabs use lazy loading; hub component is lightweight |
