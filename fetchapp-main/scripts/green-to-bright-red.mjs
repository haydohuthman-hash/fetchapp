import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Longer / more specific strings first. */
const PAIRS = [
  ['#064e3b', '#b91c1c'],
  ['#065f46', '#dc2626'],
  ['#047857', '#ef4444'],
  ['#059669', '#ef4444'],
  ['#10b981', '#f87171'],
  ['#6ee7b7', '#fca5a5'],
  ['#ecfdf5', '#fef2f2'],
  ['#a7f3d0', '#fecaca'],
  ['#d1fae5', '#fee2e2'],
  ['#ccfbf1', '#ffe4e6'],
  ['rgba(236, 253, 245', 'rgba(254, 242, 242'],
  ['rgba(209, 250, 229', 'rgba(254, 226, 226'],
  ['rgba(167, 243, 208', 'rgba(254, 202, 202'],
  ['rgba(52, 211, 153', 'rgba(248, 113, 113'],
  ['rgba(110, 231, 183', 'rgba(252, 165, 165'],
  ['rgba(4, 120, 87', 'rgba(239, 68, 68'],
  ['rgba(5, 150, 105', 'rgba(239, 68, 68'],
  ['rgba(5, 122, 85', 'rgba(248, 113, 113'],
  ['rgba(6, 95, 70', 'rgba(220, 38, 38'],
  ['rgba(4, 47, 46', 'rgba(127, 29, 29'],
  ['rgba(4, 55, 48', 'rgba(69, 10, 10'],
  ['rgb(167, 243, 208)', 'rgb(254, 202, 202)'],
  ['rgb(6, 95, 70)', 'rgb(220, 38, 38)'],
  ['rgb(5, 122, 85)', 'rgb(220, 38, 38)'],
  ['rgb(4, 120, 87)', 'rgb(239, 68, 68)'],
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
