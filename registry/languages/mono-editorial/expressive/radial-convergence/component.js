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

  // ════ 5 · radial convergence ════
  (()=>{
  const N=48,CX=200,CY=162,R=116;
  const THEME=[['PERF',15,-75],['INTEGRATIONS',10,-3],['PRICING',9,69],['MOBILE',8,141],['UX',6,213]];
  obsReveal('converge',s=>{
    // hub assignment: contiguous blocks with a little organic leakage
    const blocks=THEME.flatMap(([,n],h)=>Array(n).fill(h));
    const hubOf=i=>rnd(i+1,11)>.92?(blocks[i]+2)%5:blocks[i];
    const hubPt=h=>pol(CX,CY,34,THEME[h][2]);
    const counts=[0,0,0,0,0];
    for(let i=0;i<N;i++)counts[hubOf(i)]++;
    for(let i=0;i<N;i++){
      const deg=i/N*360-90,[px,py]=pol(CX,CY,R,deg);
      const h=hubOf(i),[hx,hy]=hubPt(h);
      const c1x=CX+(px-CX)*.42,c1y=CY+(py-CY)*.42;
      const c2x=CX+(hx-CX)*.3,c2y=CY+(hy-CY)*.3;
      el(s,'path',{d:`M${px} ${py} C${c1x} ${c1y} ${c2x} ${c2y} ${hx} ${hy}`,
        fill:'none',stroke:'#A8A7A0','stroke-width':.7,opacity:.55,pathLength:1,
        class:'draw',style:`animation-delay:${i*.018}s`});
      el(s,'circle',{cx:px,cy:py,r:1.6,fill:'#6A6963',
        class:'pop',style:`animation-delay:${i*.018}s`});
      // tiny rim code, flipped on the left half so it stays readable
      const flip=deg>90&&deg<270,[lx,ly]=pol(CX,CY,R+7,deg);
      txt(s,{x:lx,y:ly,'font-size':5.5,fill:MUTED,
        'text-anchor':flip?'end':'start','dominant-baseline':'middle',
        transform:`rotate(${flip?deg+180:deg} ${lx} ${ly})`,
        class:'fade',style:`animation-delay:${.2+i*.01}s`},'R-'+String(i+1).padStart(2,'0'));
    }
    THEME.forEach(([name,,deg],h)=>{
      const [hx,hy]=hubPt(h);
      const hub=el(s,'circle',{cx:hx,cy:hy,r:Math.sqrt(counts[h])*1.55,fill:INK,
        class:'pop',style:`animation-delay:${.5+h*.08}s`});
      tip(hub,`${name} — ${counts[h]} requests`);
      // theme label parked outside the rim, past the code ring
      const [tx,ty]=pol(CX,CY,R+34,deg);
      txt(s,{x:tx,y:ty,'font-size':8,'font-weight':800,fill:INK,'text-anchor':'middle',
        'dominant-baseline':'middle','letter-spacing':'.08em',
        style:`animation-delay:${.6+h*.08}s`,
        class:'fade'},`${name} · ${counts[h]}`);
      // hairline tying the label to its hub, skimming past the rim
      const [gx,gy]=pol(CX,CY,R+22,deg);
      el(s,'line',{x1:hx,y1:hy,x2:gx,y2:gy,stroke:'#C6C5BF','stroke-width':.7,
        'stroke-dasharray':'1 3',class:'fade',style:`animation-delay:${.7+h*.08}s`});
    });
  });
  })();
}
