const fs = require('fs')
const path = require('path')

const entryPath = path.resolve(__dirname, '..', 'lib', 'index.js')

if (!fs.existsSync(entryPath)) {
  throw new Error(`Expected compiled Functions entry point at ${entryPath}`)
}

const { size } = fs.statSync(entryPath)
if (size === 0) {
  throw new Error(`Compiled Functions entry point is empty: ${entryPath}`)
}

console.log(`Verified compiled Functions entry point (${size} bytes)`)
