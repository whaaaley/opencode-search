#!/bin/bash
set -euo pipefail

# Publishes the version package.json holds to npm, unless npm already has it.

NAME=$(jq -r .name package.json)
VERSION=$(jq -r .version package.json)

if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
  echo "npm already has $NAME@$VERSION"
  exit 0
fi

# npm trusts this workflow only once the package exists, so its first publish reads NPM_TOKEN from a throwaway config this one command uses.
if [ -n "${NPM_TOKEN:-}" ]; then
  CONFIG=$(mktemp)
  trap 'rm -f "$CONFIG"' EXIT
  printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > "$CONFIG"
  export NPM_CONFIG_USERCONFIG="$CONFIG"
fi

# A prerelease such as 2.1.0-next.0 goes out under next, so it never becomes what a plain install gets.
TAG=latest
if [[ "$VERSION" == *-* ]]; then
  TAG=next
fi

# prepack builds dist first, and provenance records which commit and workflow built the package.
npm publish --access public --provenance --tag "$TAG"
