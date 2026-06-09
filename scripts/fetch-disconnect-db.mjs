// scripts/fetch-disconnect-db.mjs
// 从 GitHub 下载 Disconnect tracker list 并展平为 {domain → {company, category}} 格式

import { writeFileSync, mkdirSync, existsSync } from 'fs'

const OUT = 'public/disconnect-db.json'
if (existsSync(OUT)) {
  console.log('disconnect-db.json already exists, skipping fetch.')
  process.exit(0)
}

const URL = 'https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json'

console.log('Fetching Disconnect tracker DB...')
const res = await fetch(URL)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const raw = await res.json()

// raw.categories 结构：{ Advertising: [ { "Google": { "Google": ["google-analytics.com", ...] } }, ... ], ... }
const flat = {}

for (const [category, services] of Object.entries(raw.categories)) {
  for (const serviceEntry of services) {
    for (const [company, domainsObj] of Object.entries(serviceEntry)) {
      // domainsObj: { "SubName": ["domain1.com", "domain2.com", ...] }
      for (const domains of Object.values(domainsObj)) {
        for (const domain of domains) {
          flat[domain] = { company, category }
        }
      }
    }
  }
}

const count = Object.keys(flat).length
console.log(`Flattened ${count} tracker domains`)

mkdirSync('public', { recursive: true })
writeFileSync('public/disconnect-db.json', JSON.stringify(flat, null, 0))
console.log('Written to public/disconnect-db.json')
