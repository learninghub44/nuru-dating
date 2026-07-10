// Optional sanity-check for the @opennextjs/cloudflare Workers build output.
// Run manually with `node scripts/postbuild-cloudflare.js` after `npm run build`.
const fs = require('fs')
const path = require('path')

const outputDir = path.join(process.cwd(), '.open-next')
const workerFile = path.join(outputDir, 'worker.js')
const assetsDir = path.join(outputDir, 'assets')

if (!fs.existsSync(workerFile)) {
  console.error(`Worker bundle not found at ${workerFile}`)
  process.exit(1)
}

if (!fs.existsSync(assetsDir)) {
  console.error(`Assets directory not found at ${assetsDir}`)
  process.exit(1)
}

console.log('Cloudflare Workers build output looks good:')
console.log(`  - ${workerFile}`)
console.log(`  - ${assetsDir}`)
