# Responsive UI

Always implement both desktop and mobile layouts for any UI work. Mobile breakpoint is `640px`.

## Rules

- Every new component or layout change must include a `@media (max-width: 640px)` block
- Grids/multi-column layouts must collapse to single column on mobile
- Fixed-width buttons and inputs must become `width: 100%` or wrap on mobile
- Dialogs: `width: 100vw`, `max-height: 100dvh`, positioned at bottom on mobile (use `panelClass: 'dark-dialog'` which already handles this via global styles — verify it covers the component)
- Horizontal button rows must wrap or stack vertically
- Touch targets must be at least 44px tall
- Horizontal overflow (`white-space: nowrap`) must be guarded with `overflow: hidden; text-overflow: ellipsis` or removed on mobile
- Tables/grids with many columns must either scroll horizontally with `-webkit-overflow-scrolling: touch` or reformat as stacked cards

## Checklist before marking work done

1. Does it look correct on a 390px wide screen?
2. Are tap targets large enough?
3. Do any fixed widths break the layout?
4. Does horizontal scroll appear where it shouldn't?
