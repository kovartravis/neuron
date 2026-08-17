# Packaging drafts

Manifest **drafts** for neuron's secondary/tertiary Windows install
channels (Ticket 7 of the "Curl-Installable Standalone Binary" map).
Neither `winget/` nor `scoop/` has been validated against its real schema
or published anywhere — both need a real GitHub Release with Ticket 5's
binary assets to fill in `<VERSION>`/`<SHA256_X64>`/`<SHA256_ARM64>`
first. See `docs/design/distribution/windows-install-path.md` for why
these are drafts rather than shipped, and what "shipped" means for this
ticket instead (`install.ps1` at the repo root).

- `winget/` — three manifests (version, installer, locale) to file as a
  PR against `microsoft/winget-pkgs` once real values exist.
- `scoop/` — one manifest to publish into a Scoop bucket (this project
  doesn't have one yet; would need its own repo, e.g.
  `kovartravis/scoop-bucket`).
