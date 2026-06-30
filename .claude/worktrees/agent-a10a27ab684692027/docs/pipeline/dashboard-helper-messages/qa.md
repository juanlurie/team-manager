# QA Report: Dashboard Helper Messages

## Result: **PASS** (with issues)

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| Build | ✅ PASS | `npm run build` succeeds (0 errors, pre-existing warnings only) |
| 4 files modified | ✅ PASS | All 4 target files changed (verified via `git diff`) |
| SprintDashboardComponent | ⚠️ ISSUE | See #1, #2 below |
| FilterBarComponent | ✅ PASS | Full spec compliance |
| SearchInputComponent | ✅ PASS | Full spec compliance |
| CommentsComponent | ✅ PASS | Placeholder updated correctly |
| No regressions | ✅ PASS | Additive changes only — no existing logic/altered |
| Edge cases | ⚠️ ISSUES | See below |

---

## File-by-File Verification

### 1. `sprint-dashboard.component.ts` — Keyboard Hint

**Spec vs Implementation:**

| Property | Arch Spec | UX Spec | Actual | Status |
|----------|-----------|---------|--------|--------|
| `font-size` | `0.68rem` | `0.68rem` | `0.68rem` | ✅ |
| `opacity` (idle) | `0.25` | `0.25` (idle-dark) | `0.25` | ✅ |
| `opacity` (hover) | `0.5` | `0.45` | `0.45` | ⚠️ matches UX (arch typo) |
| `padding` | `8px 0` | `10px 0 4px` | `8px 0` | ⚠️ matches arch |
| `user-select` | `none` | `none` | `none` | ✅ |
| `transition` | not specified | `opacity 0.2s` | `opacity 0.2s` | ✅ |
| Mobile hidden (<768px) | CSS media query | CSS `display:none` at 767px | `@media (max-width:767px){ display:none }` | ✅ |
| `aria-hidden` | not mentioned | `true` | **missing** | ❌ **Issue #2** |
| Keyboard icon | yes | `keyboard` mat-icon, 14px | `mat-icon>keyboard</mat-icon` | ✅ (no inline size — inherits) |
| Text | `Ctrl+P  Quick navigation` | platform-detected | `Ctrl+P / ⌘+P  Quick navigation` | ⚠️ shows both instead of platform-detect |
| Empty state guard | — | "should NOT render when empty state shown" | **renders unconditionally** | ❌ **Issue #1** |

### 2. `filter-bar.component.ts` — Mention Hint

| Property | Spec | Actual | Status |
|----------|------|--------|--------|
| `mentionHint` input | `'Type @ to mention a team member'` | `input('Type @ to mention a team member')` | ✅ |
| Shown when | `!mentionActive() && !search()` | `mentionHint() && !mentionActive() && !search()` | ✅ |
| `font-size` | `0.65rem` | `0.65rem` | ✅ |
| `opacity` idle | `0.2` | `0.2` | ✅ |
| `opacity` hover | `0.45` | `0.45` | ✅ |
| `padding` | `0 14px 6px` | `0 14px 6px` | ✅ |
| `user-select` | `none` | `none` | ✅ |
| `transition` | `opacity 0.2s` | `opacity 0.2s` | ✅ |
| `aria-hidden` | `true` | `true` | ✅ |

### 3. `search-input.component.ts` — Mention Hint

| Property | Spec | Actual | Status |
|----------|------|--------|--------|
| `mentionHint` input | `''` default | `input('')` | ✅ |
| Conditional render | `@if (mentionHint())` | `@if (mentionHint())` | ✅ |
| `font-size` | `0.65rem` | `0.65rem` | ✅ |
| `opacity` idle | `0.2` | `0.2` | ✅ |
| `opacity` hover | `0.45` | `0.45` | ✅ |
| `padding` | `2px 0 0 2px` | `2px 0 0 2px` | ✅ |
| `user-select` | `none` | `none` | ✅ |
| `transition` | `opacity 0.2s` | `opacity 0.2s` | ✅ |
| `aria-hidden` | `true` | `true` | ✅ |

### 4. `comments.component.ts` — Placeholder Update

| Property | Spec | Actual | Status |
|----------|------|--------|--------|
| Placeholder text | `"Add comment… @name to notify"` | `"Add comment&#8230; @name to notify"` | ✅ |

---

## Issues Found

### Issue #1 (MEDIUM) — Dashboard hint visible on empty state

**Location:** `sprint-dashboard.component.ts:358-361`

The keyboard hint `<div class="dashboard-hint">` is placed **outside** all `@if` conditionals in the template, at the very end. It renders even when no sprint is selected and the "Select a sprint to view the dashboard" empty-state message is shown.

**UX spec (edge case #1):** "The keyboard hint should NOT render when the empty-state 'Select a sprint to view the dashboard.' is shown."

**Fix:** Wrap the hint block with `@if (selectedSprintId && summary() && !loading()) { ... }` or move it inside the existing content block.

### Issue #2 (LOW) — Missing `aria-hidden` on dashboard hint

**Location:** `sprint-dashboard.component.ts:358`

The `dashboard-hint` div does not have `aria-hidden="true"`. Both the FilterBar and SearchInput mention hints include it. The UX spec is explicit: "Hints should be hidden from screen readers using `aria-hidden`."

**Fix:** Add `aria-hidden="true"` to the dashboard hint div.

---

## Edge Cases Verified

| Edge Case | Result | Notes |
|-----------|--------|-------|
| FilterBar without `mentionHint` | ✅ | Default `'Type @ to mention a team member'` always renders the hint |
| FilterBar during typing/mention | ✅ | Hint hidden when `mentionActive()` or `search()` is truthy |
| SearchInput without `mentionHint` | ✅ | Default `''` → nothing rendered (component not currently used in any template) |
| Mobile viewport (<768px) — dashboard | ✅ | CSS `display:none` at `max-width: 767px` |
| Mobile viewport — mention hints | ✅ | No mobile hiding — correct per spec |
| Build with all changes | ✅ | No errors, only pre-existing warnings |
| Regression: search functionality | ✅ | No changes to search logic |
| Regression: mention dropdown | ✅ | No changes to mention logic |
| Regression: comments CRUD | ✅ | Placeholder text change only — no logic changes |

---

## Recommendations

1. **Fix Issue #1** — Guard the dashboard hint with the same `selectedSprintId && summary() && !loading()` condition so it doesn't appear in the empty state.
2. **Fix Issue #2** — Add `aria-hidden="true"` to the dashboard hint div.
3. **Consider** moving the inline icon sizing from the template to the CSS class for consistency (the `mat-icon` in the dashboard hint doesn't have explicit `font-size/width/height/line-height` unlike other icons in the app), though the current rendering is acceptable.
