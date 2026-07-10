import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  // Without this, @opennextjs/cloudflare defaults to running `npm run build`
  // to build the Next.js app. If the `build` script itself ever calls
  // `opennextjs-cloudflare build` (directly or via `pages:build`), that
  // creates infinite recursion. Pinning the exact command here avoids that
  // regardless of what package.json's `build`/`pages:build` scripts do.
  buildCommand: 'npx next build',
})
