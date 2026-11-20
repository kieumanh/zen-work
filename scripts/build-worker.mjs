import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
}
const files = {}
async function collect(directory, prefix = '') {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    if (file.name.startsWith('.') || file.name === 'server') continue
    const local = directory + '/' + file.name
    const path = prefix + '/' + file.name
    if (file.isDirectory()) { await collect(local, path); continue }
    const type = mime[extname(file.name)]
    if (!type) throw new Error('Unknown asset type: ' + path)
    files[path] = [type, (await readFile(local)).toString('base64')]
  }
}
await collect('dist')
const worker = await readFile('worker/index.js', 'utf8')
await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', 'const files = ' + JSON.stringify(files) + '\n' + worker)
