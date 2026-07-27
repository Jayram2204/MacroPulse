#!/bin/bash
# Generate TypeScript types from FastAPI OpenAPI spec
# Run: bash scripts/generate-types.sh

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"

echo "Generating types from $API_URL/openapi.json ..."

npx openapi-typescript "$API_URL/openapi.json" -o types/api.d.ts

echo "Done — types written to types/api.d.ts"
