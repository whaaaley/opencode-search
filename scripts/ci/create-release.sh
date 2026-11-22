#!/bin/bash
set -euo pipefail

# Cuts one release per version package.json holds, tagged v<version>, so a push that keeps the version cuts nothing.

NAME=$(jq -r .name package.json)
VERSION=$(jq -r .version package.json)
TAG="v$VERSION"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "$TAG is already released"
  exit 0
fi

PREV_TAG=$(git describe --tags --match 'v*' --abbrev=0 2>/dev/null || true)
RANGE="${PREV_TAG:+$PREV_TAG..HEAD}"
NOTES=$(git log ${RANGE:-HEAD} --oneline)

# The first version has no earlier tag, so its notes are the whole history, and a range ending at the head always holds a commit.
NOTES=${NOTES:-$(git log -1 HEAD --oneline)}

LINK="npm: https://www.npmjs.com/package/$NAME/v/$VERSION"

gh release create "$TAG" --title "$TAG" --notes "$(printf '%s\n\n%s\n' "$LINK" "$NOTES")"
