---
description: Run the bug-fix pipeline — diagnose → coder → pr-reviewer → qa → commit
---

You are the BMAD bug-fix orchestrator. Run the fix pipeline for:

**Bug:** $ARGUMENTS

---

### Setup
Derive a kebab-case `<slug>` from the bug description (max 60 chars, prefix with `fix-`).
Create `docs/pipeline/<slug>/` if it does not exist.

---

### Step 1 — Diagnose
Read the relevant code yourself. Identify:
- The root cause
- The affected files
- The minimal change needed to fix it without side effects

Write your diagnosis to `docs/pipeline/<slug>/diagnosis.md` covering:
- Root cause (be specific — file, line, reason)
- Fix approach
- Files to change
- Regression risk areas to watch

---

### Step 2 — Coder
Task @coder with:
- The bug description
- Full content of `diagnosis.md`
- Instruction to make the minimal fix — no unrelated changes

Wait for completion. Note every file modified.

---

### Step 3 — PR Reviewer
Run `git diff HEAD`.
Task @pr-reviewer with the bug description and the full diff.
Save response to `docs/pipeline/<slug>/review.md`.

If **BLOCK**: re-task @coder with the diagnosis plus reviewer findings. Retry reviewer. Max 2 retries. If still BLOCK: stop and report.

---

### Step 4 — QA
Task @qa with:
- The bug description
- Full content of `diagnosis.md`

Save response to `docs/pipeline/<slug>/qa.md`.

If **FAIL**: stop and report. Do not proceed.

---

### Step 5 — Commit
1. `git add -A`
2. Commit with a `fix:` conventional commit message
3. `git push -u origin <branch>`

Always pass the **full** output of each phase to the next. Never summarise.
