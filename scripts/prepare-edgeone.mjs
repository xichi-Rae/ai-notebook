import { cpSync, mkdirSync, writeFileSync } from 'node:fs'

mkdirSync('dist/edge-functions', { recursive: true })
cpSync('edge-functions', 'dist/edge-functions', { recursive: true })
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }, null, 2))

console.log('EdgeOne Pages deployment files prepared in dist/')
