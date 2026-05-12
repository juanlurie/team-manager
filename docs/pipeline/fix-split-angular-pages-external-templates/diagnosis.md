# Diagnosis: Split Angular Pages - External Templates & Styles

## Bug Description
- Split Angular pages so they're simpler - CSS and HTML should not be in the same file
- Identify screens where functionality is duplicated but shared components aren't used

---

## Root Cause

### Part 1: Inline Templates & Styles (ALL Components)

**ALL 75+ component files in the codebase use inline `template: \`...\`` and `styles: [\`...\`]` instead of external files via `templateUrl` and `styleUrls`.**

This is a pervasive architectural decision that:
- Makes component files unnecessarily large (mixing TypeScript logic, HTML template, and CSS styles)
- Prevents proper IDE/LSP syntax highlighting for HTML/SCSS within template strings
- Makes templates harder to search and refactor
- Prevents SCSS features like `@import`, variables, and mixins from being used properly in component styles

### Largest/Priority Files by Line Count

| File | Total Lines | Template Lines | Styles Lines | Priority |
|------|-------------|----------------|--------------|----------|
| `features/export/export-panel/export-panel.component.ts` | 931 | 89 | 0 | HIGH (massive logic) |
| `features/leave/leave-overview/leave-overview.component.ts` | 846 | 280 | 14 | HIGH |
| `features/wheel/wheel.component.ts` | 804 | 319 | 30 | HIGH |
| `core/components/k-picker/k-picker-dialog.component.ts` | 703 | 79 | 226 | HIGH |
| `features/sprints/rapid-fire-dialog/rapid-fire-dialog.component.ts` | 610 | 206 | 108 | HIGH |
| `features/team/team-member-personal/timesheet-tab/timesheet-tab.component.ts` | 580 | 169 | 93 | HIGH |
| `shared/components/filter-bar/filter-bar.component.ts` | 578 | 130 | 176 | HIGH |
| `features/dashboard/sprint-dashboard/sprint-dashboard.component.ts` | 565 | 290 | 25 | HIGH |
| `features/team/team-member-personal/team-member-personal.component.ts` | 554 | 300 | 4 | HIGH |
| `features/all-features/all-features.component.ts` | 527 | 223 | 21 | HIGH |

---

### Part 2: Duplicated Functionality

#### 1. CRITICAL: Duplicated `TaskFormDialogComponent` (Selector Conflict)

**File A:** `shared/components/task-form-dialog/task-form-dialog.component.ts` (262 lines)
- Selector: `app-task-form-dialog`
- Full-featured: feature selector, inline feature creation, type/status pickers, assignee selection, comments, edit/add modes
- Used by: `all-features`

**File B:** `features/team/team-member-personal/task-form-dialog/task-form-dialog.component.ts` (97 lines)
- Selector: `app-task-form-dialog` **(SAME SELECTOR - CONFLICT!)**
- Simpler: title + date picker only, for personal member tasks
- Uses `DatePickerComponent` from shared

**Risk:** These two components share the same selector `app-task-form-dialog` - they cannot coexist in the same module without one being overridden. This is a bug waiting to happen.

#### 2. `drawLeaveImage()` - Duplicated Canvas Logic (~250 lines total)

**Location A:** `features/export/export-panel.component.ts` (lines 233-366, ~134 lines)
**Location B:** `features/leave/leave-overview/leave-overview.component.ts` (lines 723-841, ~119 lines)

Both build an identical canvas image:
- Title with sprint/date range
- Column headers for days
- Member rows with leave indicators
- Date formatting and download link generation

#### 3. `craftLabel()` Helper - Duplicated in 3 Components

**Files:**
- `export-panel.component.ts` (line 924)
- `rapid-fire-dialog.component.ts` (line 598)
- `team-list.component.ts` (line 282) - has `CRAFT_LABELS` constant that others could use

All map craft codes (DevBE, DevFE, QA, UX, PM, BA, DevOps) to human-readable labels.

#### 4. `STATUS_LABEL` / `STATUS_COLOR` Maps - Duplicated in 4+ Components

**Files with near-identical maps:**
- `all-features.component.ts` (lines 26-34)
- `sprint-dashboard.component.ts` (lines 29-37)
- `export-panel.component.ts` (lines 41-48)
- `sprint-list.component.ts` (lines 21-28)

**Note:** `StatusLabelPipe` exists at `core/pipes/status-label.pipe.ts` but is inconsistently used (only in `sprint-features`).

#### 5. `initials()` Name Abbreviation - Duplicated in 3 Components

**Files:**
- `leave-overview.component.ts` (line 706)
- `sprint-member-card.component.ts` (line 284)
- `rapid-fire-dialog.component.ts` (line 594)

All split full name into first letters of first/last name.

#### 6. Leave Badge CSS Classes - Duplicated in 3 Components

**Files with own `.leave-badge`, `.leave-annual`, `.leave-sick`, `.leave-other` styles:**
- `leave-overview.component.ts` (styles lines 343-346)
- `sprint-member-card.component.ts` (line 236, 297 - `leaveBadgeClass()`)
- `leave-import-dialog.component.ts` (line 260, 383 - `leaveBadgeClass()`)

---

## Fix Approach

### Phase 1: Extract Templates & Styles from LARGEST Pages (HIGH PRIORITY)

For each file, extract:
1. `template: \`...\`` content → `<component-name>.component.html`
2. `styles: [\`...\`]` content → `<component-name>.component.scss`
3. Update `@Component` decorator from:
   ```typescript
   template: `...`,
   styles: [`...`]
   ```
   To:
   ```typescript
   templateUrl: './<component-name>.component.html',
   styleUrls: ['./<component-name>.component.scss']
   ```

**Start with these 8 highest-impact files:**
1. `wheel.component.ts` (319 template + 30 style lines)
2. `leave-overview.component.ts` (280 template + 14 style lines)
3. `sprint-dashboard.component.ts` (290 template + 25 style lines)
4. `team-member-personal.component.ts` (300 template + 4 style lines)
5. `all-features.component.ts` (223 template + 21 style lines)
6. `rapid-fire-dialog.component.ts` (206 template + 108 style lines)
7. `timesheet-tab.component.ts` (169 template + 93 style lines)
8. `filter-bar.component.ts` (130 template + 176 style lines)

### Phase 2: Fix Duplicated `TaskFormDialogComponent` (CRITICAL)

**Option A (Recommended): Rename the personal task one**
- Change selector from `app-task-form-dialog` to `app-member-task-form-dialog`
- Change class name from `TaskFormDialogComponent` to `MemberTaskFormDialogComponent`

**Option B: Unify with a mode parameter**
- Add `mode: 'sprint' | 'personal'` input to shared component
- Show/hide fields based on mode

### Phase 3: Extract Shared Utilities (MEDIUM PRIORITY)

1. **Create `shared/constants/status.constants.ts`**:
   - Extract `STATUS_LABEL`, `STATUS_COLOR` maps
   - Ensure consistent with `StatusLabelPipe`

2. **Create `shared/constants/craft.constants.ts`**:
   - Extract `CRAFT_LABELS` from `team-list.component.ts`
   - Replace `craftLabel()` functions with import of this constant

3. **Create `shared/utils/string.utils.ts`**:
   - Extract `initials()` function
   - Replace all 3 duplicated implementations

4. **Create `shared/utils/leave-image.service.ts`**:
   - Extract `drawLeaveImage()` from both locations
   - Add proper typing for parameters

5. **Create shared leave-badge styles**:
   - Option A: Global styles in `styles.scss`
   - Option B: Create `LeaveBadgePipe` for class generation + shared CSS

---

## Files to Change

### Phase 1 - Extract Templates/Styles:
- `features/wheel/wheel.component.ts` → + `.html`, `.scss`
- `features/leave/leave-overview/leave-overview.component.ts` → + `.html`, `.scss`
- `features/dashboard/sprint-dashboard/sprint-dashboard.component.ts` → + `.html`, `.scss`
- `features/team/team-member-personal/team-member-personal.component.ts` → + `.html`, `.scss`
- `features/all-features/all-features.component.ts` → + `.html`, `.scss`
- `features/sprints/rapid-fire-dialog/rapid-fire-dialog.component.ts` → + `.html`, `.scss`
- `features/team/team-member-personal/timesheet-tab/timesheet-tab.component.ts` → + `.html`, `.scss`
- `shared/components/filter-bar/filter-bar.component.ts` → + `.html`, `.scss`

### Phase 2 - Fix TaskFormDialog Conflict:
- `features/team/team-member-personal/task-form-dialog/task-form-dialog.component.ts` (rename)
- Any imports referencing this component

### Phase 3 - Extract Shared Utilities:
- `shared/constants/status.constants.ts` (NEW)
- `shared/constants/craft.constants.ts` (NEW)
- `shared/utils/string.utils.ts` (NEW)
- `shared/utils/leave-image.service.ts` (NEW)
- Update all 8+ consumer files to use shared versions

---

## Regression Risk Areas

### High Risk:
1. **Template extraction** - Ensure no backtick escaping issues, verify all interpolation `{{ }}` works
2. **CSS extraction** - Ensure SCSS syntax is valid, check for any `:host` or `::ng-deep` that need adjustment
3. **TaskFormDialog rename** - Ensure all consumers are updated, check both declarations in modules

### Medium Risk:
1. **`drawLeaveImage()` extraction** - Canvas context operations are sensitive; test image generation in both export and leave-overview
2. **Constant extraction** - Ensure enum/string values match exactly between all copies

### Low Risk:
1. **`initials()` and `craftLabel()`** - Pure functions, easy to test
2. **Leave badge styles** - Visual only, compare before/after

---

## Acceptance Criteria

- [ ] 8 largest page components have external `.html` and `.scss` files
- [ ] All builds cleanly (`ng build` succeeds)
- [ ] No template/CSS regressions (pages look identical)
- [ ] `TaskFormDialogComponent` selector conflict is resolved (both can exist)
- [ ] Duplicated helper functions are extracted to shared utilities
