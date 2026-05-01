import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Saturated “hyper red” palette — replace prior reds + blues in one pass. */
const PAIRS = [
  ['#172554', '#4a000c'],
  ['#1e3a8a', '#ff0a3c'],
  ['#1E3A8A', '#ff0a3c'],
  ['#ef4444', '#ff0a3c'],
  ['#EF4444', '#ff0a3c'],
  ['#dc2626', '#c40028'],
  ['#DC2626', '#c40028'],
  ['#b91c1c', '#9d0019'],
  ['#991b1b', '#7a0014'],
  ['#f87171', '#ff4d6a'],
  ['#fca5a5', '#ff8c9c'],
  ['#fecaca', '#ffc9cf'],
  ['#fee2e2', '#ffe0e3'],
  ['#fef2f2', '#fff0f1'],
  ['#ecfdf5', '#fff0f1'],
  ['#a7f3d0', '#ffc9cf'],
  ['#d1fae5', '#ffe0e3'],
  ['rgba(239, 68, 68', 'rgba(255, 10, 60'],
  ['rgba(220, 38, 38', 'rgba(255, 10, 60'],
  ['rgba(248, 113, 113', 'rgba(255, 77, 106'],
  ['rgba(254, 202, 202', 'rgba(255, 186, 194'],
  ['rgba(254, 226, 226', 'rgba(255, 214, 218'],
  ['rgba(254, 242, 242', 'rgba(255, 236, 238'],
  ['rgba(185, 28, 28', 'rgba(212, 0, 40'],
  ['rgba(127, 29, 29', 'rgba(90, 0, 14'],
  ['rgba(69, 10, 10', 'rgba(45, 0, 6'],
  ['rgba(30, 58, 138', 'rgba(255, 10, 60'],
  ['rgb(239, 68, 68)', 'rgb(255, 10, 60)'],
  ['rgb(220, 38, 38)', 'rgb(255, 10, 60)'],
  ['239, 68, 68', '255, 10, 60'],
  ['220, 38, 38', '255, 10, 60'],
  ['30, 58, 138', '255, 10, 60'],
]

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue
      walk(p, acc)
    } else if (/\.(tsx|ts|css)$/i.test(ent.name)) acc.push(p)
  }
  return acc
}

function transform(s) {
  let out = s
  for (const [a, b] of PAIRS) {
    out = out.split(a).join(b)
  }
  return out
}

let n = 0
for (const f of walk(path.join(root, 'src'))) {
  const raw = fs.readFileSync(f, 'utf8')
  const next = transform(raw)
  if (next !== raw) {
    fs.writeFileSync(f, next, 'utf8')
    n++
    console.log(path.relative(root, f))
  }
}
for (const name of ['index.html']) {
  const fp = path.join(root, name)
  if (!fs.existsSync(fp)) continue
  const raw = fs.readFileSync(fp, 'utf8')
  const next = transform(raw)
  if (next !== raw) {
    fs.writeFileSync(fp, next, 'utf8')
    n++
    console.log(name)
  }
}
console.log('updated', n, 'files')
