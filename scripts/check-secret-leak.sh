#!/usr/bin/env bash
set -e

echo "=== Running Secret & Security Scan ==="

# Define the forbidden service key variable string dynamically to avoid matching this script itself
FORBIDDEN_VAR="SUPABASE_SERVICE"_"ROLE_KEY"

# 1. Check for service key in tracked code or configs (excluding docs)
if grep -rn "$FORBIDDEN_VAR" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=docs . ; then
  echo "ERROR: Forbidden service role key string found in code/configs!"
  exit 1
fi

# 2. Check for dangerouslySetInnerHTML in src/
if grep -rn "dangerouslySetInnerHTML" src/ ; then
  echo "ERROR: dangerouslySetInnerHTML found in src/!"
  exit 1
fi

# 3. Check for server secrets in .next/static if .next directory exists
if [ -d ".next/static" ]; then
  echo "Scanning .next/static for leaked server-only environment variable keys..."
  FORBIDDEN_KEYS=("ANTHROPIC_API_KEY" "OPENALEX_API_KEY")
  for key in "${FORBIDDEN_KEYS[@]}"; do
    if grep -rn "$key" .next/static/ ; then
      echo "ERROR: Server secret key name '$key' found in static build output!"
      exit 1
    fi
  done
fi

echo "Secret and security scan passed successfully!"
