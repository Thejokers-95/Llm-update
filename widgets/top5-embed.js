// Embeds Top 5 (multi-cibles), robuste + debug.
// Modes :
//  - Single : <script src=".../top5-embed.js" data-target="#id" data-section="code"></script>
//  - Multi  : <div class="llm-top5" data-section="code"></div> (xN)
//             <script src=".../top5-embed.js" data-selector=".llm-top5" data-json=".../top-leaderboards.json"></script>

(function () {
  // --- capture la balise <script> au PARSING (pas dans DOMContentLoaded) ---
  const S = document.currentScript || (function(){
    const sc = document.getElementsByTagName('script');
    return sc[sc.length - 1];
  })();

  const cfg = {
    debug: (S && S.getAttribute('data-debug') === '1'),
    singleTargetSel: (S && S.getAttribute('data-target')) || '',
    singleSection: ((S && S.getAttribute('data-section')) || 'code').toLowerCase(),
    multiSelector: (S && S.getAttribute('data-selector')) || '.llm-top5',
    jsonUrl:
      (S && S.getAttribute('data-json')) ||
      'https://cdn.jsdelivr.net/gh/Thejokers-95/Llm-update@main/top-leaderboards.json'
  };
  const log = (...a)=> cfg.debug && console.log('[top5-embed]', ...a);
  const error = (...a)=> cfg.debug && console.error('[top5-embed]', ...a);

  // injecte le CSS une seule fois
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
    .llm-embed .err{color:#b91c1c;font-size:12px;padding:10px 12px}
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

  function renderError(el, msg){
    if (!el) return;
    const box = document.createElement('div');
    box.className = 'llm-embed';
    box.innerHTML = `<div class="hd">Top 5</div><div class="err">${msg}</div>`;
    el.innerHTML = ''; el.appendChild(box);
  }

  function renderInto(el, section, data){
    if (!el) return;
    const arr = (data[section] || []).slice(0,5);
    if (!arr.length){ renderError(el, 'Aucune donnée'); return; }

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
        <div class="val">${it.score!=null ? (Number(it.score).toFixed(1)+'%') : (it.value||'')}</div>
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

  function run(){
    log('fetching', cfg.jsonUrl);
    fetch(cfg.jsonUrl, {cache:'no-store'}).then(r=>{
      if (!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }).then(data=>{
      if (cfg.singleTargetSel) {
        const el = document.querySelector(cfg.singleTargetSel);
        if (!el){ error('target not found:', cfg.singleTargetSel); return; }
        renderInto(el, cfg.singleSection, data);
      } else {
        const nodes = Array.from(document.querySelectorAll(cfg.multiSelector));
        if (!nodes.length){ error('no nodes for selector', cfg.multiSelector); return; }
        nodes.forEach(el=>{
          const section = (el.getAttribute('data-section') || 'code').toLowerCase();
          renderInto(el, section, data);
        });
      }
    }).catch(e=>{
      error('load failed:', e);
      if (cfg.singleTargetSel){
        const el = document.querySelector(cfg.singleTargetSel);
        if (el) renderError(el, 'Erreur de chargement');
      } else {
        document.querySelectorAll(cfg.multiSelector).forEach(el=>renderError(el,'Erreur de chargement'));
      }
    });
  }

  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run, {once:true});
})();
