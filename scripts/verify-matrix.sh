#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
matrix_path="${root_dir}/docs/implementation-plan/mcp-first-extension/05-verification-matrix.md"
test_plan_path="${root_dir}/tests/README.md"

if [[ ! -f "${matrix_path}" ]]; then
  echo "Missing verification matrix at ${matrix_path}"
  exit 1
fi

if [[ ! -f "${test_plan_path}" ]]; then
  echo "Missing tests overview at ${test_plan_path}"
  exit 1
fi

echo "Verification matrix:"
echo "${matrix_path}"
echo
echo "Tests overview:"
echo "${test_plan_path}"
echo
echo "Use the test inventory in the matrix to track UT/IT/E2E coverage."
