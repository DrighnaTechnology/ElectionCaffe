/**
 * Builds a standalone HTML report with Chart.js visualizations.
 * Layout per section:
 *   - Sections WITH charts: charts in a 2-col or 3-col grid FIRST, then AI narrative below
 *   - Sections WITHOUT charts: full-width narrative only
 * Each chart card has a clear bold title.
 */

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/## (.+)/g, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ol-item">$1</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li class="ul-item">$1</li>')
    .replace(/(<li class="ol-item">.*<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`)
    .replace(/(<li class="ul-item">.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function priorityBadge(p: string): string {
  const map: Record<string, string> = {
    critical: 'background:#fee2e2;color:#b91c1c',
    high: 'background:#dbeafe;color:#1d4ed8',
    medium: 'background:#f3f4f6;color:#4b5563',
  };
  return `<span class="badge" style="${map[p] || map.medium}">${esc(p)}</span>`;
}

export function buildReportHTML(data: any): string {
  const el = data.election || {};
  const cd = data.chartData || {};
  const sections: any[] = data.report || [];
  const generatedAt = data.generatedAt || new Date().toISOString();

  const title = `AI Strategic Report — ${el.name || 'Election'}`;
  const subtitle = [el.constituency, el.district, el.state].filter(Boolean).join(', ');

  // Build each section — charts FIRST (grid), then narrative text below
  const sectionBlocks = sections.map((s: any) => {
    const id = s.id || '';
    let chartsHTML = '';

    if (id === 'voter-composition') {
      chartsHTML = `
      <div class="cg c3">
        <div class="cc"><div class="ct">Gender Split</div><canvas id="ch-gender"></canvas></div>
        <div class="cc"><div class="ct">Political Leaning</div><canvas id="ch-leaning"></canvas></div>
        <div class="cc"><div class="ct">Influence Levels</div><canvas id="ch-influence"></canvas></div>
      </div>
      <div class="cg c2">
        <div class="cc"><div class="ct">Age Distribution</div><canvas id="ch-age"></canvas></div>
        <div class="cc tall"><div class="ct">Age Group Comparison</div><canvas id="ch-age-pie"></canvas></div>
      </div>
      ${(cd.religions?.length || cd.castes?.length) ? `<div class="cg c2">
        ${cd.religions?.length ? '<div class="cc"><div class="ct">Religion Breakdown</div><canvas id="ch-religion"></canvas></div>' : ''}
        ${cd.castes?.length ? '<div class="cc"><div class="ct">Caste Category Breakdown</div><canvas id="ch-caste"></canvas></div>' : ''}
      </div>` : ''}`;
    } else if (id === 'booth-intelligence') {
      chartsHTML = `
      <div class="cg c2">
        <div class="cc"><div class="ct">Booth Type — Urban / Rural / Vulnerable</div><canvas id="ch-booth-type"></canvas></div>
        <div class="cc"><div class="ct">Top 10 Booths by Voter Count</div><canvas id="ch-top-booths"></canvas></div>
      </div>`;
    } else if (id === 'cadre-assessment') {
      chartsHTML = `
      <div class="cg c2">
        <div class="cc"><div class="ct">Active vs Inactive Cadres</div><canvas id="ch-cadre-status"></canvas></div>
        <div class="cc"><div class="ct">Cadre-to-Booth Coverage Ratio</div><canvas id="ch-cadre-ratio"></canvas></div>
      </div>`;
    } else if (id === 'family-networks') {
      chartsHTML = `
      <div class="cg c2">
        <div class="cc"><div class="ct">Family Coverage of Total Voters</div><canvas id="ch-family"></canvas></div>
        <div class="cc"><div class="ct">Family Reach Summary</div>
          <div class="stat-grid" id="family-stats"></div>
        </div>
      </div>`;
    }

    return `
    <div class="section">
      <div class="sh">
        <h2>${s.title || ''}</h2>
        ${priorityBadge(s.priority)}
      </div>
      <div class="sb">
        ${chartsHTML}
        ${chartsHTML ? '<div class="ai-label">AI Analysis</div>' : ''}
        <div class="nar">${renderMarkdown(s.content)}</div>
      </div>
    </div>`;
  }).join('');

  const chartJSON = JSON.stringify(cd);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;background:#f1f5f9;line-height:1.6}

.hdr{background:linear-gradient(135deg,#0f172a,#1e3a5f 50%,#1d4ed8);color:#fff;padding:2.5rem 2rem 2rem}
.hdr h1{font-size:1.5rem;font-weight:700}
.hdr .sub{opacity:.8;font-size:.88rem;margin-top:.2rem}
.hdr .meta{margin-top:.8rem;display:flex;gap:1.5rem;font-size:.76rem;opacity:.7;flex-wrap:wrap}

.tbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:.55rem 2rem;display:flex;justify-content:flex-end;gap:.5rem;position:sticky;top:0;z-index:10}
.tbar button{padding:.35rem .9rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:.78rem;color:#475569;transition:all .15s}
.tbar button:hover{background:#f1f5f9;border-color:#94a3b8}

.wrap{max-width:1200px;margin:0 auto;padding:1.5rem 2rem 3rem}

/* Metrics */
.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:.7rem;margin-bottom:2rem}
.mc{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem .75rem;text-align:center;position:relative;overflow:hidden}
.mc::after{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.mc:nth-child(1)::after{background:#2563eb}
.mc:nth-child(2)::after{background:#10b981}
.mc:nth-child(3)::after{background:#f59e0b}
.mc:nth-child(4)::after{background:#8b5cf6}
.mc:nth-child(5)::after{background:#ec4899}
.mc:nth-child(6)::after{background:#ef4444}
.mc .v{font-size:1.5rem;font-weight:800;color:#0f172a}
.mc .l{font-size:.68rem;color:#64748b;margin-top:.15rem;text-transform:uppercase;letter-spacing:.04em}

/* Sections */
.section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:1.25rem;overflow:hidden}
.sh{display:flex;justify-content:space-between;align-items:center;padding:.8rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.sh h2{font-size:1.05rem;font-weight:700;color:#0f172a}
.badge{font-size:.6rem;padding:3px 10px;border-radius:99px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.sb{padding:1.25rem 1.5rem}

/* Chart grids */
.cg{display:grid;gap:.85rem;margin-bottom:1rem}
.cg.c3{grid-template-columns:repeat(3,1fr)}
.cg.c2{grid-template-columns:1fr 1fr}

.cc{background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;padding:.85rem 1rem;display:flex;flex-direction:column}
.ct{font-size:.75rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.03em;margin-bottom:.5rem;padding-bottom:.35rem;border-bottom:2px solid #e2e8f0}
.cc canvas{width:100%!important;flex:1;max-height:240px}
.cc .print-img{display:none}

/* AI Analysis label */
.ai-label{font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin:1rem 0 .5rem;padding-top:.75rem;border-top:1px dashed #e2e8f0}

/* Narrative */
.nar{font-size:.85rem;color:#475569;columns:2;column-gap:2rem}
.nar h2{font-size:.9rem;font-weight:700;margin:.75rem 0 .3rem;color:#0f172a;column-span:all}
.nar h3{font-size:.85rem;font-weight:600;margin:.6rem 0 .25rem;color:#334155}
.nar strong{font-weight:600;color:#1e293b}
.nar ul,.nar ol{padding-left:1.25rem;margin:.3rem 0}
.nar li{margin-bottom:.2rem;break-inside:avoid}

/* Sections without charts: single-column narrative */
.sb:not(:has(.cg)) .nar{columns:1}

/* Stat grid for family section */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:.5rem 0}
.stat-box{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:.6rem;text-align:center}
.stat-box .sv{font-size:1.3rem;font-weight:800;color:#0f172a}
.stat-box .sl{font-size:.65rem;color:#64748b;text-transform:uppercase;letter-spacing:.03em;margin-top:.1rem}

.footer{text-align:center;color:#94a3b8;font-size:.72rem;padding:2rem 0 1rem}

@media print{
  @page{size:A3 portrait;margin:10mm}
  body{background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  .tbar{display:none}
  .hdr{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .wrap{max-width:100%;padding:0}
  /* Keep ALL grids exactly the same as screen */
  .metrics{grid-template-columns:repeat(6,1fr)}
  .cg.c3{grid-template-columns:repeat(3,1fr)}
  .cg.c2{grid-template-columns:1fr 1fr}
  .nar{columns:2;column-gap:2rem}
  .sb:not(:has(.cg)) .nar{columns:1}
  .stat-grid{grid-template-columns:1fr 1fr}
  /* Colors */
  .mc{border:1px solid #e2e8f0;-webkit-print-color-adjust:exact!important}
  .mc::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .section{page-break-inside:auto}
  .sh{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .badge{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .cc{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  /* Chart images for print */
  .cc canvas{display:none!important}
  .cc .print-img{display:block!important;width:100%;max-height:240px;object-fit:contain}
  .stat-box{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .footer{page-break-before:auto}
}
@media(max-width:900px){
  .cg.c3{grid-template-columns:1fr 1fr}
  .nar{columns:1}
}
@media(max-width:768px){
  .hdr{padding:1.5rem 1rem}
  .wrap{padding:1rem}
  .metrics{grid-template-columns:repeat(3,1fr)}
  .cg.c2,.cg.c3{grid-template-columns:1fr}
}
@media(max-width:480px){
  .metrics{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>

<div class="hdr">
  <h1>${esc(title)}</h1>
  <div class="sub">${esc(subtitle)}</div>
  <div class="meta">
    <span>Status: ${esc(el.status || 'N/A')}</span>
    <span>Type: ${esc(el.type || 'N/A')}</span>
    ${el.pollDate ? `<span>Poll Date: ${new Date(el.pollDate).toLocaleDateString('en-IN')}</span>` : ''}
    <span>Generated: ${new Date(generatedAt).toLocaleString('en-IN')}</span>
  </div>
</div>

<div class="tbar">
  <button onclick="printReport()">&#128424; Save as PDF</button>
</div>

<div class="wrap">

  <div class="metrics">
    <div class="mc"><div class="v">${(el.totalVoters || 0).toLocaleString('en-IN')}</div><div class="l">Total Voters</div></div>
    <div class="mc"><div class="v">${el.totalBooths || 0}</div><div class="l">Polling Booths</div></div>
    <div class="mc"><div class="v">${cd.cadres?.total || 0}</div><div class="l">Total Cadres</div></div>
    <div class="mc"><div class="v">${(cd.families?.total || 0).toLocaleString('en-IN')}</div><div class="l">Families</div></div>
    <div class="mc"><div class="v">${el.candidateCount || 0}</div><div class="l">Candidates</div></div>
    <div class="mc"><div class="v">${cd.booths?.vulnerable || 0}</div><div class="l">Vulnerable Booths</div></div>
  </div>

  ${sectionBlocks}

  <div class="footer">Powered by CaffeAI &middot; Generated on ${new Date(generatedAt).toLocaleString('en-IN')}</div>
</div>

<script>
(function(){
  var D = ${chartJSON};
  var PAL = ['#2563eb','#f59e0b','#ef4444','#10b981','#8b5cf6','#f97316','#06b6d4','#ec4899','#84cc16','#6366f1'];

  function mk(id,cfg){var e=document.getElementById(id);if(!e)return;new Chart(e,cfg)}
  function pctTip(ctx){
    var t=ctx.dataset.data.reduce(function(a,b){return a+b},0);
    var p=t>0?((ctx.raw/t)*100).toFixed(1):0;
    return ctx.label+': '+ctx.raw.toLocaleString('en-IN')+' ('+p+'%)';
  }
  var tip={callbacks:{label:pctTip}};
  var leg={position:'bottom',labels:{padding:12,usePointStyle:true,pointStyleWidth:10,font:{size:11}}};

  /* ── VOTER COMPOSITION ── */

  if(D.gender){
    mk('ch-gender',{type:'doughnut',
      data:{labels:['Male','Female','Other'],datasets:[{data:[D.gender.male,D.gender.female,D.gender.other],backgroundColor:['#3b82f6','#ec4899','#a78bfa'],borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'55%',plugins:{legend:leg,tooltip:tip}}
    });
  }

  if(D.politicalLeaning){
    mk('ch-leaning',{type:'polarArea',
      data:{labels:['Loyal','Swing','Opposition','Unknown'],datasets:[{data:[D.politicalLeaning.loyal,D.politicalLeaning.swing,D.politicalLeaning.opposition,D.politicalLeaning.unknown],backgroundColor:['#10b98199','#f59e0b99','#ef444499','#94a3b899'],borderColor:['#10b981','#f59e0b','#ef4444','#94a3b8'],borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:leg,tooltip:tip},scales:{r:{ticks:{display:false},grid:{color:'#e2e8f0'}}}}
    });
  }

  if(D.influence){
    mk('ch-influence',{type:'doughnut',
      data:{labels:['High','Medium','Low','None'],datasets:[{data:[D.influence.high,D.influence.medium,D.influence.low,D.influence.none],backgroundColor:['#10b981','#f59e0b','#f97316','#cbd5e1'],borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'55%',plugins:{legend:leg,tooltip:tip}}
    });
  }

  if(D.age){
    var aK=Object.keys(D.age),aV=Object.values(D.age);
    var aC=['#06b6d4','#3b82f6','#8b5cf6','#f59e0b','#ef4444'];
    mk('ch-age',{type:'bar',
      data:{labels:aK,datasets:[{label:'Voters',data:aV,backgroundColor:aC.map(function(c){return c+'66'}),borderColor:aC,borderWidth:2,borderRadius:6,barPercentage:.7}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:function(v){return v.toLocaleString('en-IN')},font:{size:10}}},x:{grid:{display:false},ticks:{font:{size:11,weight:'600'}}}}}
    });
    mk('ch-age-pie',{type:'pie',
      data:{labels:aK.map(function(k,i){return k+' ('+aV[i].toLocaleString('en-IN')+')'}),datasets:[{data:aV,backgroundColor:aC,borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:leg,tooltip:tip}}
    });
  }

  if(D.religions&&D.religions.length){
    mk('ch-religion',{type:'bar',
      data:{labels:D.religions.map(function(r){return r.name}),datasets:[{label:'Voters',data:D.religions.map(function(r){return r.count}),backgroundColor:PAL.slice(0,D.religions.length).map(function(c){return c+'55'}),borderColor:PAL.slice(0,D.religions.length),borderWidth:2,borderRadius:4,barPercentage:.55}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11}}}}}
    });
  }

  if(D.castes&&D.castes.length){
    mk('ch-caste',{type:'pie',
      data:{labels:D.castes.map(function(c){return c.name}),datasets:[{data:D.castes.map(function(c){return c.count}),backgroundColor:['#8b5cf6','#06b6d4','#f59e0b','#10b981','#ef4444'].slice(0,D.castes.length),borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:leg,tooltip:tip}}
    });
  }

  /* ── BOOTH INTELLIGENCE ── */

  if(D.booths){
    mk('ch-booth-type',{type:'pie',
      data:{labels:['Urban ('+D.booths.urban+')','Rural ('+D.booths.rural+')','Vulnerable ('+D.booths.vulnerable+')'],datasets:[{data:[D.booths.urban,D.booths.rural,D.booths.vulnerable],backgroundColor:['#3b82f6','#10b981','#ef4444'],borderWidth:2,borderColor:'#fff',hoverOffset:8}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:leg}}
    });
  }

  if(D.topBooths&&D.topBooths.length){
    mk('ch-top-booths',{type:'bar',
      data:{labels:D.topBooths.map(function(b){return b.name+(b.vulnerable?' ⚠':'')}),datasets:[{label:'Voters',data:D.topBooths.map(function(b){return b.voters}),backgroundColor:D.topBooths.map(function(b){return b.vulnerable?'#ef444455':'#3b82f644'}),borderColor:D.topBooths.map(function(b){return b.vulnerable?'#ef4444':'#3b82f6'}),borderWidth:2,borderRadius:4,barPercentage:.6}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{callback:function(v){return v.toLocaleString('en-IN')},font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}
    });
  }

  /* ── CADRE ── */

  if(D.cadres){
    var inact=Math.max(0,(D.cadres.total||0)-(D.cadres.active||0));
    mk('ch-cadre-status',{type:'doughnut',
      data:{labels:['Active ('+D.cadres.active+')','Inactive ('+inact+')'],datasets:[{data:[D.cadres.active,inact],backgroundColor:['#10b981','#cbd5e1'],borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'60%',plugins:{legend:leg,tooltip:tip}}
    });
  }

  if(D.cadres&&D.cadres.boothRatio!==undefined){
    var r=D.cadres.boothRatio;
    var rc=r>=3?'#10b981':r>=1.5?'#f59e0b':'#ef4444';
    mk('ch-cadre-ratio',{type:'bar',
      data:{labels:['Current: '+r.toFixed(1)+' cadres/booth'],datasets:[{label:'Ratio',data:[r],backgroundColor:rc+'55',borderColor:rc,borderWidth:2,borderRadius:6,barPercentage:.35}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.raw+' cadres per booth'}}}},scales:{x:{beginAtZero:true,max:Math.max(r*1.5,5),grid:{color:'#f1f5f9'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:11,weight:'600'}}}}}
    });
  }

  /* ── FAMILY ── */
  if(D.families){
    var ft=D.families.total||0,vt=${el.totalVoters||0};
    var avg=D.families.avgSize||0;
    var cov=Math.min(ft*avg,vt);
    var unc=Math.max(0,vt-cov);
    var covPct=vt>0?((cov/vt)*100).toFixed(1):'0';
    mk('ch-family',{type:'doughnut',
      data:{labels:['Covered ('+Math.round(cov).toLocaleString('en-IN')+')','Uncovered ('+Math.round(unc).toLocaleString('en-IN')+')'],datasets:[{data:[Math.round(cov),Math.round(unc)],backgroundColor:['#8b5cf6','#e2e8f0'],borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'55%',plugins:{legend:leg,tooltip:tip}}
    });
    // Fill stat boxes
    var sg=document.getElementById('family-stats');
    if(sg){
      sg.innerHTML='<div class="stat-box"><div class="sv">'+ft.toLocaleString('en-IN')+'</div><div class="sl">Total Families</div></div>'
        +'<div class="stat-box"><div class="sv">'+avg.toFixed(1)+'</div><div class="sl">Avg Family Size</div></div>'
        +'<div class="stat-box"><div class="sv">'+covPct+'%</div><div class="sl">Voter Coverage</div></div>'
        +'<div class="stat-box"><div class="sv">'+Math.round(unc).toLocaleString('en-IN')+'</div><div class="sl">Uncovered Voters</div></div>';
    }
  }

})();

// Convert all Chart.js canvases to static images for print fidelity
function printReport(){
  var canvases=document.querySelectorAll('.cc canvas');
  canvases.forEach(function(c){
    // Remove any previously created print images
    var existing=c.parentElement.querySelector('.print-img');
    if(existing) existing.remove();
    // Create high-res image from canvas
    var img=document.createElement('img');
    img.className='print-img';
    img.src=c.toDataURL('image/png',1.0);
    img.style.width='100%';
    img.style.maxHeight='240px';
    img.style.objectFit='contain';
    c.parentElement.appendChild(img);
  });
  // Small delay to let images render, then print
  setTimeout(function(){window.print()},200);
}
<\/script>
</body>
</html>`;
}
