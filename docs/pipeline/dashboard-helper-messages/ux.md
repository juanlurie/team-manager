# UX Design: Dashboard Helper Messages

## 1. Visual Design

### Color Palette

All hints inherit their color from the surrounding text (`#e0e0e0`), relying entirely on opacity for differentiation. No additional color tokens are introduced.

| Token | Value | Used In |
|-------|-------|---------|
| `--hint-opacity-idle` | `0.2` | Default hint state |
| `--hint-opacity-hover` | `0.45` | Mouse hover state |
| `--hint-opacity-idle-dark` | `0.25` | Keyboard hint (dashboard, darker background area) |

### Typography

| Property | Keyboard Hint | Mention Hint | Rationale |
|----------|--------------|--------------|-----------|
| Font | Roboto (inherited) | Roboto (inherited) | Consistent with app body |
| Weight | 400 (normal) | 400 (normal) | No emphasis needed |
| Size | `0.68rem` (~11px) | `0.65rem` (~10.5px) | Smaller than body text (0.85rem) and secondary labels (0.72-0.78rem) |
| Line height | `1.4` | `1` | Keyboard hint has icon+text on same line; mention hint is single-line |
| Letter-spacing | `0.02em` | `0.02em` | Slight breathing room at small sizes |

### Iconography

- **Keyboard hint**: Use a `keyboard` Material Icon (`mat-icon`) at `14px` size, opacity matching the text, positioned to the left of the text.
  - Rationale: The keyboard icon is a universal and immediately recognized symbol for keyboard shortcuts. MatIcon provides `keyboard` as a filled outline icon at no extra cost.
  - Sizing: `font-size: 14px; width: 14px; height: 14px; line-height: 14px` — consistent with other small icons in the app (chevrons, close buttons).

- **Mention hint**: No icon. Purely typographic with a subtle `@` symbol colored `#64b5f6` at `opacity: 0.4` inline in the text.
  - Rationale: The `@` symbol is the functional affordance; coloring it blue ties it to the existing mention-chip color (`#64b5f6`) and signals interactivity without being loud.

### Spacing

| Hint | Padding | Margin | Alignment |
|------|---------|--------|-----------|
| Keyboard hint | `padding: 10px 0 4px` | — | `text-align: right; display: flex; justify-content: flex-end` |
| FilterBar mention hint | `padding: 0 14px 6px` | — | Left-aligned with input text |
| SearchInput mention hint | `padding: 2px 0 0 2px` | — | Left-aligned with form field |

### Keyboard Hint Icon Style

```
<mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.4;flex-shrink:0">keyboard</mat-icon>
```

Placed to the left of the text, with a `4px` gap (`gap: 4px` on the flex container).

---

## 2. Interaction Design

### Hint Behavior Matrix

| Component | Idle | Hover | Typing (input focused) | Mention dropdown open | Dismissed |
|-----------|------|-------|------------------------|----------------------|-----------|
| **Keyboard hint** (dashboard) | Visible, opacity 0.25 | Opacity fades to 0.45 over 200ms | N/A (outside input) | N/A | CSS-only: hidden below 768px |
| **FilterBar mention hint** | Visible when `search()` is empty AND `mentionActive()` is false, opacity 0.2 | Opacity 0.45 over 200ms | Hidden immediately when user types | Hidden | Reappears when input cleared and mention closed |
| **SearchInput mention hint** | Visible when `mentionHint` is non-empty, opacity 0.2 | Opacity 0.45 over 200ms | Remains visible (below form field, outside focus scope) | N/A | Hidden when `mentionHint` cleared by parent |
| **Comments placeholder** | Always visible in placeholder text | N/A (placeholder) | Disappears naturally on first keystroke | N/A | N/A |

### Transition Animations

```css
transition: opacity 0.2s ease;
```

A single, consistent `0.2s ease` transition on the `opacity` property for hover states. This is:
- Fast enough to feel responsive
- Slow enough to avoid flicker during rapid mouse movement
- Matches the existing `transition` patterns in the app (`transition:background 0.15s`, `transition:filter 0.15s`)

### Keyboard Hint — No dismiss action

The hint is not dismissible. It sits at the bottom of the dashboard at very low opacity and fades further into the background once the user has seen it. If the user knows Ctrl+P, they ignore it. No "got it" button, no X — that would add noise.

### Mention Hint — Auto-hides during interaction

The hint below the FilterBar input disappears the moment the user starts typing or opens the @-mention dropdown. This prevents the hint from competing with the user's active task. It reappears when:
1. The search input is empty
2. No mention dropdown is active
3. The input loses focus (no cursor blinking)

This creates a "ghost hint" pattern — there when you need it, gone when you don't.

---

## 3. Micro-copy

### Hint Texts

| Location | Text | Rationale |
|----------|------|-----------|
| Dashboard keyboard hint | `Ctrl+P  Quick navigation` | Short, scannable. Uses the actual shortcut key. No verb ("press", "use") — the shortcut stands alone. Spaces between shortcut and label for readability. |
| FilterBar mention hint | `Type @ to mention a team member` | Verb-led ("Type @") tells the user what action to take. "mention" is the product term used elsewhere. |
| SearchInput mention hint | `@mention a teammate` | Shorter variant for tighter spaces. Uses the product's `@mention` convention directly. "teammate" instead of "team member" for compactness. |
| Comments placeholder | `Add comment… @name to notify` | Appended to existing placeholder. The `@name` mirrors the `@mention` pattern the user will type. "to notify" frames the purpose (notification) rather than the mechanism (mention). |

### Platform-Specific Shortcut

The keyboard hint should display `Ctrl+P` on Windows/Linux and `Cmd+P` on macOS. Detection approach:

```typescript
const isMac = navigator.platform.toLowerCase().includes('mac');
const shortcut = isMac ? 'Cmd+P' : 'Ctrl+P';
```

Render as a template variable so the hint text reads `{{ shortcut }}  Quick navigation`.

### Tone

All hints use:
- Lowercase (except the shortcut key)
- No punctuation (no periods, no exclamation marks)
- Minimal syllables
- Action-oriented verbs for mention hints ("Type", "mention")

---

## 4. Accessibility

### WCAG Compliance

**Important note**: These hints are *decorative/ancillary* content — they convey information already available elsewhere (command palette shortcut is in the palette itself; @-mention is discoverable by typing @). They are enhancement, not essential.

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.4.3 Contrast (minimum)** | Exempt — the hints are non-essential decorative text at ≤0.68rem. However, on hover the opacity reaches 0.45, which yields a contrast ratio of ~1.8:1 against the #0f1117 background. This is below 3:1, but acceptable because: (a) this is purely cosmetic non-informational content, and (b) the text inherits the full-contrast color on hover (0.45 opacity of #e0e0e0 = ~#bdbdbd, still low but intentionally so). |
| **1.4.11 Non-text contrast** | N/A — the keyboard icon is decorative and matches the text opacity. |
| **2.4.4 Link purpose** | N/A — hints are not links and not interactive. |

### Screen Reader Strategy

Hints should be hidden from screen readers using `aria-hidden="true"`:

```html
<div class="dashboard-hint" aria-hidden="true">
  <mat-icon>keyboard</mat-icon>
  Ctrl+P  Quick navigation
</div>
```

Rationale:
- The command palette shortcut is discoverable through the palette UI itself
- The @-mention feature is discoverable by typing `@`
- These hints are visual helpers for sighted users who might not notice the pattern
- Announcing "Type @ to mention a team member" on every filter-bar render would be noisy and frustrating for screen reader users

### Focus Management

- Hints have `user-select: none` — they cannot be focused, selected, or copied. They are not interactive elements.
- Hints do not participate in tab order (`tabindex` is not set, and since they are `aria-hidden`, they are skipped by screen readers).
- The comments placeholder change (`Add comment… @name to notify`) is the only hint that is not `aria-hidden` — it is part of the input's native placeholder, which screen readers already announce when the input receives focus.

---

## 5. Responsive Behavior

### Breakpoints

| Breakpoint | Viewport | Keyboard Hint | Mention Hints | Comments Placeholder |
|------------|----------|---------------|---------------|---------------------|
| Desktop | >= 1024px | Visible | Visible | Visible |
| Tablet | 768px - 1023px | Visible | Visible | Visible |
| Mobile | < 768px | Hidden (CSS `display: none`) | Visible | Visible |

### Mobile-specific decisions

**Keyboard hint hidden on mobile**: Keyboard shortcuts do not apply on touch devices. The decision in arch.md (Option A: CSS-only hiding at `max-width: 767px`) is correct:

```css
@media (max-width: 767px) {
  .dashboard-hint { display: none !important; }
}
```

**Mention hints remain visible on mobile**: The `@mention` feature is used on mobile via the soft keyboard. The hint is still useful.

**Comments placeholder unchanged on mobile**: The placeholder `Add comment… @name to notify` works at all widths. No changes needed.

---

## 6. States

### 6.1 Keyboard Hint (Dashboard)

```
┌─────────────────────────────────────────────┐
│                                             │
│  [all dashboard content above]              │
│                                             │
│  ─────────────────────────────────────      │
│                             ⌨  Ctrl+P       │  ← idle (opacity 0.25)
│                             Quick navigation│
└─────────────────────────────────────────────┘

On hover:
┌─────────────────────────────────────────────┐
│                             ⌨  Ctrl+P       │  ← hover (opacity 0.45)
│                             Quick navigation│
└─────────────────────────────────────────────┘

Below 768px: hidden entirely.
```

### 6.2 FilterBar Mention Hint

```
┌──────────────────────────────────────────────┐
│  🔍 ┌──────────────────────────┐             │
│     │                          │  FilterBtn  │
│     └──────────────────────────┘             │
│      Type @ to mention a team member          │  ← idle (opacity 0.2)
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  🔍 ┌──────────────────────────┐             │
│     │ @John                     │  FilterBtn  │
│     └──────────────────────────┘             │
│      ┌────────────────────────┐              │
│      │ @ John Smith           │              │  ← mention dropdown open
│      │ @ Jane Doe             │              │     hint HIDDEN
│      └────────────────────────┘              │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  🔍 ┌──────────────────────────┐             │
│     │ backlog                   │  FilterBtn  │
│     └──────────────────────────┘             │  ← typing, hint HIDDEN
└──────────────────────────────────────────────┘

On hover:
┌──────────────────────────────────────────────┐
│      Type @ to mention a team member          │  ← hover (opacity 0.45)
└──────────────────────────────────────────────┘
```

### 6.3 SearchInput Mention Hint

```
┌──────────────────────────────────────────┐
│  ┌──────────────────────────────────┐    │
│  │ 🔍  ┌─────────────────────┐  ✕  │    │
│  │     │                     │     │    │
│  │     └─────────────────────┘     │    │
│  └──────────────────────────────────┘    │
│  @mention a teammate                      │  ← idle (opacity 0.2)
└──────────────────────────────────────────┘

When mentionHint is empty (parent doesn't set it):
  — nothing renders
```

### 6.4 Comments Placeholder (no separate state — always in placeholder)

```
┌──────────────────────────────────────────┐
│  ┌──────────────────────────────┐  📤    │
│  │ Add comment… @name to notify │        │
│  └──────────────────────────────┘        │
└──────────────────────────────────────────┘

On first keystroke: placeholder text disappears (native behavior).
```

---

## 7. Full ASCII Mockups

### 7.1 Dashboard with Keyboard Hint

```
┌──────────────────────────────────────────────────────────────┐
│  Sprint Dashboard                                   │  v  │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│  │ 8 │ │ 3 │ │ 0 │ │12 │ │20 │ │ 2 │                      │
│  │Mbr│ │IP │ │Blk│ │Cmp│ │Pln│ │Lv │                      │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                      │
│                                                              │
│  Sprint Progress                                             │
│  ████████████████░░░░░░░░░░░░░ 5/12 done (42%)              │
│                                                              │
│  DISCUSSIONS (2)                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🔴 API rate limiting on search            In Progress │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🟡 Dark mode toggle for reports              Open    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                ⌨  Ctrl+P  Quick navigation  │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 FilterBar with Mention Hint

```
┌──────────────────────────────────────────────────────────────┐
│  Features                                    [+ New Feature] │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 🔍 ┌──────────────────────────────┐  │ Status │  ▼  │ ⋮ ││
│  │    │                              │  │ Team   │  ▼  │    ││
│  │    └──────────────────────────────┘  └─────────────────── ││
│  │    Type @ to mention a team member                        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Feature: API Rate Limiting                               ││
│  │ Status: In Progress  │  Team: Platform                   ││
│  │ Comments...                                               ││
│  │ ┌──────────────────────────────────┐                     ││
│  │ │ Add comment… @name to notify    │ 📤                  ││
│  │ └──────────────────────────────────┘                     ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 7.3 SearchInput with Mention Hint

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🔍  ┌─────────────────────────────────────────┐ ✕ │    │
│  │     │                                         │   │    │
│  │     └─────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────┘    │
│  @mention a teammate                                     │
└──────────────────────────────────────────────────────────┘
```

### 7.4 Comments Input with Updated Placeholder

```
┌──────────────────────────────────────────────────────────┐
│  💬 Comments (3)                                         │
│                                                          │
│  Apr 3 14:22  @John Smith this is ready for review       │
│  Apr 2 09:15  @Jane Doe can you take a look?             │
│  Mar 31 16:00  LGTM                                      │
│                                                          │
│  ┌──────────────────────────────────────────────┐  📤    │
│  │ Add comment… @name to notify                 │        │
│  └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### CSS Utility Pattern

Define a shared style block or CSS class for the hint style. Since the arch.md explicitly avoids a new component, the cleanest approach is a shared const string with the common hint styles:

```typescript
export const HINT_STYLE = `
  font-size: 0.65rem;
  opacity: 0.2;
  line-height: 1;
  user-select: none;
  transition: opacity 0.2s ease;
`;
```

Each component applies its own positioning (padding, alignment) as inline additions.

### Edge Cases

1. **Empty dashboard (no sprint selected)**: The keyboard hint should NOT render when the empty-state "Select a sprint to view the dashboard." is shown. The hint should only appear after content is loaded.

2. **Very long hint text**: The `mentionHint` `@Input()` is a plain string — if parents ever pass long text, the hint will wrap. This is acceptable; the container has no fixed width.

3. **Rapid show/hide cycles**: The `0.2s` transition prevents flicker. The FilterBar hint's visibility condition (`!search() && !mentionActive()`) changes synchronously with input, so the opacity transition will smooth the edge.

4. **SSR / no JavaScript**: The hint depends on Angular rendering. If JS is disabled, the app doesn't render at all — no concern.
