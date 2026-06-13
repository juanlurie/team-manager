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
