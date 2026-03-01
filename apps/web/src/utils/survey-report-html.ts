/**
 * Builds a standalone HTML report for AI survey analysis.
 * Shows charts per question + AI analysis sections + key findings.
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

export function buildSurveyReportHTML(data: any): string {
  const survey = data.survey || {};
  const election = data.election || {};
  const analysis = data.analysis || {};
  const chartData: any[] = data.chartData || [];
  const generatedAt = data.generatedAt || new Date().toISOString();

  const title = `Survey Analysis — ${esc(survey.title || 'Survey')}`;
  const subtitle = [election.constituency, election.state].filter(Boolean).join(', ');

  // Build chart canvases — one per question
  const chartBlocks = chartData.map((q: any, idx: number) => {
    const canvasId = `ch-q${idx}`;
    if (q.type === 'text') {
      // Word cloud style — show as tag list instead of chart
      const words = q.topWords || [];
      const tags = words.map((w: string, i: number) => {
        const size = Math.max(0.7, 1.2 - i * 0.05);
        return `<span class="tag" style="font-size:${size}rem">${esc(w)}</span>`;
      }).join(' ');
      return `<div class="cc">
        <div class="ct">Q${idx + 1}: ${esc(q.question)}</div>
        <div class="qmeta">Text responses &middot; ${q.totalAnswered} answered</div>
        <div class="tags">${tags || '<span class="qmeta">No text responses</span>'}</div>
      </div>`;
    }
    const meta = q.type === 'scale'
      ? `Average: ${q.average}/5 &middot; ${q.totalAnswered} answered`
      : `${q.totalAnswered} answered`;
    return `<div class="cc">
      <div class="ct">Q${idx + 1}: ${esc(q.question)}</div>
      <div class="qmeta">${meta}</div>
      <canvas id="${canvasId}"></canvas>
    </div>`;
  }).join('');

  // Key findings
  const findings = (analysis.keyFindings || []).map((f: string) =>
    `<li>${esc(f)}</li>`
  ).join('');

  // Risk areas
  const risks = (analysis.riskAreas || []).map((r: any) => {
    const sevColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
    return `<tr>
      <td><span class="sev" style="background:${sevColor[r.severity] || '#94a3b8'}">${esc(r.severity)}</span></td>
      <td>${esc(r.risk)}</td>
      <td>${esc(r.action)}</td>
    </tr>`;
  }).join('');

  // Recommendations
  const recs = (analysis.recommendations || []).map((r: string, i: number) =>
    `<div class="rec"><span class="rn">${i + 1}</span>${esc(r)}</div>`
  ).join('');

  // AI sections
  const sectionBlocks = (analysis.sections || []).map((s: any) => `
    <div class="section">
      <div class="sh">
        <h2>${esc(s.title || '')}</h2>
        ${priorityBadge(s.priority)}
      </div>
      <div class="sb">
        <div class="nar">${renderMarkdown(s.content)}</div>
      </div>
    </div>`
  ).join('');

  const chartDataJSON = JSON.stringify(chartData);

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

.hdr{background:linear-gradient(135deg,#0f172a,#1e3a5f 50%,#7c3aed);color:#fff;padding:2.5rem 2rem 2rem}
.hdr h1{font-size:1.5rem;font-weight:700}
.hdr .sub{opacity:.8;font-size:.88rem;margin-top:.2rem}
.hdr .meta{margin-top:.8rem;display:flex;gap:1.5rem;font-size:.76rem;opacity:.7;flex-wrap:wrap}

.tbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:.55rem 2rem;display:flex;justify-content:flex-end;gap:.5rem;position:sticky;top:0;z-index:10}
.tbar button{padding:.35rem .9rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:.78rem;color:#475569;transition:all .15s}
.tbar button:hover{background:#f1f5f9;border-color:#94a3b8}

.wrap{max-width:1200px;margin:0 auto;padding:1.5rem 2rem 3rem}

/* Summary card */
.sum{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.25rem;border-left:4px solid #7c3aed}
.sum h3{font-size:.9rem;font-weight:700;color:#7c3aed;margin-bottom:.5rem}
.sum p{font-size:.85rem;color:#475569}

/* Metrics */
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:2rem}
.mc{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem .75rem;text-align:center;position:relative;overflow:hidden}
.mc::after{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.mc:nth-child(1)::after{background:#7c3aed}
.mc:nth-child(2)::after{background:#10b981}
.mc:nth-child(3)::after{background:#f59e0b}
.mc:nth-child(4)::after{background:#2563eb}
.mc .v{font-size:1.5rem;font-weight:800;color:#0f172a}
.mc .l{font-size:.68rem;color:#64748b;margin-top:.15rem;text-transform:uppercase;letter-spacing:.04em}

/* Chart section */
.csec{margin-bottom:1.5rem}
.csec h2{font-size:1.1rem;font-weight:700;color:#0f172a;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid #e2e8f0}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}

.cc{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:.85rem 1rem;display:flex;flex-direction:column}
.ct{font-size:.75rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.03em;margin-bottom:.25rem;padding-bottom:.35rem;border-bottom:2px solid #e2e8f0}
.qmeta{font-size:.7rem;color:#94a3b8;margin-bottom:.5rem}
.cc canvas{width:100%!important;flex:1;max-height:260px}
.cc .print-img{display:none}

/* Tags for text questions */
.tags{display:flex;flex-wrap:wrap;gap:.4rem;padding:.5rem 0}
.tag{background:#ede9fe;color:#6d28d9;padding:.2rem .6rem;border-radius:99px;font-weight:600}

/* Sections */
.section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:1.25rem;overflow:hidden}
.sh{display:flex;justify-content:space-between;align-items:center;padding:.8rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.sh h2{font-size:1.05rem;font-weight:700;color:#0f172a}
.badge{font-size:.6rem;padding:3px 10px;border-radius:99px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.sb{padding:1.25rem 1.5rem}

.nar{font-size:.85rem;color:#475569}
.nar h2{font-size:.9rem;font-weight:700;margin:.75rem 0 .3rem;color:#0f172a}
.nar h3{font-size:.85rem;font-weight:600;margin:.6rem 0 .25rem;color:#334155}
.nar strong{font-weight:600;color:#1e293b}
.nar ul,.nar ol{padding-left:1.25rem;margin:.3rem 0}
.nar li{margin-bottom:.2rem}

/* Key findings */
.kf{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.25rem}
.kf h3{font-size:.95rem;font-weight:700;color:#0f172a;margin-bottom:.75rem}
.kf ol{padding-left:1.25rem}
.kf li{font-size:.85rem;color:#475569;margin-bottom:.4rem;line-height:1.5}

/* Risk table */
.rtab{width:100%;border-collapse:collapse;font-size:.82rem;margin-top:.5rem}
.rtab th{text-align:left;padding:.5rem .75rem;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-weight:700;color:#475569;font-size:.72rem;text-transform:uppercase;letter-spacing:.03em}
.rtab td{padding:.6rem .75rem;border-bottom:1px solid #f1f5f9;color:#475569}
.sev{color:#fff;padding:2px 8px;border-radius:99px;font-size:.65rem;font-weight:700;text-transform:uppercase}

/* Recommendations */
.recs{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.5rem}
.rec{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.75rem 1rem;font-size:.82rem;color:#166534;display:flex;align-items:flex-start;gap:.6rem}
.rn{background:#16a34a;color:#fff;border-radius:50%;width:22px;height:22px;min-width:22px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700}

.footer{text-align:center;color:#94a3b8;font-size:.72rem;padding:2rem 0 1rem}

@media print{
  @page{size:A3 portrait;margin:10mm}
  body{background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  .tbar{display:none}
  .hdr{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .wrap{max-width:100%;padding:0}
  .metrics{grid-template-columns:repeat(4,1fr)}
  .cgrid{grid-template-columns:1fr 1fr}
  .recs{grid-template-columns:1fr 1fr}
  .mc{-webkit-print-color-adjust:exact!important}
  .mc::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .section{page-break-inside:auto}
  .sh{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .badge{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .cc{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .cc canvas{display:none!important}
  .cc .print-img{display:block!important;width:100%;max-height:260px;object-fit:contain}
  .tag{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .sev{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .rec{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .rn{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .footer{page-break-before:auto}
}
@media(max-width:900px){
  .cgrid{grid-template-columns:1fr}
  .recs{grid-template-columns:1fr}
}
@media(max-width:768px){
  .hdr{padding:1.5rem 1rem}
  .wrap{padding:1rem}
  .metrics{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>

<div class="hdr">
  <h1>${esc(title)}</h1>
  <div class="sub">${esc(subtitle)}</div>
  <div class="meta">
    <span>Election: ${esc(election.name || '')}</span>
    <span>Type: ${esc(election.type || '')}</span>
    <span>Responses: ${survey.totalResponses || 0}</span>
    <span>Period: ${esc(survey.dateRange || '')}</span>
    <span>Generated: ${new Date(generatedAt).toLocaleString('en-IN')}</span>
  </div>
</div>

<div class="tbar">
  <button onclick="printReport()">&#128424; Save as PDF</button>
</div>

<div class="wrap">

  <div class="metrics">
    <div class="mc"><div class="v">${survey.totalResponses || 0}</div><div class="l">Total Responses</div></div>
    <div class="mc"><div class="v">${chartData.length}</div><div class="l">Questions</div></div>
    <div class="mc"><div class="v">${esc(survey.dateRange || 'N/A')}</div><div class="l">Collection Period</div></div>
    <div class="mc"><div class="v">${esc(election.name || 'N/A')}</div><div class="l">Election</div></div>
  </div>

  ${analysis.summary ? `<div class="sum"><h3>Executive Summary</h3><p>${esc(analysis.summary)}</p></div>` : ''}

  <div class="csec">
    <h2>Response Analysis by Question</h2>
    <div class="cgrid">
      ${chartBlocks}
    </div>
  </div>

  ${findings ? `
  <div class="kf">
    <h3>Key Findings</h3>
    <ol>${findings}</ol>
  </div>` : ''}

  ${sectionBlocks}

  ${risks ? `
  <div class="section">
    <div class="sh"><h2>Risk Assessment</h2>${priorityBadge('high')}</div>
    <div class="sb">
      <table class="rtab">
        <thead><tr><th>Severity</th><th>Risk</th><th>Mitigation</th></tr></thead>
        <tbody>${risks}</tbody>
      </table>
    </div>
  </div>` : ''}

  ${recs ? `
  <div class="section">
    <div class="sh"><h2>Strategic Recommendations</h2>${priorityBadge('critical')}</div>
    <div class="sb">
      <div class="recs">${recs}</div>
    </div>
  </div>` : ''}

  <div class="footer">Powered by CaffeAI Survey Analytics &middot; Generated on ${new Date(generatedAt).toLocaleString('en-IN')}</div>
</div>

<script>
(function(){
  var CD = ${chartDataJSON};
  var PAL = ['#7c3aed','#2563eb','#f59e0b','#ef4444','#10b981','#f97316','#06b6d4','#ec4899','#84cc16','#6366f1','#14b8a6','#a855f7'];

  function mk(id,cfg){var e=document.getElementById(id);if(!e)return;new Chart(e,cfg)}
  function pctTip(ctx){
    var t=ctx.dataset.data.reduce(function(a,b){return a+b},0);
    var p=t>0?((ctx.raw/t)*100).toFixed(1):0;
    return ctx.label+': '+ctx.raw+' ('+p+'%)';
  }
  var tip={callbacks:{label:pctTip}};
  var leg={position:'bottom',labels:{padding:10,usePointStyle:true,pointStyleWidth:10,font:{size:10}}};

  CD.forEach(function(q,idx){
    var canvasId='ch-q'+idx;
    if(q.type==='text') return; // text questions have no chart

    var dist=q.distribution||{};
    var labels=Object.keys(dist);
    var values=Object.values(dist);

    if(q.type==='scale'||q.type==='rating'){
      // Bar chart for scale distribution
      var sLabels=labels.map(function(l){return l+'\\u2605'});
      var sColors=labels.map(function(l){
        var n=parseInt(l);
        if(n<=2) return '#ef4444';
        if(n===3) return '#f59e0b';
        return '#10b981';
      });
      mk(canvasId,{type:'bar',
        data:{labels:sLabels,datasets:[{label:'Responses',data:values,backgroundColor:sColors.map(function(c){return c+'99'}),borderColor:sColors,borderWidth:2,borderRadius:6,barPercentage:.6}]},
        options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.raw+' responses'}}}},
          scales:{y:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{font:{size:10}}},x:{grid:{display:false},ticks:{font:{size:11,weight:'600'}}}}}
      });
    } else if(q.type==='yes_no'){
      // Doughnut for yes/no
      mk(canvasId,{type:'doughnut',
        data:{labels:labels,datasets:[{data:values,backgroundColor:['#10b981','#ef4444'],borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
        options:{responsive:true,maintainAspectRatio:true,cutout:'55%',plugins:{legend:leg,tooltip:tip}}
      });
    } else {
      // Horizontal bar for radio/checkbox/ranking
      var colors=labels.map(function(_,i){return PAL[i%PAL.length]});
      if(labels.length<=5){
        mk(canvasId,{type:'doughnut',
          data:{labels:labels,datasets:[{data:values,backgroundColor:colors,borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
          options:{responsive:true,maintainAspectRatio:true,cutout:'50%',plugins:{legend:leg,tooltip:tip}}
        });
      } else {
        mk(canvasId,{type:'bar',
          data:{labels:labels,datasets:[{label:'Responses',data:values,backgroundColor:colors.map(function(c){return c+'88'}),borderColor:colors,borderWidth:2,borderRadius:4,barPercentage:.7}]},
          options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.raw+' responses'}}}},
            scales:{x:{beginAtZero:true,grid:{color:'#f1f5f9'},ticks:{font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}
        });
      }
    }
  });

  // Print helper — convert canvas to images
  window.printReport=function(){
    var canvases=document.querySelectorAll('.cc canvas');
    canvases.forEach(function(c){
      var existing=c.parentElement.querySelector('.print-img');
      if(existing) existing.remove();
      var img=document.createElement('img');
      img.className='print-img';
      img.src=c.toDataURL('image/png',1.0);
      img.style.width='100%';
      img.style.maxHeight='260px';
      img.style.objectFit='contain';
      c.parentElement.appendChild(img);
    });
    setTimeout(function(){window.print()},200);
  };
})();
<\/script>
</body>
</html>`;
}
