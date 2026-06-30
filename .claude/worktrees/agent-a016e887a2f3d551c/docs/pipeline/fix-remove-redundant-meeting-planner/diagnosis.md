# Diagnosis: Meeting Planner Redundancy Assessment

## Bug Description
"Do we still need the meeting planner or is it covered by meeting series?"

## Root Cause

This is not a traditional bug but a question about feature redundancy. After thorough analysis:

**Meeting Planner is NOT fully covered by Meeting Series.** They serve distinct use cases:

| Capability | Meeting Planner | Meeting Series |
|------------|----------------|----------------|
| Ad-hoc single sessions | Yes | No (requires series setup) |
| Session types (Workshop, Presentation, etc.) | Yes (5 types) | No (always "Discussion") |
| Manual slot booking by members | Yes | No (auto-assigned on confirm) |
| Edit session details after creation | Yes | No (auto-generated) |
| Cancel sessions | Yes | No (only unconfirm items) |
| Facilitator vs TeamMember slot types | Yes | No |
| Coordinated multi-meeting scheduling | No | Yes |
| Availability collection | No | Yes |
| Auto-confirmation logic | No | Yes |
| "My Meetings" personalized view | Broken (TODO filter) | Yes (proper implementation) |

**However, there is dead/redundant code that should be cleaned up:**

1. **"My Sessions" filter tab** in `meeting-planner.component.ts` — marked as `// TODO: filter by current user` and currently returns ALL sessions. This functionality is properly implemented by the Meeting Series "My Meetings" page (`/my-meetings`).

2. **Duplicated time grid UI** — The same weekly calendar grid pattern is duplicated across 5+ components (`meeting-create-page`, `meeting-form-dialog`, `meeting-series-create`, `meeting-series-slots`, `my-availability`). This is technical debt but not a functional issue.

## Fix Approach

1. **Keep Meeting Planner** — It provides unique value for ad-hoc session management.
2. **Remove the "My Sessions" filter tab** from the meeting planner — it's non-functional dead code that duplicates the proper "My Meetings" page.
3. **Leave the time grid duplication** for a future refactoring task — it's out of scope for this fix.

## Files to Change

| File | Change |
|------|--------|
| `team-manager-ui/src/app/features/meetings/meeting-planner/meeting-planner.component.ts` | Remove "My Sessions" filter tab and related code |

## Regression Risk Areas

- **Low**: Removing a non-functional filter tab. The "All" and "Open" filters remain intact.
- The "My Sessions" tab currently shows all sessions (same as "All"), so removing it changes no user-visible behavior.
- Users who need to see their assigned meetings should use the "My Meetings" page (`/my-meetings`) which is already in the primary navigation.
