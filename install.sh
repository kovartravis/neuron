#!/bin/sh
# Installs the standalone `neuron` binary (curl-installable-binary effort,
# ticket 6). Downloads the release asset matching this machine's OS/arch,
# verifies it against the release's SHA256SUMS (ticket 5), and installs it
# to a directory on PATH. Never installs a binary that fails verification.
#
#   curl -fsSL https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh
#
# Override the install directory with NEURON_INSTALL, e.g.:
#   NEURON_INSTALL=/usr/local/bin curl -fsSL .../install.sh | sh
#
# This installs the same binary produced by `npm install -g @kovartravis/neuron`
# through a different channel (no Node.js required to run it) -- npm stays
# fully supported; this is additive.

set -eu

REPO="kovartravis/neuron"
INSTALL_DIR="${NEURON_INSTALL:-$HOME/.neuron/bin}"

err() {
  echo "error: $1" >&2
  exit 1
}

# --- 1. Detect OS + arch, map to this effort's release asset names -----
# (scripts/build-binary.mjs / ci-build-matrix.md: macos-x64, macos-arm64,
# linux-x64, linux-arm64, windows-x64, windows-arm64 -- windows is out of
# scope for this script, see install.ps1 / ticket 7.)

os_raw="$(uname -s)"
case "$os_raw" in
  Darwin) os="macos" ;;
  Linux) os="linux" ;;
  *) err "unsupported OS '$os_raw' -- this script installs macOS and Linux binaries only. Windows: see install.ps1." ;;
esac

arch_raw="$(uname -m)"
case "$arch_raw" in
  x86_64 | amd64) arch="x64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *) err "unsupported architecture '$arch_raw' -- neuron ships x64 and arm64 binaries only." ;;
esac

asset="neuron-${os}-${arch}"

command -v curl >/dev/null 2>&1 || err "curl is required but was not found on PATH."

sha_cmd=""
if command -v sha256sum >/dev/null 2>&1; then
  sha_cmd="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  sha_cmd="shasum -a 256"
else
  err "neither sha256sum nor shasum was found on PATH -- required to verify the download."
fi

# --- 2. Resolve the latest release tag -----------------------------------

api_url="https://api.github.com/repos/${REPO}/releases/latest"
tag="$(curl -fsSL "$api_url" | grep '"tag_name"' | head -n1 | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
[ -n "$tag" ] || err "could not resolve the latest release tag from $api_url"

base_url="https://github.com/${REPO}/releases/download/${tag}"

# --- 3. Download the binary and SHA256SUMS into a scratch dir -----------

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "Downloading neuron ${tag} (${os}-${arch})..."
curl -fsSL -o "$tmp_dir/$asset" "$base_url/$asset" \
  || err "failed to download $base_url/$asset -- check that $tag shipped a binary for $os/$arch."
curl -fsSL -o "$tmp_dir/SHA256SUMS" "$base_url/SHA256SUMS" \
  || err "failed to download $base_url/SHA256SUMS"

# --- 4. Verify the checksum -- fail loudly, never install unverified ----

expected="$(grep " ${asset}\$" "$tmp_dir/SHA256SUMS" | awk '{print $1}')"
[ -n "$expected" ] || err "no checksum entry for '$asset' in SHA256SUMS -- refusing to install an unverified binary."

actual="$(cd "$tmp_dir" && $sha_cmd "$asset" | awk '{print $1}')"

if [ "$expected" != "$actual" ]; then
  err "checksum mismatch for $asset (expected $expected, got $actual) -- refusing to install a corrupted or tampered binary."
fi
echo "Checksum verified."

# --- 5. Install ------------------------------------------------------------

mkdir -p "$INSTALL_DIR"
install_path="$INSTALL_DIR/neuron"
cp "$tmp_dir/$asset" "$install_path"
chmod +x "$install_path"

echo "Installed neuron ${tag} to $install_path"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo ""
    echo "$INSTALL_DIR is not on your PATH. Add it, e.g.:"
    echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.profile"
    ;;
esac

echo ""
echo "Run 'neuron --version' to confirm the install."
