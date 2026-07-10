// Sanity-checks the @opennextjs/cloudflare build output before deploying.
// Run automatically as part of `npm run pages:build`.
const fs = require('fs')
const path = require('path')

const outputDir = path.join(process.cwd(), '.open-next', 'cloudflare')

if (!fs.existsSync(outputDir)) {
  console.error(`Cloudflare build output not found at ${outputDir}`)
  process.exit(1)
}

const entries = fs.readdirSync(outputDir)
console.log(`Cloudflare Pages output ready at .open-next/cloudflare (${entries.length} entries):`)
entries.forEach((entry) => console.log(`  - ${entry}`))

const requiredFiles = ['_worker.js']
const missing = requiredFiles.filter((f) => !entries.includes(f))
if (missing.length > 0) {
  console.warn(`Warning: expected file(s) not found in output: ${missing.join(', ')}`)
}
