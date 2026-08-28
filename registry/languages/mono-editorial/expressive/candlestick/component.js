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

// ════ F17 · candlestick ════
  // K  Mono —— = =
  //  hollow/ink
  // OHLC /30
  (()=>{
  const N=30;
  // deterministic random walk with a dip-and-recover arc
  const DAYS=[];
  let px=52;
  for(let d=0;d<N;d++){
    const drift=d<10?.4:d<18?-1.5:1.3;
    const open=px;
    const close=Math.max(30,open+drift+(rnd(d+1,3)-.5)*4.6);
    const hi=Math.max(open,close)+rnd(d+2,7)*2.6;
    const lo=Math.min(open,close)-rnd(d+3,11)*2.6;
    DAYS.push([open,close,hi,lo]);
    px=close;
  }
  obsReveal('candle',s=>{
    const X0=40,PW=11.2,BASE=258,TOP=44;
    const vmin=Math.min(...DAYS.map(d=>d[3])),vmax=Math.max(...DAYS.map(d=>d[2]));
    const mapY=v=>BASE-(v-vmin)/(vmax-vmin)*(BASE-TOP);
    const x=d=>X0+d*PW+PW/2;
    // price grid
    for(let g=0;g<=4;g++){
      const v=vmin+g/4*(vmax-vmin);
      el(s,'line',{x1:X0-4,y1:mapY(v),x2:X0+N*PW+4,y2:mapY(v),stroke:'#E3E2DB','stroke-width':.8,
        class:'fade',style:`animation-delay:${g*.03}s`});
      txt(s,{x:X0-8,y:mapY(v)+3,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'end',
        class:'fade',style:`animation-delay:${g*.03}s`},'$'+Math.round(v));
    }
    let hiD=0,loD=0;
    DAYS.forEach(([o,c,h,l],d)=>{
      if(h>DAYS[hiD][2])hiD=d;
      if(l<DAYS[loD][3])loD=d;
    });
    DAYS.forEach(([o,c,h,l],d)=>{
      const cx=x(d),up=c>=o;
      const yT=mapY(Math.max(o,c)),yB=mapY(Math.min(o,c));
      // wick: one hairline, full reach
      el(s,'line',{x1:cx,y1:mapY(h),x2:cx,y2:mapY(l),stroke:'#6A6963','stroke-width':.7,
        class:'fade',style:`animation-delay:${d*.03}s`});
      // body: capsule; hollow = up, ink = down
      const body=el(s,'rect',{x:cx-3.4,y:yT,width:6.8,height:Math.max(2.5,yB-yT),rx:3,
        ...(up?{fill:PAPER,stroke:INK,'stroke-width':1.1}:{fill:INK}),
        class:'fade',style:`animation-delay:${.05+d*.03}s`});
      tip(body,`Day ${d+1} — open $${o.toFixed(1)} · close $${c.toFixed(1)} · high $${h.toFixed(1)} · low $${l.toFixed(1)}`);
      // extremes, labeled with hairline flags
      if(d===hiD)txt(s,{x:cx,y:mapY(h)-7,'font-size':8,'font-weight':800,fill:INK,'text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
        class:'fade'},'$'+Math.round(h));
      if(d===loD)txt(s,{x:cx,y:mapY(l)+14,'font-size':8,'font-weight':800,fill:'#6A6963','text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
        class:'fade'},'$'+Math.round(l));
    });
    // week ticks on the floor
    el(s,'line',{x1:X0-4,y1:BASE+8,x2:X0+N*PW+4,y2:BASE+8,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let d=0;d<N;d++)
      el(s,'line',{x1:x(d),y1:BASE+8,x2:x(d),y2:BASE+8-(d%5===0?6:3),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${d*.008}s`});
    ['W1','W2','W3','W4','W5','W6'].forEach((w,k)=>
      txt(s,{x:x(k*5),y:BASE+21,'font-size':7,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade'},w));
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'INK BODY = CLOSED DOWN · HOLLOW = CLOSED UP · WICK = THE DAY’S FULL REACH');
  });
  })();
  })();
}
