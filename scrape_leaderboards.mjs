import fs from 'node:fs/promises'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { executablePath } from 'puppeteer'

const URL = process.env.LEADERBOARD_URL || 'https://llm-stats.com/'
const SAVE_SNAPSHOT = (process.env.SAVE_SNAPSHOT || '').toLowerCase() === 'true'

puppeteer.use(StealthPlugin())
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))

const TITLES = {
  code:  [/best\s+llm.*code/i, /aider\s+polyglot/i],
  multi: [/best\s+multimodal\s+llm/i, /mmmu\s+benchmark/i],
  know:  [/best\s+llm.*knowledge/i, /gpqa\s+benchmark/i],
  ctx:   [/longest\s+context/i, /max\s+input\s+tokens/i],
  cheap: [/cheapest\s+api\s+provider/i, /input\s+cost/i, /maverick\s+input\s+cost/i],
  fast:  [/fastest\s+api\s+provider/i, /throughput/i, /maverick\s+throughput/i],
}

const clean = s => String(s).replace(/\s+/g,' ').trim()

async function getCardHandle(page, regexes){
  const handle = await page.evaluateHandle((reSrcs)=>{
    const regs = reSrcs.map(s=>new RegExp(s,'i'))
    const hs = [...document.querySelectorAll('h2,h3')]
    const h  = hs.find(el => regs.some(r=>r.test(el.textContent.trim())))
    if(!h) return null
    let n=h
    for(let i=0;i<6 && n && !String(n.className||'').includes('p-6');i++) n=n.parentElement
    return n || h.parentElement
  }, regexes.map(r=>r.source))
  return handle.asElement()
}

async function parseCard(page, cardEl, isScore){
  if(!cardEl) return []
  const rows = await cardEl.$$('[class*="justify-between"]')
  const out=[]
  for(const row of rows){
    const nameContainers = await row.$$('div.min-w-0.flex-1')
    let name=''
    if(nameContainers.length){
      const deep = nameContainers[nameContainers.length-1]
      const a = await deep.$('a') || await deep.$('span')
      if(a){ name = clean(await (await a.getProperty('innerText')).jsonValue()) }
    }
    const valSpan = await row.$('span.tabular-nums')
    const rawVal  = valSpan ? clean(await (await valSpan.getProperty('innerText')).jsonValue()) : ''
    if(!name) continue
    if(isScore){
      const m = rawVal.match(/(\d{1,3}(?:\.\d+)?)/) // 88.4
      if(m) out.push({name, score: parseFloat(m[1])})
    }else{
      out.push({name, value: rawVal})
    }
    if(out.length===5) break
  }
  return out
}

// ----------- extraction du grand tableau -----------
async function extractMainTable(page, maxRows = 30) {
  const tables = await page.$$('table')
  let table = null
  for (const t of tables) {
    const headers = await t.$$eval('thead th', ths => ths.map(th => th.innerText.trim().toLowerCase()))
    if (headers.includes('organization') && headers.includes('model')) {
      table = t
      break
    }
  }
  if (!table) return []

  const headers = await table.$$eval('thead th', ths => ths.map(th => th.innerText.trim()))
  const rows = await table.$$eval('tbody tr', trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())))

  const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
  const idx = {}
  headers.forEach((h,i)=>{ idx[norm(h)] = i })

  function pick(r, key){ const i = idx[key]; return i!=null ? r[i] : '' }

  const out = []
  for (const r of rows.slice(0, maxRows)) {
    out.push({
      organization: pick(r, 'organization'),
      model:        pick(r, 'model'),
      license:      pick(r, 'license'),
      parameters_b: pick(r, 'parameters b') || pick(r,'parameters'),
      context:      pick(r, 'context'),
      input_per_m:  pick(r, 'input m') || pick(r,'input $ m'),
      output_per_m: pick(r, 'output m')|| pick(r,'output $ m'),
      gpqa:         pick(r, 'gpqa'),
      mmlu:         pick(r, 'mmlu'),
      mmlu_pro:     pick(r, 'mmlu pro'),
    })
  }
  return out
}

;(async ()=>{
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath(),
    args: ['--no-sandbox','--disable-setuid-sandbox','--window-size=1440,1024']
  })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
  await page.goto(URL, {waitUntil:'domcontentloaded', timeout: 90000})
  for(let i=0;i<12;i++){ await page.evaluate(()=>window.scrollBy(0, window.innerHeight)); await sleep(300) }

  if(SAVE_SNAPSHOT){
    await page.screenshot({path:'leaderboard-snapshot.png', fullPage:true})
    await fs.writeFile('leaderboard-snapshot.html', await page.content(), 'utf8')
  }

  const codeEl  = await getCardHandle(page, TITLES.code)
  const multiEl = await getCardHandle(page, TITLES.multi)
  const knowEl  = await getCardHandle(page, TITLES.know)
  const ctxEl   = await getCardHandle(page, TITLES.ctx)
  const cheapEl = await getCardHandle(page, TITLES.cheap)
  const fastEl  = await getCardHandle(page, TITLES.fast)

  const code  = await parseCard(page, codeEl,  true)
  const multi = await parseCard(page, multiEl, true)
  const know  = await parseCard(page, knowEl,  true)
  const ctx   = await parseCard(page, ctxEl,   false)
  const cheap = await parseCard(page, cheapEl, false)
  const fast  = await parseCard(page, fastEl,  false)
  const table = await extractMainTable(page, 30) // top 30 lignes

  const data = {
    table, // tableau principal
    code, multimodal: multi, knowledge: know,
    longest_context: ctx, cheapest: cheap, fastest: fast
  }

  await fs.writeFile('top-leaderboards.json', JSON.stringify(data, null, 2), 'utf8')

  const counts = Object.fromEntries(Object.entries(data).map(([k,v])=>[k, Array.isArray(v)? v.length : 0]))
  await fs.writeFile('counts.json', JSON.stringify(counts), 'utf8')
  console.log('COUNTS:', counts)

  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
