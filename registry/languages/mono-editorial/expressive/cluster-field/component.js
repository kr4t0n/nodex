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

  // deterministic
  const D2R=Math.PI/180;

  const pol=(cx,cy,r,deg)=>[cx+r*Math.cos(deg*D2R),cy+r*Math.sin(deg*D2R)];

  (()=>{
  const SAT=[[622,78,'PLUGINS',22],[706,214,'THEMES',16],[540,268,'DOCS',13],[92,72,'FORKS',12],[774,58,'MIRRORS',9]];
  obsReveal('clusters',s=>{
    const HX=300,HY=172;
    // dotted cross-contribution paths, hub → each island
    SAT.forEach(([x,y],ci)=>{
      const mx=(HX+x)/2,my=(HY+y)/2-30;
      el(s,'path',{d:`M${HX} ${HY} Q${mx} ${my} ${x} ${y}`,fill:'none',
        stroke:GRID,'stroke-width':.9,'stroke-dasharray':'2 4',pathLength:1,
        class:'draw',style:`animation-delay:${.8+ci*.12}s;animation-duration:.7s`});
    });
    // main hub: 80 golden-angle spokes
    for(let i=0;i<80;i++){
      const a=i*137.508,len=28+rnd(i+1,7)*88;
      const [x,y]=pol(HX,HY,len,a);
      el(s,'line',{x1:HX,y1:HY,x2:x,y2:y,stroke:'#C6C5BF','stroke-width':.6,pathLength:1,
        class:'draw',style:`animation-delay:${i*.012}s;animation-duration:.5s`});
      const dot=el(s,'circle',{cx:x,cy:y,r:1.6+rnd(i+1,4)*1.8,fill:INK,opacity:.85,
        class:'pop',style:`animation-delay:${.15+i*.012}s`});
      tip(dot,`core contributor #${i+1}`);
    }
    el(s,'circle',{cx:HX,cy:HY,r:6.5,fill:INK,class:'pop'});
    txt(s,{x:HX,y:HY+140,'font-size':8,'font-weight':800,fill:INK,'text-anchor':'middle',
      'letter-spacing':'.1em',style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px`,
      class:'fade'},'CORE · 80');
    // satellite islands
    SAT.forEach(([x,y,name,n],ci)=>{
      el(s,'circle',{cx:x,cy:y,r:3.5,fill:'#4A4944',
        class:'pop',style:`animation-delay:${.9+ci*.12}s`});
      for(let k=0;k<n;k++){
        const a=k*137.508+ci*40,rr=9+rnd(k+1,ci+2)*26;
        const [dx,dy]=pol(x,y,rr,a);
        if(k%2===0)el(s,'line',{x1:x,y1:y,x2:dx,y2:dy,stroke:'#D8D6CE','stroke-width':.5,
          class:'fade',style:`animation-delay:${1+ci*.12+k*.02}s`});
        el(s,'circle',{cx:dx,cy:dy,r:1.4+rnd(k+3,ci+5)*1.4,fill:'#6A6963',
          class:'pop',style:`animation-delay:${1+ci*.12+k*.02}s`});
      }
      txt(s,{x,y:y+44,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.12em',style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px`,
        class:'fade'},`${name} · ${n}`);
    });
  });
  })();
}
