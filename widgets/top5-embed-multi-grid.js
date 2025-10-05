// widgets/top5-embed-multi-grid.js — v1.1 (Shadow DOM + CSS Grid, multi-cartes, lien source)
(function () {
  const JSON_URL_DEFAULT =
    'https://cdn.jsdelivr.net/gh/Thejokers-95/Llm-update@main/top-leaderboards.json';

  // 👉 Page source (ton site)
  const SOURCE_URL = 'https://www.ia-insights.fr/classement-des-meilleurs-llm/';

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
      /* GRID : 1 colonne flexible pour la gauche, 1 colonne auto pour la valeur */
      .row{
        display:grid; grid-template-columns: 1fr auto; column-gap:12px;
        align-items:center; padding:10px 12px; border-top:1px dashed #f1f5f9;
      }
      .row:first-child{ border-top:0 }
      .left{ display:flex; align-items:center; gap:8px; min-width:0; }
      .rank{
        width:26px; height:26px; border-radius:9999px; background:#0f172a; color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-weight:600; font-size:12px; flex:0 0 auto;
      }
      .name{
        min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500;
      }
      .right{
        white-space:nowrap; font-variant-numeric:tabular-nums;
      }
      .ft{
        color:#64748b; font-size:12px; padding:8px 12px; border-top:1px solid #f1f5f9
      }
      .ft a{ color:#0f172a; text-decoration:none; border-bottom:1px dotted #94a3b8 }
      .ft a:hover{ text-decoration:none; border-bottom-color:#0f172a }
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

      const ft = document.createElement('div');
      ft.className = 'ft';
      ft.innerHTML = `Source : <a href="${SOURCE_URL}" target="_blank" rel="noopener">IA Insights — Classement des meilleurs LLM</a>`;
      wrap.appendChild(ft);

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
    // Lien vers TA page (source) + mention d’origine des données
    ft.innerHTML = `Source : <a href="${SOURCE_URL}" target="_blank" rel="noopener">IA Insights — Classement des meilleurs LLM</a> · Données : llm-stats.com`;

    wrap.appendChild(list);
    wrap.appendChild(ft);

    root.innerHTML = '';
    root.appendChild(wrap);
  }

  function renderIntoHost(host, section, data){
    const shadow = host.shadowRoot || host.attachShadow({mode:'open'});
    const style = document.createElement('style'); style.textContent = cardCSS();
    const root = document.createElement('div');
    shadow.innerHTML = '';
    shadow.appendChild(style);
    shadow.appendChild(root);
    renderCard(root, section, data);
  }

  ready(function(){
    const nodes = Array.from(document.querySelectorAll('.llm-top5'));
    if (!nodes.length) return;

    const url = (window.LLM_TOP5_JSON || JSON_URL_DEFAULT);
    fetch(url, {cache:'no-store'})
      .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(data => { nodes.forEach(el => {
        const section = (el.getAttribute('data-section') || 'code').toLowerCase();
        renderIntoHost(el, section, data);
      });})
      .catch(e => {
        nodes.forEach(el=>{
          const shadow = el.shadowRoot || el.attachShadow({mode:'open'});
          const style = document.createElement('style'); style.textContent = cardCSS();
          const box = document.createElement('div'); box.className = 'card';
          box.innerHTML = `<div class="hd">Top 5</div><div class="err">Erreur de chargement</div>
                           <div class="ft">Source : <a href="${SOURCE_URL}" target="_blank" rel="noopener">IA Insights — Classement des meilleurs LLM</a></div>`;
          shadow.innerHTML=''; shadow.appendChild(style); shadow.appendChild(box);
        });
        console.error('[llm-top5] load failed:', e);
      });
  });
})();
