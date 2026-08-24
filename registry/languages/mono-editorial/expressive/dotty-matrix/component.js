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

  // ════ 2 · dotty matrix — isometric stacked dot planes ════
  // pitch 20/10, dot radius capped well under half-pitch, decks 64px apart:
  // each plane reads as its own quiet grid instead of a smudge
  (()=>{
  const SQUAD=['PLATFORM','GROWTH','MOBILE','INFRA'];
  const SHADE=['#C6C5BF','#A8A7A0','#6A6963',INK];
  const P=(c,r,k)=>[196+(c-r)*20,236+(c+r)*10-k*64];
  obsReveal('dotty',s=>{
    for(let k=0;k<4;k++){
      // plane slab: paper fill so upper decks occlude lower ones
      const cs=[P(-.8,-.8,k),P(5.8,-.8,k),P(5.8,5.8,k),P(-.8,5.8,k)];
      el(s,'path',{d:'M'+cs.map(p=>p.join(' ')).join(' L ')+' Z',
        fill:PAPER,'fill-opacity':.96,stroke:'#DEDDD6','stroke-width':.9,
        class:'fade',style:`animation-delay:${k*.16}s`});
      for(let r=0;r<6;r++)for(let c=0;c<6;c++){
        const load=rnd(k*37+r*6+c+1,k+2);
        const v=load<.3?0:Math.round(load*12);   // sparser: silence is part of the texture
        const [x,y]=P(c,r,k);
        if(!v){el(s,'circle',{cx:x,cy:y,r:.7,fill:'#D8D6CE',
          class:'pop',style:`animation-delay:${k*.16+(r*6+c)*.008}s`});continue}
        const dot=el(s,'circle',{cx:x,cy:y,r:1+Math.sqrt(v)*1.15,fill:SHADE[k],
          class:'pop',style:`animation-delay:${k*.16+(r*6+c)*.008}s`});
        tip(dot,`${SQUAD[k]} · week ${c+1} × lane ${r+1} — ${v} tasks`);
      }
      // label off the plane's right corner, tied by a short hairline
      const [cxr,cyr]=P(5.8,-.8,k);
      el(s,'line',{x1:cxr+4,y1:cyr,x2:cxr+22,y2:cyr,stroke:'#C6C5BF','stroke-width':.8,
        class:'fade',style:`animation-delay:${.2+k*.16}s`});
      txt(s,{x:cxr+27,y:cyr+2.5,'font-size':7.5,'font-weight':700,fill:k===3?INK:'#8F8E88',
        'letter-spacing':'.12em',class:'fade',style:`animation-delay:${.2+k*.16}s`},SQUAD[k]);
    }
  });
  })();
}
