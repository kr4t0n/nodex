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

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  (()=>{
  const STAGE=[['VISITORS',4200],['SIGN-UPS',1900],['ACTIVATED',960],['RETAINED',540],['PAYING',310]];
  obsReveal('hourglass',s=>{
    const CXm=185,sy=k=>34+k*64,w=c=>c/4200*290;
    STAGE.forEach(([name,c],k)=>{
      const y=sy(k),hw=w(c)/2;
      // barcode strip: one tick ≈ 40 people
      const n=Math.round(c/40);
      for(let t=0;t<n;t++){
        const x=CXm-hw+(t+.5)/n*hw*2+(rnd(t+1,k+3)-.5)*3;
        el(s,'line',{x1:x,y1:y-6,x2:x,y2:y+6,stroke:INK,'stroke-width':.8,
          opacity:.45+rnd(t+2,k+5)*.5,class:'fade',style:`animation-delay:${k*.12+t*.004}s`});
      }
      // threads trickling to the next strip
      if(k<4){
        const hw1=w(STAGE[k+1][1])/2;
        for(let t=0;t<34;t++){
          const xt=CXm+(rnd(t+1,k*7+1)-.5)*2*hw*.94;
          const xb=CXm+(rnd(t+3,k*7+5)-.5)*2*hw1*.94;
          el(s,'path',{d:`M${xt} ${y+8} C${xt} ${y+34} ${xb} ${sy(k+1)-34} ${xb} ${sy(k+1)-8}`,
            fill:'none',stroke:'#B0AFA9','stroke-width':.5,opacity:.32,pathLength:1,
            class:'draw',style:`animation-delay:${.2+k*.15+t*.008}s;animation-duration:.8s`});
        }
        // conversion between stages, parked in the left margin
        const pct=Math.round(STAGE[k+1][1]/c*100);
        txt(s,{x:26,y:(y+sy(k+1))/2+3,'font-size':8.5,'font-weight':800,fill:'#8F8E88',
          class:'fade',style:`animation-delay:${.5+k*.15}s`},pct+'%');
        txt(s,{x:26,y:(y+sy(k+1))/2+13,'font-size':6,'font-weight':600,fill:'#C6C5BF',
          'letter-spacing':'.08em',class:'fade',style:`animation-delay:${.5+k*.15}s`},'GET THROUGH');
      }
      // stage label, tied to the strip edge
      el(s,'line',{x1:CXm+hw+6,y1:y,x2:340,y2:y,stroke:'#DEDDD6','stroke-width':.8,
        class:'fade',style:`animation-delay:${.3+k*.12}s`});
      txt(s,{x:344,y:y-1,'font-size':7.5,'font-weight':700,fill:'#4A4944',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${.35+k*.12}s`},name);
      txt(s,{x:344,y:y+10,'font-size':9.5,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.4+k*.12}s`},c.toLocaleString());
    });
  });
  })();
}
