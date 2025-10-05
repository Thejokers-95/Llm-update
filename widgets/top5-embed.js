// Embeds Top 5 (multi-cibles) — no deps.
// Modes :
//  - Single : <script src=".../top5-embed.js" data-target="#id" data-section="code"></script>
//  - Auto   : <div class="llm-top5" data-section="code"></div> ... (xN)
//             <script src=".../top5-embed.js" data-selector=".llm-top5"></script>

(function(){
  const S = document.currentScript;

  // If provided, render a single target (backward compatible)
  const singleTargetSel = S.getAttribute('data-target') || '';
  const singleSection   = (S.getAttribute('data-section') || 'code').toLowerCase();

  // Otherwise, find all .llm-top5 (or custom selector)
  const multiSelector   = S.getAttribute('data-selector') || '.llm-top5';

  // Where to fetch JSON
  const jsonUrl = S.getAttribute('data-json') ||
    S.src.replace(/\/widgets\/top5-embed\.js.*$/, '/top-leaderboards.json');

  // Inject CSS once
  if (!document.getElementById('llm-embed-style')) {
    const style = document.createElement('style');
    style.id = 'llm-embed-style';
    style.textContent = `
    .llm-embed{border:1px solid #e5e7eb;border-radius:12px;background:#fff;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a}
    .llm-embed .hd{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-weight:600}
    .llm-embed .row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-top:1px dashed #f1f5f9}
    .llm-embed .row:first-child{border-top:0}
    .llm-embed .rank{width:26px;height:26px;border-radius:9999px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;margin-right:8px}
    .llm-embed .name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
    .llm-embed .val{font-variant-numeric:tabular-nums}
    .llm-embed .ft{color:#64748b;font-size:12px;padding:8px 12px;border-top:1px solid #f1f5f9}
    `;
    document.head.appendChild(style);
  }

  const labels = {
    code:'Meilleur LLM – Code',
    multimodal:'Meilleur LLM – Multimodal',
    knowledge:'Meilleur LLM – Connaissances',
    longest_context:'Contexte le plus long',
    cheapest:'Fournisseur API le moins cher',
    fastest:'Fournisseur API le plus rapide'
  };

  function renderInto(el, section, data){
    if (!el) return;
    const arr = (data[section] || []).slice(0,5);
    const box = document.createElement('div');
    box.className = 'llm-embed';
    const title = labels[section] || 'Top 5';
    box.innerHTML = `<div class="hd">${title}</div>`;
    const list = document.createElement('div');
    arr.forEach((it,i)=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div style="display:flex;align-items:center;min-width:0;flex:1">
          <span class="rank">${i+1}</span>
          <span class="name">${(it.name||'').replace(/</g,'&lt;')}</span>
        </div>
        <div class="val">${it.score!=null ? (it.score.toFixed(1)+'%') : (it.value||'')}</div>
      `;
      list.appendChild(row);
    });
    box.appendChild(list);
    const ft = document.createElement('div');
    ft.className = 'ft';
    ft.textContent = 'Source: llm-stats.com';
    box.appendChild(ft);
    el.innerHTML = '';
    el.appendChild(box);
  }

  fetch(jsonUrl, {cache:'no-store'})
    .then(r=>r.json())
    .then(data=>{
      if (singleTargetSel) {
        const el = document.querySelector(singleTargetSel);
        renderInto(el, singleSection, data);
      } else {
        document.querySelectorAll(multiSelector).forEach(el=>{
          const section = (el.getAttribute('data-section') || 'code').toLowerCase();
          renderInto(el, section, data);
        });
      }
    })
    .catch(e=>console.error('top5-embed error:', e));
})();
