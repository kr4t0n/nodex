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

  // ════ B2 · hairline line ════
  // 折线图的 Lupi 化：barcode 的日历地板（每天一根发丝，无论有没有事）+
  // 发丝折线 + 逐日圆点（周末空心）。峰值两个点放大标数。
  (()=>{
  const N=30;
  const val=d=>46+22*Math.sin(d/4.6)+14*Math.sin(d/2.1)+rnd(d+1,5)*12;
  obsReveal('dayline',s=>{
    const x=d=>30+d*11.7,base=262,map=v=>base-v*2.15;
    // calendar floor
    for(let d=0;d<N;d++)
      el(s,'line',{x1:x(d),y1:base,x2:x(d),y2:base-7,stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${d*.008}s`});
    el(s,'line',{x1:24,y1:base,x2:376,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
    const vs=Array.from({length:N},(_,d)=>val(d));
    // top-2 peaks, apart
    const top=[];
    for(const d of [...vs.keys()].sort((a,b)=>vs[b]-vs[a])){
      if(top.every(t=>Math.abs(t-d)>=5))top.push(d);
      if(top.length===2)break;
    }
    // hairline path
    const pts=vs.map((v,d)=>`${x(d)} ${map(v)}`).join(' L ');
    el(s,'path',{d:'M'+pts,fill:'none',stroke:INK,'stroke-width':1,pathLength:1,
      class:'draw',style:'animation-duration:1.2s'});
    vs.forEach((v,d)=>{
      const weekend=d%7===5||d%7===6,big=top.includes(d);
      const dot=el(s,'circle',{cx:x(d),cy:map(v),r:big?4.2:2.1,
        fill:weekend?PAPER:INK,stroke:INK,'stroke-width':weekend?1:0,
        class:'pop',style:`animation-delay:${.2+d*.03}s`});
      tip(dot,`Day ${d+1} — ${Math.round(v)} sign-ups`);
      if(big)txt(s,{x:x(d),y:map(v)-11,'font-size':9.5,'font-weight':800,fill:INK,'text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${1+d*.01}s`,
        class:'fade'},Math.round(v));
    });
    [[0,'JUN 1'],[14,'JUN 15'],[29,'JUN 30']].forEach(([d,m])=>
      txt(s,{x:x(d),y:base+18,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.1em',class:'fade'},m));
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'ONE DOT = ONE DAY · HOLLOW = WEEKEND');
  });
  })();
}
