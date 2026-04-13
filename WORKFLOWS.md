# GitHub Actions Workflows

## `ci.yml` — Continuous Integration

Runs automatically on **every push and pull request** to `main` or `develop`.

| Job | Runner | What it does |
|-----|--------|-------------|
| `extension` | ubuntu-latest | `npm ci` → `tsc --noEmit` → `vite build` |
| `companion` | ubuntu-latest | `yarn install` → `tsc --noEmit` → `tsc build` |

---

## `release.yml` — Automated Release

Triggered by pushing a **version tag** matching `v*.*.*`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Pipeline

```
meta  ──► build-extension ──┐
      └── build-companion ──┴──► release (GitHub Release)
```

| Job | What it produces |
|-----|-----------------|
| `build-extension` | Patches `manifest.config.ts` version, runs `vite build`, zips → `web2agent-v{VERSION}.zip` |
| `build-companion` | Builds companion TypeScript, stages files, produces `companion-macos-v{VERSION}.tar.gz` + `companion-windows-v{VERSION}.zip` |
| `release` | Downloads all artifacts, generates changelog from `git log`, publishes a GitHub Release |

### Release artifacts

| File | Purpose |
|------|---------|
| `web2agent-v{VERSION}.zip` | Upload to Chrome Web Store (or drag-drop into `chrome://extensions`) |
| `companion-macos-v{VERSION}.tar.gz` | Desktop companion for macOS / Linux |
| `companion-windows-v{VERSION}.zip` | Desktop companion for Windows |

### Required permissions

The workflow uses `permissions: contents: write` with the built-in `GITHUB_TOKEN` — **no extra secrets needed**.

### Pre-release / beta tags

Tags like `v1.0.0-beta.1` are also supported and will create a GitHub Release. Mark it as pre-release manually in the GitHub UI if needed, or extend the workflow with `--prerelease` flag in `gh release create`.
