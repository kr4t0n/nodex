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

  //  Lupi  = 1  = 1
  //  rnd
  (()=>{
  const D=[['FREE',38],['STARTER',27],['PRO',22],['TEAM',16],['SCALE',11],['ENT',7]];
  obsReveal('rungs',s=>{
    const x0=i=>56+i*56,base=266,step=5.6,HW=14;
    D.forEach(([name,v],i)=>{
      const x=x0(i);
      for(let k=0;k<v;k++){
        const y=base-k*step,w=HW-1.5+rnd(k+1,i+2)*3;
        el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:INK,'stroke-width':1,
          opacity:.5+rnd(k+2,i+4)*.5,class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
        if(k%5===4)el(s,'circle',{cx:x+HW+4.5,cy:y,r:.8,fill:'#C6C5BF',
          class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
      }
      const topY=base-(v-1)*step;
      const num=txt(s,{x,y:topY-10,'font-size':11,'font-weight':800,fill:INK,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${.4+i*.08}s`},v);
      tip(num,`${name} — $${v}k MRR`);
      txt(s,{x,y:base+18,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
    });
    el(s,'line',{x1:28,y1:base+4,x2:372,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:.9s'},
      'ONE RUNG = $1K · DOT MARKS EVERY FIFTH');
  });
  })();
}
