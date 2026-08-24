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

  // ── shared Mono tokens ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const NS='http://www.w3.org/2000/svg';

  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};

  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ 2 · barcode lollipop ════
  (()=>{
  const N=90;
  const val=d=>95+55*Math.sin(d/9.5)+30*Math.sin(d/3.7)+rnd(d+1,5)*40;
  obsReveal('barcode',s=>{
    // the barcode: one hairline per day, full height
    for(let d=0;d<N;d++){
      const x=18+d*8.53;
      el(s,'line',{x1:x,y1:8,x2:x,y2:258,stroke:GRID,'stroke-width':.7,
        class:'fade',style:`animation-delay:${d*.004}s`});
    }
    const vs=Array.from({length:N},(_,d)=>val(d));
    // top-3 peaks, kept at least 6 days apart so labels never collide
    const top3=[];
    for(const d of [...vs.keys()].sort((a,b)=>vs[b]-vs[a])){
      if(top3.every(t=>Math.abs(t-d)>=6))top3.push(d);
      if(top3.length===3)break;
    }
    for(let d=0;d<N;d++){
      const x=18+d*8.53,v=vs[d],y=252-v*.75;
      const weekend=d%7===5||d%7===6;
      const stemEnd=Math.min(256,y+14+rnd(d+1,9)*26);
      el(s,'line',{x1:x,y1:y,x2:x,y2:stemEnd,stroke:INK,'stroke-width':1.1,
        class:'fade',style:`animation-delay:${.3+d*.008}s`});
      const big=top3.includes(d);
      const dot=el(s,'circle',{cx:x,cy:y,r:big?4.6:2.7,
        fill:weekend?PAPER:INK,stroke:INK,'stroke-width':weekend?1.2:0,
        class:'pop',style:`animation-delay:${.3+d*.008}s`});
      tip(dot,`Day ${d+1} — ${Math.round(v)}k peak`);
      if(big)txt(s,{x,y:y-10,'font-size':9,'font-weight':800,fill:INK,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${.9+d*.004}s`},Math.round(v)+'k');
    }
    [[0,'APR'],[30,'MAY'],[61,'JUN']].forEach(([d,m])=>
      txt(s,{x:18+d*8.53,y:276,'font-size':8,'font-weight':600,fill:MUTED,
        'letter-spacing':'.12em',class:'fade'},m));
  });
  })();
}
