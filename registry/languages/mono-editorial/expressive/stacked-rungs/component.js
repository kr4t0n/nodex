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

  // ════ C3 · stacked rungs ════
  (()=>{
  const D=[['NA',[18,11,7]],['EU',[14,9,5]],['APAC',[9,7,6]],['LATAM',[5,4,2]]];
  const SHADE=[INK,'#8F8E88','#C0BFB8'];
  const SEG=['CORE','ADD-ONS','SERVICES'];
  obsReveal('stackrungs',s=>{
    const x0=i=>72+i*76,base=262,step=5.2,HW=13;
    D.forEach(([name,segs],i)=>{
      const x=x0(i);let k0=0;
      segs.forEach((v,si)=>{
        for(let k=0;k<v;k++){
          const y=base-(k0+k+si)*step,w=HW-1.4+rnd(k+1,i*3+si+2)*2.8;
          el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:SHADE[si],'stroke-width':1,
            opacity:.6+rnd(k+2,i+si+4)*.4,class:'fade',
            style:`animation-delay:${i*.09+(k0+k)*.012}s`});
        }
        const midY=base-(k0+v/2+si)*step;
        const lab=txt(s,{x:x+HW+7,y:midY+2.5,'font-size':8,'font-weight':800,fill:SHADE[si]===`#C0BFB8`?'#8F8E88':SHADE[si],
          class:'fade',style:`animation-delay:${.5+i*.09+si*.06}s`},v);
        tip(lab,`${name} ${SEG[si]} — $${v}k`);
        k0+=v;
      });
      const total=segs[0]+segs[1]+segs[2];
      txt(s,{x,y:base-(k0+2)*step-8,'font-size':10.5,'font-weight':800,fill:INK,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${.6+i*.09}s`},total);
      txt(s,{x,y:base+18,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.09}s`},name);
    });
    el(s,'line',{x1:36,y1:base+4,x2:364,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'DARKEST = CORE · MID = ADD-ONS · PALE = SERVICES · ONE RUNG = $1K');
  });
  })();
}
