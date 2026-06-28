## PR Review: System Features Showcase

### ✅ Strengths

1. **Architecture matches design docs** — Component structure, data flow, and section organization follow `arch.md` and `ux.md` closely.
2. **Good Angular patterns** — Standalone components, signals for state, `inject()` for DI, `@switch`/`@for` control flow, lazy-loaded route.
3. **Graceful error handling** — All API calls in `getSystemStats()` have `catchError(() => of(0))` fallbacks.
4. **Responsive design** — Breakpoints at 1200px, 900px, and 768px across all sections.
5. **MCP accordion with search** — Well-implemented expand/collapse with cross-domain tool filtering.
6. **HTTP method color coding** — GET/POST/PUT/PATCH/DELETE each have distinct colors in the MCP section.
7. **Feature cards are clickable** — Uses `RouterLink` to navigate to actual feature pages.

### ⚠️ Issues to Fix

**1. Duplicate API calls** — `FeaturesSectionComponent` calls `getSystemStats()` independently (line 74), while the parent `FeaturesShowcaseComponent` already fetches it (line 174). This causes 11 redundant HTTP requests. Pass stats down via `@Input()` instead.

**2. Missing `BOTTOM_NAV` entry** — The UX doc says "Also add to `BOTTOM_NAV` and `MORE_NAV` for mobile consistency." Showcase is in `PRIMARY_NAV` and `MORE_NAV` but not `BOTTOM_NAV`.

**3. Unused `SystemStats` fields** — `activeSprints`, `workItems`, `meetingSessions`, `tuiScreens`, `searchComponents`, `uiRoutes` are defined in the model but never fetched from API (hardcoded defaults only). Either fetch them or remove from the model.

**4. `ShowcaseDataService` provided in root** — `providedIn: 'root'` creates a singleton across the entire app. Since all data is showcase-specific static data + one-time stats fetch, consider removing `providedIn` and providing it at the component level instead.

### 💡 Suggestions

1. **Consider a `/api/v1/system/metadata` endpoint** — As noted in `arch.md` section 10, this would reduce 11 parallel calls to 1. Not urgent but worth tracking.

2. **MCP tool data could be externalized** — `getMcpDomains()` is ~200 lines of hardcoded tool definitions. Consider loading from a JSON asset file for easier maintenance.

3. **ARIA completeness** — The tablist has `role="tab"` but is missing `aria-selected`, `aria-controls`, and corresponding `tabpanel` roles on content containers.

4. **Stats bar loading skeleton** — The loading template uses hardcoded `@for (_ of [1,2,3,4,5,6,7,8,9,10])` which doesn't match the actual stat count (10 pills). Works but fragile.

### Summary

| Category | Rating |
|---|---|
| Architecture | ✅ Good |
| Code Quality | ✅ Good |
| Performance | ⚠️ Duplicate API calls |
| Accessibility | ⚠️ Partial ARIA |
| UX Polish | ✅ Good |
| Navigation | ⚠️ Missing bottom nav |

**Verdict:** Solid implementation with minor issues. Fix the duplicate API calls and add to `BOTTOM_NAV` before merging.
