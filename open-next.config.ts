import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const config = defineCloudflareConfig()

// Without this, @opennextjs/aws defaults to running `npm run build`
// to build the Next.js app. If the `build` script itself ever calls
// `opennextjs-cloudflare build` (directly or via `pages:build`), that
// creates infinite recursion. Pinning the exact command here avoids that
// regardless of what package.json's `build`/`pages:build` scripts do.
config.buildCommand = 'npx next build'

export default config
