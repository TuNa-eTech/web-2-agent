#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
checklist_path="${root_dir}/docs/implementation-plan/mcp-first-extension/06-release-checklist.md"
report_path="${root_dir}/docs/implementation-plan/mcp-first-extension/07-verification-report.md"

if [[ ! -f "${checklist_path}" ]]; then
  echo "Missing release checklist at ${checklist_path}"
  exit 1
fi

if [[ ! -f "${report_path}" ]]; then
  echo "Missing verification report template at ${report_path}"
  exit 1
fi

echo "Release checklist:"
echo "${checklist_path}"
echo
echo "Verification report template:"
echo "${report_path}"
echo
echo "Fill the report and attach evidence before release sign-off."
