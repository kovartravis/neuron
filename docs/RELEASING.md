# Releasing

How a release of `@kovartravis/neuron` actually gets cut. This is the first
place that discipline has been written down — previously it lived only as
git-log convention plus `.github/workflows/publish.yml`'s automation, with
no single doc a maintainer could check against before pushing.

## Checklist

1. **Update `CHANGELOG.md`** with a new `## [X.Y.Z] - YYYY-MM-DD` entry
   describing what shipped, in the style of the existing entries.
2. **Review the docs site against this release's CLI/config surface.**
   If a command, flag, or `neuron.yaml` field changed, added, or was
   removed, check it against `site/src/content/docs/docs/` (the CLI/config
   reference pages plus any narrative page that names the changed surface)
   and update what's drifted. This is a manual review, not a CI gate — see
   Map — neuron.github.io Site (2.5.0)'s Notes for why a generated-docs
   approach was declined in favor of hand-reviewed pages kept in sync per
   release.
3. **Bump `version` in `package.json`** — a bare `MAJOR.MINOR.PATCH` for a
   stable release, `MAJOR.MINOR.PATCH-rcN` for a release candidate. This is
   what `publish.yml` reads to resolve the npm dist-tag (`latest` vs `rc`).
4. **Commit** with a `release: vX.Y.Z — <summary>` message (matches the
   existing git-log convention).
5. **Push to `main`.** `.github/workflows/publish.yml` takes it from there:
   build + test, the architecture drift check (`scan --check`), the
   config/protocol compliance check (`status --check`), `npm publish` under
   the resolved dist-tag, a `vX.Y.Z` git tag, and — for a stable (`latest`)
   release only — standalone binaries plus a GitHub Release with
   `SHA256SUMS`.

## Notes

- Steps 1, 2, and 3 are manual; step 5's CI run is what actually enforces
  the architecture and protocol checks (steps that *can* be automated
  already are — the docs review above is deliberately not, per Map —
  neuron.github.io Site (2.5.0)).
- Nothing currently fails a release if step 2 is skipped. It's a discipline
  this doc records, not a gate `publish.yml` checks for.
