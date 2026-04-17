import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const hexPairs = [
  ['#1e40af', '#047857'],
  ['#1E40AF', '#047857'],
  ['#1e3a8a', '#065f46'],
  ['#1E3A8A', '#065f46'],
  ['#172554', '#064e3b'],
  ['#2563eb', '#059669'],
  ['#2563EB', '#059669'],
  ['#3b82f6', '#10b981'],
  ['#3B82F6', '#10b981'],
  ['#1877f2', '#059669'],
  ['#1877F2', '#059669'],
  ['#93c5fd', '#6ee7b7'],
  ['#93C5FD', '#6ee7b7'],
]

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue
      walk(p, acc)
    } else if (/\.(tsx|ts|css)$/i.test(ent.name)) {
      acc.push(p)
    }
  }
  return acc
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let count = 0
for (const f of walk(path.join(root, 'src'))) {
  let s = fs.readFileSync(f, 'utf8')
  const o = s
  s = s.split('blue-').join('emerald-').split('red-').join('emerald-')
  for (const [a, b] of hexPairs) {
    s = s.split(a).join(b)
  }
  if (s !== o) {
    fs.writeFileSync(f, s, 'utf8')
    count += 1
    console.log(path.relative(root, f))
  }
}
console.log('updated', count, 'files')
