#!/usr/bin/env bash
set -euo pipefail

REPO=""
REF="master"
WORKSPACE_PATH=""
STORE_PATH="examples/sample-store/.cristalina"
AUDIENCE="owner_private"
CHANNEL=""
PROFILE=""
SKIP_BUILD=0
KEEP_TEMP=0
AUTO_YES=1

help() {
  cat <<'EOF'
Cristalina OpenClaw GitHub Installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/<ref>/scripts/install-openclaw-from-github.sh | \
    bash -s -- --repo <owner>/<repo> --ref <ref> --workspace-path /absolute/path/to/openclaw

Options:
  --repo <owner/repo>           GitHub repository to download
  --ref <ref>                   Branch or ref to install (default: master)
  --workspace-path <path>       Absolute path to the OpenClaw workspace to wipe and bootstrap
  --store-path <path>           Store path inside the downloaded repo (default: examples/sample-store/.cristalina)
  --audience <scope>            Cristalina audience for projection (default: owner_private)
  --channel <name>              Optional channel name
  --profile <name>              Optional projection profile
  --skip-build                  Skip pnpm build if dist output already exists
  --keep-temp                   Keep the downloaded temp repo after install
  --no-yes                      Require confirmation before wiping the target workspace
  -h, --help                    Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --workspace-path) WORKSPACE_PATH="$2"; shift 2 ;;
    --store-path) STORE_PATH="$2"; shift 2 ;;
    --audience) AUDIENCE="$2"; shift 2 ;;
    --channel) CHANNEL="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --keep-temp) KEEP_TEMP=1; shift ;;
    --no-yes) AUTO_YES=0; shift ;;
    -h|--help) help; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; help; exit 1 ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Error: --repo is required." >&2
  exit 1
fi

if [[ -z "$WORKSPACE_PATH" ]]; then
  echo "Error: --workspace-path is required." >&2
  exit 1
fi

if [[ "$WORKSPACE_PATH" != /* ]]; then
  echo "Error: --workspace-path must be an absolute Linux path." >&2
  exit 1
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

need_cmd curl
need_cmd tar
need_cmd node

if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
else
  echo "Error: pnpm not found and corepack is unavailable." >&2
  exit 1
fi

TMP_ROOT="$(mktemp -d -t cristalina-openclaw-XXXXXX)"
ARCHIVE_PATH="$TMP_ROOT/repo.tar.gz"
ARCHIVE_URL="https://codeload.github.com/${REPO}/tar.gz/refs/heads/${REF}"

cleanup() {
  if [[ "$KEEP_TEMP" -eq 0 ]]; then
    rm -rf "$TMP_ROOT"
  fi
}
trap cleanup EXIT

echo
echo "Cristalina OpenClaw GitHub Installer"
echo
echo "This installs a runtime projection into an OpenClaw workspace."
echo "The workspace is derived and disposable. Canonical memory stays in the Cristalina store."
echo
echo "Downloading ${REPO}@${REF}..."
curl -fsSL "$ARCHIVE_URL" -o "$ARCHIVE_PATH"

echo "Extracting archive..."
tar -xzf "$ARCHIVE_PATH" -C "$TMP_ROOT"

REPO_DIR="$(find "$TMP_ROOT" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "$REPO_DIR" ]]; then
  echo "Error: extracted repository directory not found." >&2
  exit 1
fi

echo "Installing dependencies..."
(cd "$REPO_DIR" && "${PNPM_CMD[@]}" install)

CLI_PATH="$REPO_DIR/packages/cli/dist/cli.js"
if [[ "$SKIP_BUILD" -eq 1 && -f "$CLI_PATH" ]]; then
  echo "Skipping build because dist already exists."
else
  echo "Building Cristalina..."
  (cd "$REPO_DIR" && "${PNPM_CMD[@]}" build)
fi

echo "Running OpenClaw onboarding..."
ONBOARD_ARGS=(
  "$REPO_DIR/scripts/onboard-openclaw.mjs"
  --workspace-path "$WORKSPACE_PATH"
  --store-path "$STORE_PATH"
  --audience "$AUDIENCE"
)

if [[ "$AUTO_YES" -eq 1 ]]; then
  ONBOARD_ARGS+=(--yes)
fi

if [[ "$SKIP_BUILD" -eq 1 ]]; then
  ONBOARD_ARGS+=(--skip-build)
fi

if [[ -n "$CHANNEL" ]]; then
  ONBOARD_ARGS+=(--channel "$CHANNEL")
fi

if [[ -n "$PROFILE" ]]; then
  ONBOARD_ARGS+=(--profile "$PROFILE")
fi

(cd "$REPO_DIR" && node "${ONBOARD_ARGS[@]}")

echo
echo "OpenClaw workspace installed at: $WORKSPACE_PATH"
echo "You can now point OpenClaw at SOUL.md, VALUE.md, USER.md, and MEMORY.md."
echo
echo "One-line pattern:"
echo "curl -fsSL https://raw.githubusercontent.com/${REPO}/${REF}/scripts/install-openclaw-from-github.sh | bash -s -- --repo ${REPO} --ref ${REF} --workspace-path ${WORKSPACE_PATH}"
