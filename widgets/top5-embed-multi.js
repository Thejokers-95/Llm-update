// widgets/top5-embed-multi.js — v4 (Shadow DOM, sans CSS externe, multi-cartes)
(function () {
  const JSON_URL_DEFAULT =
    'https://cdn.jsdelivr.net/gh/Thejokers-95/Llm-update@main/top-leaderboards.json';

  const LABELS = {
    code: 'Meilleur LLM – Code',
    multimodal: 'Meilleur LLM – Multimodal',
    knowledge: 'Meilleur LLM – Connaissances',
    longest_context: 'Contexte le plus long',
    cheapest: 'Fournisseur API le moins cher',
    fastest: 'Fournisseur API le plus rapide'
  };

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  }

  function cardCSS() {
    return `
      :host { display:block; box-sizing:border-box; }
      *, *::before, *::after { box-sizing:border-box; }
      .card{
        border:1px solid #e5e7eb; border-radius:12px; background:#fff;
        color:#0f172a; font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial;
      }
      .hd{ padding:12px 14px; border-bottom:1px solid #f1f5f9; font-weight:600; }
      .row{
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 12px; border-top:1px dashed #f1f5f9;
      }
      .row:first-child{ border-top:0 }
      .left{ display:flex; align-items:center; gap:8px; min-width:0; flex:1 1 auto; }
      .rank{
        width:26px; height:26px; border-radius:9999px; background:#0f172a; color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-weight:600; font-size:12px; flex:0 0 auto;
      }
      .name{
        min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500;
      }
      .right{
        display:inline-flex; white-space:nowrap; flex:0 0 auto; margin-left:12px;
        font-variant-numeric:tabular-nums;
      }
      .ft{ color:#64748b; font-size:12px; padding:8px 12px; border-top:1px solid #f1f5f9 }
      .err{ color:#b91c1c; font-size:12px; padding:10px 12px }
    `;
  }

  function renderCard(root, section, data){
    const arr = (data[section] || []).slice(0,5);
    const title = LABELS[section] || 'Top 5';

    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = `<div class="hd">${title}</div>`;

    if (!arr.length){
      const err = document.createElement('div');
      err.className = 'err';
      err.textContent = 'Aucune donnée';
      wrap.appendChild(err);
      root.innerHTML = ''; root.appendChild(wrap);
      return;
    }

    const list = document.createElement('div');
    arr.forEach((it,i)=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="left">
          <span class="rank">${i+1}</span>
          <span class="name">${(it.name||'').replace(/</g,'&lt;')}</span>
        </div>
        <div class="right">${it.score!=null ? (Number(it.score).toFixed(1)+'%') : (it.value||'')}</div>
      `;
      list.appendChild(row);
    });

    const ft = document.createElement('div');
    ft.className = 'ft';
    ft.textContent = 'Source: llm-stats.com';

    wrap.appendChild(list);
    wrap.appendChild(ft);

    root.innerHTML = '';
    root.appendChild(wrap);
  }

  function renderIntoHost(host, section, data){
    // 1) Shadow DOM pour isoler le style
    const shadow = host.shadowRoot || host.attachShadow({mode:'open'});
    // 2) Style encapsulé
    const style = document.createElement('style');
    style.textContent = cardCSS();
    // 3) Conteneur
    const root = document.createElement('div');
    shadow.innerHTML = ''; // reset
    shadow.appendChild(style);
    shadow.appendChild(root);
    // 4) Rendu
    renderCard(root, section, data);
  }

  ready(function(){
    const nodes = Array.from(document.querySelectorAll('.llm-top5'));
    if (!nodes.length) return;

    const url = (window.LLM_TOP5_JSON || JSON_URL_DEFAULT);
    fetch(url, {cache:'no-store'})
      .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(data => {
        nodes.forEach(el=>{
          const section = (el.getAttribute('data-section') || 'code').toLowerCase();
          renderIntoHost(el, section, data);
        });
      })
      .catch(e => {
        nodes.forEach(el=>{
          const shadow = el.shadowRoot || el.attachShadow({mode:'open'});
          const style = document.createElement('style'); style.textContent = cardCSS();
          const box = document.createElement('div'); box.className = 'card';
          box.innerHTML = `<div class="hd">Top 5</div><div class="err">Erreur de chargement</div>`;
          shadow.innerHTML=''; shadow.appendChild(style); shadow.appendChild(box);
        });
        console.error('[llm-top5] load failed:', e);
      });
  });
})();
