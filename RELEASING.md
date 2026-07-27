# Releasing htmx-query

Owner checklist for cutting a release. Every step is required; the scripts
fail closed.

## One-time setup

1. **Make `mux-ai/htmx-query` public before the first release.**
   `npm publish --provenance` hard-fails for private repositories, and the
   published provenance links would be meaningless for a repo nobody can see.
2. **Bootstrap the very first publish.** Trusted Publishing can only be
   configured for a package that already exists on npm. For `0.1.0` only:
   publish once manually with a short-lived granular automation token and
   WITHOUT `--provenance` (provenance requires CI OIDC), then revoke the
   token immediately.
3. On npmjs.com, configure **Trusted Publishing** for `htmx-query`: bind this
   GitHub repository and the release workflow as the trusted publisher. From
   the second release on there is deliberately no token fallback.
   The binding must live on the **package** (npmjs.com → `htmx-query` →
   Settings → Trusted Publisher), not on the owning user or organization —
   npm exchanges the OIDC token per package. Enter owner `mux-ai`, repository
   `htmx-query`, workflow `release.yml`, and leave **Environment blank**; the
   publish job declares no `environment:`, so any value there fails the claim
   match. When the binding is missing the registry answers the exchange with
   `404 … OIDC token exchange error - package not found`, which surfaces only
   as `ENEEDAUTH` unless `npm publish` is run with `--loglevel verbose`.
   Do not add `registry-url:` to `actions/setup-node` in the publish job: it
   writes an `.npmrc` containing `${NODE_AUTH_TOKEN}`, which never resolves
   here, and npm then authenticates with that empty credential instead of
   using OIDC.
4. Note the toolchain floor baked into `release.yml`: Node 24 (bundles npm >=
   11.5.1, required for Trusted Publishing). Do not lower `node-version`
   below 24 in the publish job. Local installs use the `packageManager`
   pin (pnpm 9) so lockfile resolution matches CI; pnpm 11's default
   release-age policy rejects freshly published dependency versions.

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
