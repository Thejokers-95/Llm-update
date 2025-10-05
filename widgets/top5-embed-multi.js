// Multi-only Top5 embed (zéro data-target, zéro dépendance à currentScript).
// Injecte le style une seule fois et rend toutes les .llm-top5 de la page.
// JSON_URL peut être surchargée en définissant window.LLM_TOP5_JSON avant le script.

(function () {
  const JSON_URL_DEFAULT =
    'https://cdn.jsdelivr.net/gh/Thejokers-95/Llm-update@main/top-leaderboards.json';

  const labels = {
    code:'Meilleur LLM – Code',
    multimodal:'Meilleur LLM – Multimodal',
    knowledge:'Meilleur LLM – Connaissances',
    longest_context:'Contexte le plus long',
    cheapest:'Fournisseur API le moins cher',
    fastest:'Fournisseur API le plus rapide'
  };

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  }

  function injectStyle(){
    if (document.getElementById('llm-embed-style')) return;
    const style = document.createElement('style');
    style.id = 'llm-embed-style';
    style.textContent = `
    .llm-embed{border:1px solid #e5e7eb;border-radius:12px;background:#fff;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a}
    .llm-embed .hd{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-weight:600}
    .llm-embed .row:first-child{border-top:0}
    .llm-embed .rank{width:26px;height:26px;border-radius:9999px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;margin-right:8px}
    .llm-embed .ft{color:#64748b;font-size:12px;padding:8px 12px;border-top:1px solid #f1f5f9}
    .llm-embed .err{color:#b91c1c;font-size:12px;padding:10px 12px}
    .llm-embed .row { align-items: center; }
    .llm-embed .val { white-space: nowrap; flex: 0 0 auto; margin-left: 12px; }
    /* on s'assure que le nom peut se compacter si besoin */
    .llm-embed .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    `;
    document.head.appendChild(style);
  }

  function renderError(el, msg){
    const box = document.createElement('div');
    box.className = 'llm-embed';
    box.innerHTML = `<div class="hd">Top 5</div><div class="err">${msg}</div>`;
    el.innerHTML = ''; el.appendChild(box);
  }

  function renderInto(el, section, data){
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

    const ft = document.createElement('div');
    ft.className = 'ft';
    ft.textContent = 'Source: llm-stats.com';

    box.appendChild(list);
    box.appendChild(ft);
    el.innerHTML = '';
    el.appendChild(box);
  }

  ready(function(){
    injectStyle();

    const nodes = Array.from(document.querySelectorAll('.llm-top5'));
    if (!nodes.length) { console.warn('[top5-embed-multi] aucune .llm-top5 trouvée'); return; }

    const url = window.LLM_TOP5_JSON || JSON_URL_DEFAULT;
    fetch(url, {cache:'no-store'})
      .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(data => {
        nodes.forEach(el=>{
          const section = (el.getAttribute('data-section') || 'code').toLowerCase();
          renderInto(el, section, data);
        });
      })
      .catch(e => {
        console.error('[top5-embed-multi] chargement échoué', e);
        nodes.forEach(el => renderError(el, 'Erreur de chargement'));
      });
  });
})();
