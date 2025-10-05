// Build/append history.csv and history/trends.json from top-leaderboards.json
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const SRC  = path.join(ROOT, 'top-leaderboards.json')
const OUT_DIR = path.join(ROOT, 'history')
const CSV = path.join(OUT_DIR, 'history.csv')
const TRENDS = path.join(OUT_DIR, 'trends.json')

const todayISO = new Date().toISOString().slice(0,10) // YYYY-MM-DD

function numFromString(s){
  if (s == null) return null
  const str = String(s).trim()
  // 1) unit-suffix for context like 128k / 1M
  const mUnit = str.match(/^\s*([\d,.]+)\s*([kKmM])\b/)
  if (mUnit){
    let n = parseFloat(mUnit[1].replace(',','.'))
    const u = mUnit[2].toLowerCase()
    if (u === 'k') n *= 1e3
    if (u === 'm') n *= 1e6
    return n
  }
  // 2) plain numeric inside string (price / throughput)
  const m = str.replace(/,/g,'.').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

async function readJSON(file){
  try { return JSON.parse(await fs.readFile(file,'utf8')) } catch(e){ return null }
}
async function ensureDir(p){ await fs.mkdir(p, {recursive:true}) }

async function loadSource(){
  const data = await readJSON(SRC)
  if (!data) {
    console.error('ERROR: top-leaderboards.json not found or invalid.')
    process.exit(1)
  }
  return data
}

function rowsForSection(section, arr){
  // Produce rank1_name, rank1_value ... rank5_*
  const row = {}
  for (let i=0; i<5; i++){
    const it = arr[i]
    row[`rank${i+1}_name`]  = it?.name ?? ''
    row[`rank${i+1}_value`] = (typeof it?.score === 'number') ? it.score : (it?.value ?? '')
  }
  return row
}

function toCsvLine(obj, header){
  return header.map(k => {
    const v = obj[k] ?? ''
    // escape double quotes
    const s = String(v).replace(/"/g,'""')
    return `"${s}"`
  }).join(',')
}

async function updateCsv(data){
  await ensureDir(OUT_DIR)
  const exists = await fs.access(CSV).then(()=>true).catch(()=>false)

  const header = [
    'date','section',
    'rank1_name','rank1_value',
    'rank2_name','rank2_value',
    'rank3_name','rank3_value',
    'rank4_name','rank4_value',
    'rank5_name','rank5_value'
  ]

  let csv = ''
  if (!exists){
    csv += header.join(',')+'\n'
  } else {
    csv = await fs.readFile(CSV,'utf8')
  }

  const sections = [
    ['code', data.code ?? []],
    ['multimodal', data.multimodal ?? []],
    ['knowledge', data.knowledge ?? []],
    ['longest_context', data.longest_context ?? []],
    ['cheapest', data.cheapest ?? []],
    ['fastest', data.fastest ?? []],
  ]

  // avoid duplicate date+section lines
  const hasLine = (section) => csv.includes(`"${todayISO}","${section}"`)

  for (const [key, arr] of sections){
    if (arr.length === 0) continue
    if (hasLine(key)) continue
    const row = { date: todayISO, section: key, ...rowsForSection(key, arr) }
    csv += toCsvLine(row, [
      'date','section',
      'rank1_name','rank1_value',
      'rank2_name','rank2_value',
      'rank3_name','rank3_value',
      'rank4_name','rank4_value',
      'rank5_name','rank5_value'
    ])+'\n'
  }

  await fs.writeFile(CSV, csv, 'utf8')
}

async function updateTrends(data){
  await ensureDir(OUT_DIR)
  const trends = await readJSON(TRENDS) || {}

  function addPoints(section, arr, pickNumber){
    if (!arr || !arr.length) return
    trends[section] = trends[section] || {}
    for (const it of arr){
      const name = it.name
      const value = pickNumber(it)
      if (name && value != null && !Number.isNaN(value)){
        const series = trends[section][name] || []
        // avoid duplicate date
        if (!series.length || series[series.length-1].date !== todayISO){
          series.push({ date: todayISO, value })
        }
        trends[section][name] = series
      }
    }
  }

  addPoints('code', data.code, it => typeof it.score === 'number' ? it.score : null)
  addPoints('multimodal', data.multimodal, it => typeof it.score === 'number' ? it.score : null)
  addPoints('knowledge', data.knowledge, it => typeof it.score === 'number' ? it.score : null)
  addPoints('cheapest', data.cheapest, it => numFromString(it.value))
  addPoints('fastest', data.fastest, it => numFromString(it.value))
  addPoints('longest_context', data.longest_context, it => numFromString(it.value))

  await fs.writeFile(TRENDS, JSON.stringify(trends, null, 2), 'utf8')
}

async function main(){
  const data = await loadSource()
  await updateCsv(data)
  await updateTrends(data)
  console.log('OK: history.csv & trends.json updated for', todayISO)
}
main().catch(e => { console.error(e); process.exit(1) })
