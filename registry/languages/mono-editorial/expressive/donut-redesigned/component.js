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

  const LAD=['#1C1C1A','#4A4944','#8F8E88','#B0AFA9','#D8D7D1'];

  // ════ mono-redesign · donut → waffle of dots ════
  (()=>{
  const NS='http://www.w3.org/2000/svg';
  const mkEl=(svg,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);svg.appendChild(n);return n};
  const D=[['Search',34],['Referral',27],['Social',18],['Partners',12],['Paid',9]];
  obsReveal('waffle',s=>{
    s.innerHTML='';
    const COLS=10,CELL=21,R=7.5,X0=8,Y0=10;
    let idx=0;
    D.forEach(([name,v],g)=>{
      for(let k=0;k<v;k++){
        const c=idx+k,row=Math.floor(c/COLS),col=c%COLS;
        mkEl(s,'circle',{cx:X0+col*CELL+R,cy:Y0+row*CELL+R,r:R,fill:LAD[g],
          class:'pop',style:`animation-delay:${c*.008+g*.05}s`});
      }
      idx+=v;
    });
    D.forEach(([name,v],g)=>{
      const y=26+g*40;
      mkEl(s,'circle',{cx:246,cy:y,r:6,fill:LAD[g]});
      const n=mkEl(s,'text',{x:260,y:y-1,'font-size':10.5,'font-weight':600,fill:INK});
      n.textContent=name;
      const val=mkEl(s,'text',{x:260,y:y+13,'font-size':15,'font-weight':800,fill:g<2?INK:'#8F8E88'});
      val.textContent=v+'%';
    });
  });
  })();
}
