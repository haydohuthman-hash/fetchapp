import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FILES = [
  'src/views/HomeView.tsx',
  'src/components/FetchBrainServiceCarousel.tsx',
  'src/components/drops/DropsPostWizard.tsx',
  'src/components/HomeShellReelsPage.tsx',
  'src/views/AuthScreen.tsx',
  'src/lib/fetchAccentPreference.ts',
  'src/fetch-theme.css',
  'src/components/onboarding/FetchMapWelcomeDemo.tsx',
  'src/components/icons/HomeServiceTypeIllustrations.tsx',
  'src/components/HomeShellChatHubPage.tsx',
  'src/components/HomeShellBuySellPage.tsx',
  'src/components/FetchHomeStepOne/BookingMapReflection.tsx',
  'src/components/drops/DropsGiftIcons.tsx',
  'src/components/commerce/FetchCommercePillSlider.tsx',
  'src/components/ChatThreadView.tsx',
  'src/components/battles/BattleWinnerOverlay.tsx',
]

const PAIRS = [
  ['#ff0a3c', '#E4002B'],
  ['#FF0A3C', '#E4002B'],
  ['#c40028', '#B50023'],
  ['#C40028', '#B50023'],
  ['#9d0019', '#8B0019'],
  ['#FF8C9C', '#FFB3BC'],
  ['#ff8c9c', '#ffb3bc'],
  ['rgba(255, 10, 60', 'rgba(228, 0, 43'],
  ['rgba(255,10,60', 'rgba(228,0,43'],
  ['255, 10, 60', '228, 0, 43'],
  ['rgb(255, 10, 60)', 'rgb(228, 0, 43)'],
]

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0
for (const rel of FILES) {
  const fp = path.join(root, rel)
  if (!fs.existsSync(fp)) continue
  let s = fs.readFileSync(fp, 'utf8')
  const o = s
  for (const [a, b] of PAIRS) s = s.split(a).join(b)
  if (s !== o) {
    fs.writeFileSync(fp, s, 'utf8')
    n++
  }
}
const idx = path.join(root, 'index.html')
if (fs.existsSync(idx)) {
  let s = fs.readFileSync(idx, 'utf8')
  const o = s
  for (const [a, b] of PAIRS) s = s.split(a).join(b)
  if (s !== o) {
    fs.writeFileSync(idx, s, 'utf8')
    n++
  }
}
console.log('updated', n)
