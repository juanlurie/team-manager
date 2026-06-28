# Architecture: Dashboard Helper Messages

## Overview

Add subtle, non-intrusive helper hints to the dashboard and text-input areas:

1. **Ctrl+P / Cmd+P hint** — inform users the command palette is available via keyboard shortcut
2. **@-mention hint** — inform users they can `@mention` team members in filter/search inputs

These hints should be **muted, small, and fade into the background** — visible enough to discover, subtle enough to ignore once known.

---

## Design Decisions

### No new shared component

The hints are simple enough (a single `<span>` with muted styling) that creating a shared `HintLabelComponent` would be over-engineering. Instead, a **CSS utility mixin pattern** (a single CSS class or inline style block reused via a const/type) will be used across components. This avoids adding another standalone component import for trivial output.

### Two hint types

| Type | Location | Behavior |
|------|----------|----------|
| `keyboard-hint` | Dashboard page, bottom-right of content area | Static text: `Ctrl+P` with a small keyboard icon |
| `mention-hint` | Below search/filter inputs | Static text: `@mention a teammate` appears below the input |

### Keyboard hint location

The `Ctrl+P` hint will be placed at the **bottom of the dashboard content**, just before the page-wrap closes. This is an area the user naturally reaches after scanning all dashboard sections. It avoids cluttering the top of the page.

### @-mention hint placement

- **FilterBarComponent** — rendered below the search `<input>` as a small muted line, only when no mention is active and the input is not focused (so it doesn't interfere with typing)
- **CommentsComponent** — added as a subtle suffix to the existing placeholder `"Add comment… @name to notify"`
- **SearchInputComponent** — new optional `@Input() mentionHint: string` property; when set, renders a small muted `<span>` below the form field

---

## Component Tree Modifications

### 1. `SprintDashboardComponent` (`features/dashboard/sprint-dashboard/sprint-dashboard.component.ts`)

**Additions:**
- A `<div class="dashboard-hint">` block near the end of the template (before the empty-state div, after all content sections)
- Contains a small keyboard icon + `"Ctrl+P  Quick navigation"` text
- Hidden on mobile (where keyboard shortcuts are irrelevant) via `@if (!isMobile())`

**Style additions (inline):**
```css
.dashboard-hint {
  text-align: right;
  padding: 8px 0;
  font-size: 0.68rem;
  opacity: 0.25;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  user-select: none;
}
.dashboard-hint:hover { opacity: 0.5; }
```

### 2. `FilterBarComponent` (`shared/components/filter-bar/filter-bar.component.ts`)

**Additions:**
- New `@Input() mentionHint = 'Type @ to mention a team member'`
- After the search input wrapper's `<div>` (after the mention dropdown div closes), add a muted hint line that shows **only when** `mentionActive()` is false and the search text is empty

**Template addition (after line 48, before line 49's `@if (activeMentions()...)`):**
```html
@if (mentionHint() && !mentionActive() && !search()) {
  <div class="fb-mention-hint">{{ mentionHint() }}</div>
}
```

**Style additions:**
```css
.fb-mention-hint {
  font-size: 0.65rem;
  opacity: 0.2;
  padding: 0 14px 6px;
  line-height: 1;
  user-select: none;
}
```

### 3. `CommentsComponent` (`shared/comments/comments.component.ts`)

**Change:**
- Update the placeholder text from `"Add comment…"` to `"Add comment… @name to notify"`
- This is the simplest, most subtle approach — no structural changes needed

### 4. `SearchInputComponent` (`shared/components/search-input/search-input.component.ts`)

**Additions:**
- New `@Input() mentionHint = ''`
- When `mentionHint` is non-empty, render a small `<span>` below the form field

**Template addition (after the `</mat-form-field>` closing tag):**
```html
@if (mentionHint()) {
  <div class="si-mention-hint">{{ mentionHint() }}</div>
}
```

**Style additions:**
```css
.si-mention-hint {
  font-size: 0.65rem;
  opacity: 0.2;
  padding: 2px 0 0 2px;
  line-height: 1;
  user-select: none;
}
```

---

## Data Flow

No new signals, services, or complex state. All hints are **static**:
- `FilterBarComponent.mentionHint` — `@Input()`, set by parent
- `SearchInputComponent.mentionHint` — `@Input()`, set by parent
- `SprintDashboardComponent` — hint is hardcoded in template
- `CommentsComponent` — placeholder is a hardcoded string

```
ParentComponent
  └─ FilterBarComponent
       └─ mentionHint: string (static input)
  └─ SearchInputComponent
       └─ mentionHint: string (static input)
```

---

## Styling Approach

| Property | Value | Rationale |
|----------|-------|-----------|
| `font-size` | `0.65rem – 0.68rem` | Smaller than body text (0.85rem) |
| `opacity` | `0.2 – 0.25` | Nearly invisible; user must look for it |
| `opacity:hover` | `0.45 – 0.5` | Slight reveal on hover, like a secret |
| `user-select` | `none` | Not interactive text |
| `color` | Inherit (matches `#e0e0e0` through DOM) | No extra color declaration needed |

This keeps the hints consistent with the existing color palette without adding new CSS variables.

---

## Visibility Rules

| Component | Hint visible when… | Hint hidden when… |
|-----------|-------------------|-------------------|
| `SprintDashboardComponent` | Desktop viewport (`width >= 768px`) | Mobile viewport |
| `FilterBarComponent` | `mentionHint` is set AND `mentionActive()` is false AND `search()` is empty | User is actively typing or @-mention dropdown is open |
| `SearchInputComponent` | `mentionHint` is non-empty | `mentionHint` is empty string |
| `CommentsComponent` | Always (in placeholder text) | N/A |

---

## File Changes

### Modified files:
| File | Change |
|------|--------|
| `team-manager-ui/src/app/features/dashboard/sprint-dashboard/sprint-dashboard.component.ts` | Add `@if (!isMobile())` + keyboard hint block at bottom of template, add hint CSS style |
| `team-manager-ui/src/app/shared/components/filter-bar/filter-bar.component.ts` | Add `mentionHint` input, add hint template block, add `.fb-mention-hint` CSS |
| `team-manager-ui/src/app/shared/components/search-input/search-input.component.ts` | Add `mentionHint` input, add hint template block, add `.si-mention-hint` CSS |
| `team-manager-ui/src/app/shared/comments/comments.component.ts` | Update placeholder from `"Add comment…"` to `"Add comment… @name to notify"` |

### New files:
None. The hints are small enough to inline.

---

## Mobile Consideration

Keyboard shortcuts (`Ctrl+P`) are irrelevant on mobile. The keyboard hint on the dashboard is **conditionally rendered** only on non-mobile viewports. We can detect mobile by checking `window.innerWidth < 768` — consistent with the existing `isMobile` pattern in `AppComponent`. However, that signal lives in `AppComponent`, not `SprintDashboardComponent`. Two options:

- **Option A (recommended):** Use a simple `@media` CSS query to hide the hint on small screens instead of adding a signal to the dashboard component. Simpler and avoids duplication.
- **Option B:** Add `isMobile` as a `signal` in `SprintDashboardComponent` using `@HostListener`.

**Decision: Option A** — CSS-only hiding. Add `display:none` when `max-width: 767px` via a small inline `@media` block.

---

## Future Extensibility

The hint pattern is trivially extensible:
- Additional keyboard hints (`Shift+?` for help, etc.) can be added alongside the Ctrl+P hint
- The mention hint text can be customized per parent via the `@Input()` property
- If hints become more complex (e.g., dismissible "did you know" tips), extract into a `HintLabelComponent` at `shared/components/hint-label/`
