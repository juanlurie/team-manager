#!/usr/bin/env bash
# Run the full feature pipeline: architect → ux → coder → pr-reviewer → qa → commit + draft PR
# Usage: ./feature-pipeline.sh "your feature description"
set -euo pipefail

FEATURE="${1:-}"
if [[ -z "$FEATURE" ]]; then
  echo "Usage: $0 \"<feature description>\""
  exit 1
fi

SLUG=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-60)
PIPELINE_DIR="docs/pipeline/$SLUG"

echo "[pipeline] Feature:   $FEATURE"
echo "[pipeline] Slug:      $SLUG"
echo "[pipeline] Artifacts: $PIPELINE_DIR"
mkdir -p "$PIPELINE_DIR"

# ── 1. Architect ──────────────────────────────────────────────────────────────
echo ""
echo "[1/5] Architect..."
opencode run --agent architect \
  "Feature request: $FEATURE

Write your full architecture document to: $PIPELINE_DIR/arch.md"

[[ -f "$PIPELINE_DIR/arch.md" ]] || { echo "ERROR: $PIPELINE_DIR/arch.md was not written"; exit 1; }
echo "[1/5] arch.md written."

# ── 2. UX ─────────────────────────────────────────────────────────────────────
echo ""
echo "[2/5] UX..."
opencode run --agent ux \
  "Feature request: $FEATURE

Read the architecture document at $PIPELINE_DIR/arch.md, then write your full UX specification to: $PIPELINE_DIR/ux.md"

[[ -f "$PIPELINE_DIR/ux.md" ]] || { echo "ERROR: $PIPELINE_DIR/ux.md was not written"; exit 1; }
echo "[2/5] ux.md written."

# ── 3. Coder ──────────────────────────────────────────────────────────────────
echo ""
echo "[3/5] Coder..."
opencode run --agent coder \
  "Feature request: $FEATURE

Read the architecture at $PIPELINE_DIR/arch.md and the UX spec at $PIPELINE_DIR/ux.md, then implement the feature. List every file you created or modified in your response."

echo "[3/5] Coder done."

# ── 4. PR Reviewer (with up to 2 coder retries) ───────────────────────────────
echo ""
echo "[4/5] PR Reviewer..."

_review() {
  local label="$1"
  # Exclude generated build artifacts from the review diff
  git diff HEAD -- . \
    ':!team-manager-ui/.angular' \
    ':!team-manager-ui/dist' \
    ':!**/node_modules' \
    > "$PIPELINE_DIR/current.diff"
  [[ -s "$PIPELINE_DIR/current.diff" ]] || \
    git diff -- . \
      ':!team-manager-ui/.angular' \
      ':!team-manager-ui/dist' \
      ':!**/node_modules' \
      > "$PIPELINE_DIR/current.diff"
  opencode run --agent pr-reviewer \
    "Feature: $FEATURE ($label). Read and review the git diff at $PIPELINE_DIR/current.diff. Return PASS or BLOCK per your instructions."
}

_retry_coder() {
  opencode run --agent coder \
    "Feature request: $FEATURE

Read the architecture at $PIPELINE_DIR/arch.md, the UX spec at $PIPELINE_DIR/ux.md, and the PR review findings at $PIPELINE_DIR/review.md.
Fix all BLOCK and HIGH severity findings listed in the review."
}

REVIEW=$(_review "initial")
echo "$REVIEW" > "$PIPELINE_DIR/review.md"

if echo "$REVIEW" | head -5 | grep -qi "block"; then
  echo "[4/5] BLOCK — retrying coder (1/2)..."
  _retry_coder
  REVIEW=$(_review "retry-1")
  echo "$REVIEW" > "$PIPELINE_DIR/review.md"
fi

if echo "$REVIEW" | head -5 | grep -qi "block"; then
  echo "[4/5] BLOCK — retrying coder (2/2)..."
  _retry_coder
  REVIEW=$(_review "retry-2")
  echo "$REVIEW" > "$PIPELINE_DIR/review.md"
fi

if echo "$REVIEW" | head -5 | grep -qi "block"; then
  echo ""
  echo "ERROR: Reviewer BLOCKED after 2 retries. Pipeline halted."
  echo "       See: $PIPELINE_DIR/review.md"
  exit 2
fi

echo "[4/5] PR review: PASS"

# ── 5. QA ─────────────────────────────────────────────────────────────────────
echo ""
echo "[5/5] QA..."
QA=$(opencode run --agent qa \
  "Feature request: $FEATURE

Read the architecture at $PIPELINE_DIR/arch.md and the UX spec at $PIPELINE_DIR/ux.md, then run the test suite and verify the feature.")

echo "$QA" > "$PIPELINE_DIR/qa.md"

if echo "$QA" | head -5 | grep -qi "fail"; then
  echo ""
  echo "ERROR: QA FAILED. Pipeline halted."
  echo "       See: $PIPELINE_DIR/qa.md"
  exit 3
fi

echo "[5/5] QA: PASS"

# ── Commit + Draft PR ─────────────────────────────────────────────────────────
echo ""
echo "[commit] Staging changes..."
# Stage source and pipeline artifacts only — exclude generated build outputs
git add -A -- \
  ':!team-manager-ui/.angular' \
  ':!team-manager-ui/dist' \
  ':!**/node_modules'
git commit -m "feat: $FEATURE

Pipeline artifacts: $PIPELINE_DIR"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[commit] Pushing $BRANCH..."
git push -u origin "$BRANCH"

echo "[pr] Creating draft PR..."
gh pr create --draft \
  --title "feat: $FEATURE" \
  --body "$(cat <<EOF
## Summary

Automated pipeline run for: **$FEATURE**

## Pipeline artifacts

| Phase | File |
|---|---|
| Architecture | \`$PIPELINE_DIR/arch.md\` |
| UX spec | \`$PIPELINE_DIR/ux.md\` |
| PR review | \`$PIPELINE_DIR/review.md\` |
| QA | \`$PIPELINE_DIR/qa.md\` |

## PR review sign-off

$(cat "$PIPELINE_DIR/review.md")

## QA sign-off

$(cat "$PIPELINE_DIR/qa.md")
EOF
)"

echo ""
echo "[pipeline] Done."
echo "[pipeline] Feature:   $FEATURE"
echo "[pipeline] Artifacts: $PIPELINE_DIR"
