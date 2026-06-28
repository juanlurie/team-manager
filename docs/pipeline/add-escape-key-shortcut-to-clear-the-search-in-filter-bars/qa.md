The feature is already implemented in both components. Let me find the test files and run the tests.
There are no tests in this project (no `spec.ts` files, no test builder configured). Let me verify the build compiles cleanly.
Build succeeded with only pre-existing warnings (none related to the Escape feature). 

**Verification summary:**

The feature is **already implemented** in both components as specified in the architecture doc:

1. **`filter-bar.component.ts:473-477`** — Escape clears search when non-empty after @mention handler returns early:
   ```typescript
   if (event.key === 'Escape' && this.search()) {
     event.preventDefault();
     this.search.set('');
     this.searchChange.emit('');
   }
   ```

2. **`search-input.component.ts:81-85`** — Escape clears search via existing `clear()` method:
   ```typescript
   onKeydown(event: KeyboardEvent): void {
     if (event.key === 'Escape' && this.value()) {
       this.clear(event);
     }
   }
   ```

3. No formal test suite exists in this project (no `spec.ts` files, no test builder in `angular.json`). The build compiled with **0 errors** — only pre-existing warnings (budget sizes, Sass deprecations, unused imports) unrelated to this feature.

**Behavior coverage against UX spec:**
| Scenario | Status |
|---|---|
| Search non-empty + Escape → clears | ✅ |
| Search empty + Escape → nothing | ✅ |
| @mention open + 1st Escape → closes dropdown | ✅ (existing) |
| @mention open + 2nd Escape → clears search | ✅ |
| Clear button still works | ✅ (unchanged) |
| `searchChange`/`valueChange` emit empty string | ✅ |
