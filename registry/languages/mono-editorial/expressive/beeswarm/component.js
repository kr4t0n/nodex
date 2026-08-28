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

  // ── New chart-family helpers (scoped to the added templates) ──
  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

// ════ L18 · beeswarm ════
  // violin  Lupi  120
  //  = enterprise  =
  (()=>{
  const N=120;
  const deals=Array.from({length:N},(_,i)=>{
    const u=rnd(i+1,3),ent=rnd(i+2,11)>.86;
    const v=Math.round(4+(ent?60:6)+150*Math.pow(u,2.6)+rnd(i+3,7)*10);
    return [Math.min(178,v),ent];
  });
  obsReveal('beeswarm',s=>{
    const X0=36,X1=376,BASE=246,R=4,GAP=R*2+.8;
    const mapX=v=>X0+v/180*(X1-X0);
    // axis rail + barcode ticks
    el(s,'line',{x1:X0-4,y1:BASE,x2:X1+4,y2:BASE,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let g=0;g<=9;g++){
      const x=X0+g/9*(X1-X0);
      el(s,'line',{x1:x,y1:BASE,x2:x,y2:BASE+(g%3===0?7:4),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${g*.02}s`});
      if(g%3===0)txt(s,{x,y:BASE+18,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'middle',
        class:'fade',style:`animation-delay:${g*.02}s`},'$'+Math.round(g/9*180)+'k');
    }
    // swarm as clean stacks: x snaps to a GAP-wide lane, dots pile upward —
    // the pile height IS the density. no half-overlaps, every dot countable.
    const lanes={};
    const sorted=deals.map((d,i)=>[d[0],d[1],i]).sort((a,b)=>a[0]-b[0]);
    sorted.forEach(([v,ent,i])=>{
      const lane=Math.round((mapX(v)-X0)/GAP);
      const x=X0+lane*GAP;
      const row=lanes[lane]||0;lanes[lane]=row+1;
      const y=BASE-R-1-row*GAP;
      const dot=ent
        ?el(s,'circle',{cx:x,cy:y,r:R,fill:PAPER,stroke:INK,'stroke-width':1.1,
          class:'pop',style:`animation-delay:${.1+i*.007}s`})
        :el(s,'circle',{cx:x,cy:y,r:R,fill:INK,opacity:.82,
          class:'pop',style:`animation-delay:${.1+i*.007}s`});
      tip(dot,`deal #${i+1} — $${v}k${ent?' · enterprise':''}`);
    });
    // median
    const vs=deals.map(d=>d[0]).sort((a,b)=>a-b);
    const med=vs[Math.floor(N/2)];
    const mx=mapX(med);
    el(s,'line',{x1:mx,y1:52,x2:mx,y2:BASE+8,stroke:'#8F8E88','stroke-width':.9,
      'stroke-dasharray':'2 4',class:'fade',style:'animation-delay:1s'});
    txt(s,{x:mx,y:44,'font-size':9.5,'font-weight':800,fill:INK,'text-anchor':'middle',
      style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1.1s`,
      class:'fade'},'MEDIAN $'+med+'k');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE DOT = ONE DEAL · THE PILE IS THE DISTRIBUTION · HOLLOW = ENTERPRISE');
  });
  })();

})();
}
