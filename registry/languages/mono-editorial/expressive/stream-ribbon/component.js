export function mount(root) {
  const q = (name) => root.querySelector(`[data-nx-mount="${name}"]`);

  const timers = {};
  const keep = (name, t) => { (timers[name] = timers[name] || []).push(t); };
  const obsReveal = (name, fn) => {
    const node = q(name);
    if (!node) return;
    const go = () => {
      (timers[name] || []).forEach(clearInterval);
      timers[name] = [];
      node.innerHTML = '';
      fn(node);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { go(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(node);
    node.style.cursor = 'pointer';
    node.addEventListener('click', go);
  };

  // ── shared Mono tokens lupi-gallery  ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const NS='http://www.w3.org/2000/svg';

  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};

  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ── New chart-family helpers (scoped to the added templates) ──
  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

// ════ F16 · stream ribbon ════
  // Streamgraph / ThemeRiver
  // silhouette  = treemap
  (()=>{
  const N=48;
  const mk=(base,trend,w1,w2,seed)=>Array.from({length:N},(_,t)=>
    Math.max(2,base+trend*t+10*Math.sin(t/w1+seed)+5*Math.sin(t/w2+seed*2)+rnd(t+1,seed)*6));
  const SERIES=[
    ['LEGACY EDITOR',mk(46,-.62,9,3.7,2),'#C6C5BF'],
    ['BOARDS',mk(26,.10,11,4.2,5),'#8F8E88'],
    ['FLOWS',mk(12,.78,10,3.1,8),INK],
  ];
  obsReveal('stream',s=>{
    const X0=36,X1=744,CY=138,SC=1.15;
    const x=t=>X0+t/(N-1)*(X1-X0);
    const tot=Array.from({length:N},(_,t)=>SERIES.reduce((a,S)=>a+S[1][t],0));
    // stacked offsets, silhouette baseline: top of stack starts at -total/2
    const y0=Array.from({length:N},(_,t)=>CY-tot[t]*SC/2);
    const smooth=pts=>{
      let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let k=1;k<pts.length-1;k++){
        const p=pts[k],q=pts[k+1];
        d+=` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;
      }
      return d+` L${pts[pts.length-1][0].toFixed(1)} ${pts[pts.length-1][1].toFixed(1)}`;
    };
    let run=y0.slice();
    SERIES.forEach(([name,vals,shade],si)=>{
      const top=run.map((v,t)=>[x(t),v]);
      const bot=run.map((v,t)=>[x(t),v+vals[t]*SC]);
      run=bot.map(p=>p[1]);
      const d=smooth(top)+' L '+[...bot].reverse().map(p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')+' Z';
      const band=el(s,'path',{d,fill:shade,stroke:PAPER,'stroke-width':2,
        class:'fade',style:`animation-delay:${si*.16}s`});
      tip(band,`${name} — weekly active accounts, 48 weeks`);
      // label at the band's widest week — clamped off both ends so the
      // paper-colored text never spills past the band onto paper (invisible)
      let wk=4;vals.forEach((v,t)=>{if(t>=4&&t<=N-6&&v>vals[wk])wk=t});
      const midY=(top[wk][1]+bot[wk][1])/2;
      const dark=shade===INK||shade==='#4A4944';
      txt(s,{x:x(wk),y:midY+3,'font-size':9,'font-weight':800,'text-anchor':'middle',
        fill:dark?PAPER:'#4A4944','letter-spacing':'.06em',
        class:'fade',style:`animation-delay:${.5+si*.14}s`},name);
    });
    // month floor: barcode ticks + labels every 8 weeks
    const base=252;
    el(s,'line',{x1:X0-6,y1:base,x2:X1+6,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let t=0;t<N;t++)
      el(s,'line',{x1:x(t),y1:base,x2:x(t),y2:base-(t%8===0?7:4),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${t*.006}s`});
    ['JAN','MAR','MAY','JUL','SEP','NOV'].forEach((m,k)=>
      txt(s,{x:x(k*8),y:base+15,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.1em',class:'fade'},m));
    txt(s,{x:390,y:288,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'BAND WIDTH = WEEKLY ACTIVES · DARKEST = TODAY’S LEADER · THE RIVER IS THE TOTAL');
  });
  })();

})();
}
