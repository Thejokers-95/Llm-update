// Lightweight SVG trend widget (no deps)
// Usage:
// <div id="llm-trend"></div>
// <script src="https://cdn.jsdelivr.net/gh/Thejokers-95/Llm-update@main/widgets/trend.js"
//         data-target="#llm-trend" data-section="code" data-range="30"></script>
(function(){
  const script = document.currentScript
  const targetSel = script.getAttribute('data-target') || '#llm-trend'
  const section = (script.getAttribute('data-section') || 'code').toLowerCase()
  const range = parseInt(script.getAttribute('data-range')||'30',10)
  const baseUrl = script.getAttribute('data-base') || script.src.replace(/\/widgets\/trend\.js.*$/,'/history/trends.json')

  const el = document.querySelector(targetSel)
  if(!el){ console.error('trend.js: target not found'); return }

  fetch(baseUrl, {cache:'no-store'}).then(r=>r.json()).then(trends=>{
    const sec = trends[section] || {}
    // pick top 3 by last value
    const series = Object.entries(sec).map(([name,pts])=>{
      const cleanPts = pts.filter(p=>p && p.date && typeof p.value==='number')
      return [name, cleanPts]
    }).filter(([,pts])=>pts.length>0)
    .sort((a,b)=>b[1][b[1].length-1].value - a[1][a[1].length-1].value)
    .slice(0,3)

    // time domain (last N days)
    const allDates = Array.from(new Set(series.flatMap(([,pts])=>pts.map(p=>p.date)))).sort()
    const lastDates = allDates.slice(-range)
    if (lastDates.length === 0){ el.textContent = 'Aucune donnée'; return }

    // map date->index
    const idx = new Map(lastDates.map((d,i)=>[d,i]))
    const W=640, H=280, P=36
    const innerW = W - P*2, innerH = H - P*2

    // build y domain
    let min = Infinity, max = -Infinity
    series.forEach(([,pts])=>{
      pts.forEach(p=>{
        if (idx.has(p.date)) {
          if (p.value < min) min = p.value
          if (p.value > max) max = p.value
        }
      })
    })
    if (!isFinite(min) || !isFinite(max)){ el.textContent='Aucune donnée'; return }
    if (min === max) { min = 0 } // flat line

    const x = (i)=> P + (i/(lastDates.length-1))*innerW
    const y = (v)=> P + innerH - ((v-min)/(max-min))*innerH

    // Build SVG
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS,'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('width','100%')
    svg.setAttribute('height','100%')
    svg.style.maxWidth = '100%'

    // axes (light)
    const axis = document.createElementNS(svgNS,'g')
    const xLine = document.createElementNS(svgNS,'line')
    xLine.setAttribute('x1', P); xLine.setAttribute('y1', H-P)
    xLine.setAttribute('x2', W-P); xLine.setAttribute('y2', H-P)
    xLine.setAttribute('stroke', '#e5e7eb')
    axis.appendChild(xLine)

    const yLine = document.createElementNS(svgNS,'line')
    yLine.setAttribute('x1', P); yLine.setAttribute('y1', P)
    yLine.setAttribute('x2', P); yLine.setAttribute('y2', H-P)
    yLine.setAttribute('stroke', '#e5e7eb')
    axis.appendChild(yLine)

    svg.appendChild(axis)

    // grid (few ticks)
    const yTicks = 4
    for (let i=0; i<=yTicks; i++){
      const yy = P + (i/yTicks)*innerH
      const gl = document.createElementNS(svgNS,'line')
      gl.setAttribute('x1', P)
      gl.setAttribute('y1', yy)
      gl.setAttribute('x2', W-P)
      gl.setAttribute('y2', yy)
      gl.setAttribute('stroke', '#f1f5f9')
      svg.appendChild(gl)

      const val = (max - (i/yTicks)*(max-min))
      const lb = document.createElementNS(svgNS,'text')
      lb.setAttribute('x', P-8)
      lb.setAttribute('y', yy+4)
      lb.setAttribute('text-anchor', 'end')
      lb.setAttribute('font-size', '10')
      lb.setAttribute('fill', '#64748b')
      lb.textContent = (Math.round(val*10)/10).toString()
      svg.appendChild(lb)
    }

    // date labels (first & last)
    const dFirst = document.createElementNS(svgNS,'text')
    dFirst.setAttribute('x', P)
    dFirst.setAttribute('y', H-P+14)
    dFirst.setAttribute('font-size','10')
    dFirst.setAttribute('fill','#64748b')
    dFirst.textContent = lastDates[0]
    svg.appendChild(dFirst)

    const dLast = document.createElementNS(svgNS,'text')
    dLast.setAttribute('x', W-P)
    dLast.setAttribute('y', H-P+14)
    dLast.setAttribute('text-anchor','end')
    dLast.setAttribute('font-size','10')
    dLast.setAttribute('fill','#64748b')
    dLast.textContent = lastDates[lastDates.length-1]
    svg.appendChild(dLast)

    // color palette (no specific colors requested -> keep defaults readable)
    const colors = ['#0f172a','#2563eb','#16a34a'] // dark, blue, green

    // lines
    series.forEach(([name,pts], si)=>{
      let d = ''
      lastDates.forEach((dstr, i)=>{
        const p = pts.find(p=>p.date===dstr)
        if (!p) return
        const X = x(i), Y = y(p.value)
        d += (i===0 ? `M ${X} ${Y}` : ` L ${X} ${Y}`)
      })
      const path = document.createElementNS(svgNS,'path')
      path.setAttribute('d', d)
      path.setAttribute('fill','none')
      path.setAttribute('stroke', colors[si%colors.length])
      path.setAttribute('stroke-width','2')
      svg.appendChild(path)
    })

    // legend (top-right)
    const legend = document.createElementNS(svgNS,'g')
    const lx = W - P - 140, ly = P + 6
    series.forEach(([name], i)=>{
      const yoff = ly + i*16
      const sw = document.createElementNS(svgNS,'rect')
      sw.setAttribute('x', lx)
      sw.setAttribute('y', yoff-8)
      sw.setAttribute('width', 10)
      sw.setAttribute('height', 10)
      sw.setAttribute('fill', colors[i%colors.length])
      legend.appendChild(sw)

      const lb = document.createElementNS(svgNS,'text')
      lb.setAttribute('x', lx+16)
      lb.setAttribute('y', yoff)
      lb.setAttribute('font-size','11')
      lb.setAttribute('fill','#334155')
      lb.textContent = name
      legend.appendChild(lb)
    })
    svg.appendChild(legend)

    // inject
    el.innerHTML = ''
    el.appendChild(svg)
  }).catch(e=>{
    el.textContent = 'Erreur de chargement des tendances'
    console.error(e)
  })
})();
