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

  (()=>{
  const D=[['FREE',31,38],['STARTER',22,27],['PRO',16,22],['TEAM',13,16],['ENT',6,9]];
  obsReveal('pairrungs',s=>{
    const x0=i=>64+i*66,base=258,step=5.4,HW=10;
    D.forEach(([name,was,now],i)=>{
      const xa=x0(i)-13,xb=x0(i)+13;
      for(let k=0;k<was;k++){
        const y=base-k*step,w=HW-1.2+rnd(k+1,i+2)*2.4;
        el(s,'line',{x1:xa-w,y1:y,x2:xa+w,y2:y,stroke:'#B0AFA9','stroke-width':1,
          opacity:.5+rnd(k+2,i+3)*.4,class:'fade',style:`animation-delay:${i*.08+k*.01}s`});
      }
      for(let k=0;k<now;k++){
        const y=base-k*step,w=HW-1.2+rnd(k+1,i+7)*2.4;
        el(s,'line',{x1:xb-w,y1:y,x2:xb+w,y2:y,stroke:INK,'stroke-width':1,
          opacity:.6+rnd(k+2,i+8)*.4,class:'fade',style:`animation-delay:${.15+i*.08+k*.01}s`});
      }
      const topB=base-(now-1)*step;
      const num=txt(s,{x:xb,y:topB-9,'font-size':10.5,'font-weight':800,fill:INK,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${.5+i*.08}s`},now);
      tip(num,`${name} — $${was}k → $${now}k`);
      txt(s,{x:xa,y:base-(was-1)*step-9,'font-size':8.5,'font-weight':700,fill:'#B0AFA9','text-anchor':'middle',
        class:'fade',style:`animation-delay:${.5+i*.08}s`},was);
      txt(s,{x:x0(i),y:base+18,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
    });
    el(s,'line',{x1:30,y1:base+4,x2:370,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
      'FAINT = 2025 · INK = 2026 · ONE RUNG = $1K');
  });
  })();
}
