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

  const D2R=Math.PI/180;

  const pol=(cx,cy,r,deg)=>[cx+r*Math.cos(deg*D2R),cy+r*Math.sin(deg*D2R)];

  // ════ C7 · tick gauge ════
  // ballot tick  210° 1 tick = 1%  73
  //  25/50/75/100  +  +
  (()=>{
  const GOAL=73;
  obsReveal('gauge',s=>{
    const cx=200,cy=190,R0=104,A0=-195,SW=210; // -195° → +15°
    for(let k=0;k<100;k++){
      const a=A0+k/100*SW,inked=k<GOAL;
      const len=inked?13+rnd(k+1,3)*6:5+rnd(k+1,7)*2.5;
      const [x1,y1]=pol(cx,cy,R0,a),[x2,y2]=pol(cx,cy,R0+len,a);
      el(s,'line',{x1,y1,x2,y2,stroke:inked?INK:'#CFCEC7','stroke-width':inked?1:.6,
        class:'fade',style:`animation-delay:${k*.012}s`});
    }
    [25,50,75,100].forEach(m=>{
      const a=A0+m/100*SW,[dx,dy]=pol(cx,cy,R0-7,a),[tx2,ty2]=pol(cx,cy,R0-19,a);
      el(s,'circle',{cx:dx,cy:dy,r:1,fill:'#B0AFA9',class:'fade',style:'animation-delay:.8s'});
      txt(s,{x:tx2,y:ty2+3,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'middle',
        class:'fade',style:'animation-delay:.85s'},m);
    });
    // inked tip bead
    const aT=A0+GOAL/100*SW,[ex,ey]=pol(cx,cy,R0+20,aT);
    el(s,'circle',{cx:ex,cy:ey,r:2.4,fill:INK,class:'pop',style:'animation-delay:1.1s'});
    const num=txt(s,{x:cx,y:cy-4,'font-size':34,'font-weight':800,fill:INK,'text-anchor':'middle',
      class:'fade',style:'animation-delay:1s'},GOAL+'%');
    tip(num,`$730k of the $1M quarter target`);
    txt(s,{x:cx,y:cy+16,'font-size':8,'font-weight':600,fill:MUTED,'text-anchor':'middle',
      'letter-spacing':'.1em',class:'fade',style:'animation-delay:1.05s'},'27 TICKS TO GO');
    txt(s,{x:200,y:300,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE TICK = 1% OF TARGET · INKED = EARNED');
  });
  })();
}
