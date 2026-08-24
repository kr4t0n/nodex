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

  // ── shared Mono tokens（与 lupi-gallery 同源） ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const NS='http://www.w3.org/2000/svg';

  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};

  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ B3 · hairline area ════
  // 面积图的 Lupi 化：填充不是色块，是一天一根发丝立到自己的峰值。
  // 面积由日子组成。顶边一根细线收轮廓，峰值日加点标数。
  (()=>{
  const N=45;
  const val=d=>34+26*Math.sin(d/7.2)+12*Math.sin(d/2.8)+rnd(d+1,3)*16;
  obsReveal('hairarea',s=>{
    const x=d=>28+d*7.75,base=262,map=v=>base-v*2.35;
    el(s,'line',{x1:22,y1:base,x2:378,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
    const vs=Array.from({length:N},(_,d)=>val(d));
    const peak=vs.indexOf(Math.max(...vs));
    vs.forEach((v,d)=>{
      el(s,'line',{x1:x(d),y1:base,x2:x(d),y2:map(v),
        stroke:d===peak?INK:'#8F8E88','stroke-width':d===peak?1.1:.55,
        opacity:d===peak?1:.5+rnd(d+1,7)*.45,
        class:'fade',style:`animation-delay:${d*.014}s`});
    });
    const pts=vs.map((v,d)=>`${x(d)} ${map(v)}`).join(' L ');
    el(s,'path',{d:'M'+pts,fill:'none',stroke:INK,'stroke-width':1.2,pathLength:1,
      class:'draw',style:'animation-delay:.4s;animation-duration:1.2s'});
    const pd=el(s,'circle',{cx:x(peak),cy:map(vs[peak]),r:4.2,fill:INK,
      class:'pop',style:'animation-delay:1.2s'});
    tip(pd,`Day ${peak+1} — ${Math.round(vs[peak])}k peak`);
    txt(s,{x:x(peak),y:map(vs[peak])-11,'font-size':9.5,'font-weight':800,fill:INK,'text-anchor':'middle',
      style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1.3s`,
      class:'fade'},Math.round(vs[peak])+'k');
    [[0,'MAY'],[22,'JUN'],[44,'JUL']].forEach(([d,m])=>
      txt(s,{x:x(d),y:base+18,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.1em',class:'fade'},m));
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.3s'},
      'ONE HAIRLINE = ONE DAY, FLOOR TO PEAK');
  });
  })();
}
