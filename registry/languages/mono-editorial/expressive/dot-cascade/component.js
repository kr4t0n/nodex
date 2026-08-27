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

  // ════ 4 · dot cascade ════
  (()=>{
  const CAUSE=['DNS','CDN','QUOTA','DISK','CERT','CACHE','QUEUE','LOCK','OOM','NET','3P API','CONFIG','DB','DEPLOY','CODE','HUMAN'];
  const COUNT=[1,1,2,3,3,4,5,6,7,9,11,13,15,18,22,27];
  obsReveal('cascade',s=>{
    const x=i=>34+i*22.2, base=i=>272-i*7.5;
    // dotted diagonal baseline
    el(s,'line',{x1:x(0)-8,y1:base(0)+4,x2:x(15)+8,y2:base(15)+4,
      stroke:GRID,'stroke-width':1,'stroke-dasharray':'2 4',class:'fade'});
    CAUSE.forEach((name,i)=>{
      const n=Math.ceil(COUNT[i]/2),bx=x(i),by=base(i);
      for(let k=0;k<n-1;k++)
        el(s,'circle',{cx:bx,cy:by-12-k*8.8,r:2.2,fill:'#B0AFA9',opacity:.9,
          class:'pop',style:`animation-delay:${i*.05+k*.03}s`});
      const topY=by-12-(n-1)*8.8;
      const top=el(s,'circle',{cx:bx,cy:topY,r:4.6,fill:INK,
        class:'pop',style:`animation-delay:${i*.05+n*.03}s`});
      tip(top,`${name} — ${COUNT[i]} incidents`);
      txt(s,{x:bx,y:topY-10,'font-size':9,'font-weight':700,fill:INK,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${.2+i*.05}s`},COUNT[i]);
      txt(s,{x:bx,y:by+12,'font-size':6.5,'font-weight':600,fill:'#6A6963','text-anchor':'end',
        transform:`rotate(-90 ${bx} ${by+12})`,
        class:'fade',style:`animation-delay:${.1+i*.05}s`},name);
    });
  });
  })();
}
