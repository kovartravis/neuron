# Installs the standalone `neuron` binary on Windows (curl-installable-binary
# effort, ticket 7). Downloads the release asset matching this machine's
# architecture, verifies it against the release's SHA256SUMS (ticket 5, same
# discipline as install.sh / ticket 6), and installs it to a directory on the
# user-scope PATH. Never installs a binary that fails verification.
#
#   powershell -c "irm https://raw.githubusercontent.com/kovartravis/neuron/main/install.ps1 | iex"
#
# (wrapped in `powershell -c "..."` so it's pasteable from any shell context,
# not just an already-open PowerShell prompt -- matches Bun's own invocation
# shape, per docs/design/distribution/windows-install-convention-research.md.)
#
# Override the install directory with $env:NEURON_INSTALL, e.g.:
#   $env:NEURON_INSTALL = "C:\tools\neuron"; irm .../install.ps1 | iex
#
# This installs the same binary produced by `npm install -g @kovartravis/neuron`
# through a different channel (no Node.js required to run it) -- npm stays
# fully supported; this is additive.

$ErrorActionPreference = 'Stop'

$Repo = 'kovartravis/neuron'
$InstallDir = if ($env:NEURON_INSTALL) { $env:NEURON_INSTALL } else { Join-Path $env:USERPROFILE '.neuron\bin' }

function Fail($msg) {
  Write-Error "error: $msg"
  exit 1
}

# --- 1. Detect arch, map to this effort's release asset names -----------
# (scripts/build-binary.mjs / ci-build-matrix.md: windows-x64, windows-arm64
# -- macOS/Linux are out of scope for this script, see install.sh / ticket 6.)
# RuntimeInformation.OSArchitecture reads the real OS architecture, not the
# current process's -- correctly detects ARM64 even when this script runs
# under x64 emulation (the same real-arch concern Bun's own installer reads
# from the registry for; .NET exposes it directly so no registry read is
# needed here).

$osArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
$arch = switch ($osArch) {
  'X64' { 'x64' }
  'Arm64' { 'arm64' }
  default { Fail "unsupported architecture '$osArch' -- neuron ships Windows x64 and arm64 binaries only." }
}

$asset = "neuron-windows-$arch.exe"

# --- 2. Resolve the latest release tag -----------------------------------

$apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
try {
  $release = Invoke-RestMethod -Uri $apiUrl -Headers @{ 'User-Agent' = 'neuron-install-script' }
} catch {
  Fail "could not resolve the latest release from $apiUrl -- $($_.Exception.Message)"
}
$tag = $release.tag_name
if (-not $tag) { Fail "could not resolve the latest release tag from $apiUrl" }

$baseUrl = "https://github.com/$Repo/releases/download/$tag"

# --- 3. Download the binary and SHA256SUMS into a scratch dir -----------

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "neuron-install-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
try {
  Write-Host "Downloading neuron $tag (windows-$arch)..."
  $assetPath = Join-Path $tmpDir $asset
  try {
    Invoke-WebRequest -Uri "$baseUrl/$asset" -OutFile $assetPath -UseBasicParsing
  } catch {
    Fail "failed to download $baseUrl/$asset -- check that $tag shipped a binary for windows/$arch."
  }

  $sumsPath = Join-Path $tmpDir 'SHA256SUMS'
  try {
    Invoke-WebRequest -Uri "$baseUrl/SHA256SUMS" -OutFile $sumsPath -UseBasicParsing
  } catch {
    Fail "failed to download $baseUrl/SHA256SUMS"
  }

  # --- 4. Verify the checksum -- fail loudly, never install unverified ---

  $sumsLine = Select-String -Path $sumsPath -Pattern " \*?$([regex]::Escape($asset))$" | Select-Object -First 1
  if (-not $sumsLine) {
    Fail "no checksum entry for '$asset' in SHA256SUMS -- refusing to install an unverified binary."
  }
  $expected = ($sumsLine.Line -split '\s+')[0]

  $actual = (Get-FileHash -Path $assetPath -Algorithm SHA256).Hash.ToLower()

  if ($expected.ToLower() -ne $actual) {
    Fail "checksum mismatch for $asset (expected $expected, got $actual) -- refusing to install a corrupted or tampered binary."
  }
  Write-Host 'Checksum verified.'

  # --- 5. Install ---------------------------------------------------------

  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  $installPath = Join-Path $InstallDir 'neuron.exe'
  Copy-Item -Path $assetPath -Destination $installPath -Force

  Write-Host "Installed neuron $tag to $installPath"
} finally {
  Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

# --- 6. Add the install dir to the user-scope PATH, if not already there ---
# .NET SetEnvironmentVariable, not setx/a raw registry write -- mirrors
# Deno's own installer (simpler than Bun's registry-key + WM_SETTINGCHANGE
# approach; revisit only if neuron needs Bun's antivirus/DLL-mismatch
# defensive handling once a real Windows build exists to test against, per
# the research doc's own "what was not verified" note).

$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$pathEntries = @()
if ($userPath) { $pathEntries = $userPath -split ';' }

if ($pathEntries -notcontains $InstallDir) {
  $newPath = if ($userPath) { "$userPath;$InstallDir" } else { $InstallDir }
  [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
  # Also update this process's own PATH so `neuron` works immediately if the
  # caller `. `-sources this script instead of piping it through `iex`.
  $env:Path = "$env:Path;$InstallDir"
  Write-Host ''
  Write-Host "Added $InstallDir to your user PATH. Open a new terminal for it to take effect there."
}

Write-Host ''
Write-Host "Run 'neuron --version' to confirm the install."
