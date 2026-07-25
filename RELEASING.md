# Releasing htmx-query

Owner checklist for cutting a release. Every step is required; the scripts
fail closed.

## One-time setup

1. On npmjs.com, configure **Trusted Publishing** for `htmx-query`: bind this
   GitHub repository and the release workflow as the trusted publisher. There
   is deliberately no automation-token fallback.

## Per release

1. Bump `version` in `package.json`.
2. Add a matching `## <version>` section to `CHANGELOG.md`
   (`npm run changelog:check` enforces this).
3. Run the full gate locally: `npm run prepublishOnly`
   (changelog check, lint, typecheck, build, tests, size budget).
4. Verify the packed tarball installs and registers from both module systems:
   `RELEASE_TAG=v<version> npm run release:verify`
   — the tag string must equal `v` + the package.json version.
5. Record the SRI values the build produced:
   - `dist/htmx-query.min.js.sri` — what unpkg serves by default
   - `dist/htmx-query.iife.js.sri` — the unminified IIFE
   Publish these in the release notes so script-tag users can pin
   `integrity="sha384-…"` against the exact version.
6. Create and push the git tag `v<version>` on the release commit.
7. **Create a GitHub Release for that tag and publish it.** The release
   workflow (`.github/workflows/release.yml`) triggers on `release:
   published` — pushing the tag alone does nothing. Publishing the Release
   runs the gate and `npm publish` via Trusted Publishing (OIDC). Do not
   `npm publish` from a laptop.
8. After publish, spot-check
   `https://unpkg.com/htmx-query@<version>` resolves to `htmx-query.min.js`
   and its hash matches the recorded SRI value.
