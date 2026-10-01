// Point @spree/sdk at a local checkout when SPREE_SDK_PATH is set.
//
// This is the JavaScript twin of the backend's SPREE_PATH: the branch installs
// the published SDK by default — for standalone clones and CI — and only swaps
// in a workspace build when a developer opts in through the environment. That
// keeps the local link out of package.json, so it can never be committed by
// accident.
//
// The Spree monorepo's worktree tooling sets SPREE_SDK_PATH to <worktree>/packages/sdk
// and re-runs the install whenever the SDK is rebuilt.
//
// `file:` rather than `link:`. A symlink is the tempting choice — it would pick
// up SDK rebuilds with no reinstall — but this project pins module resolution
// to its own directory (`turbopack.root`, `output: "standalone"`) and lists
// @spree/sdk in `transpilePackages`, so a package symlinked to somewhere
// outside the project simply does not resolve. `file:` copies it into
// node_modules, where all three of those settings can see it.

const SDK_PACKAGE = '@spree/sdk'

/**
 * @param {{ dependencies?: Record<string, string>, devDependencies?: Record<string, string> }} pkg
 */
function readPackage(pkg) {
  const sdkPath = process.env.SPREE_SDK_PATH

  if (!sdkPath) return pkg

  for (const field of ['dependencies', 'devDependencies']) {
    if (pkg[field]?.[SDK_PACKAGE]) {
      pkg[field][SDK_PACKAGE] = `file:${sdkPath}`
    }
  }

  return pkg
}

module.exports = { hooks: { readPackage } }
