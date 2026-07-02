# Git Rules

These rules are non-negotiable. Follow them exactly every time.

## Before making any code changes

Always pull latest from main first:
```
git pull origin main
```

## Committing and pushing

- Commit normally: `git add <files>` → `git commit -m "message"`
- Push normally: `git push origin <branch>`
- Never amend commits
- Never rebase
- Never force push (`--force` / `-f`)
- Never `git reset --hard`
- Never `git clean -f`

## Merging changes

- Always create a PR to main — never push directly to main
- Use `gh pr create` to open the PR
- Let the user merge the PR themselves

## Branch workflow

1. Pull main: `git pull origin main`
2. Create a feature branch if needed: `git checkout -b feature/name`
3. Make changes, commit
4. Push branch: `git push origin <branch>`
5. Open PR to main: `gh pr create --base main`
6. Stop — the user merges

# Frontend Component Architecture

As a feature grows across multiple changes, break it into components as you go —
don't let one component absorb everything just because that's where the feature
started. A single Angular component file mixing unrelated concerns (e.g. a list
view, a dialog, a canvas/rendering surface, popovers, settings) is a sign it
should already have been split.

When adding to an existing component and you notice it doing several genuinely
separable jobs (its own list/detail views, a self-contained interactive surface
like a canvas or editor, a reusable popover/picker pattern, etc.), extract the
new piece into its own component with clear `@Input`/`@Output` boundaries rather
than appending more state and template to the existing file. Don't wait for a
dedicated cleanup pass to do this — do it as part of the change that would
otherwise make the file worse.
