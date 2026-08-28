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

  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // GitHub  Lupi 52  × 7
  (()=>{
  const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const DAY=['MON','WED','FRI','SUN'];
  const val=(w,d)=>{
    const wd=d<5;
    const season=1+.55*Math.sin((w-8)/9);
    if(!wd)return rnd(w*7+d+1,3)>.82?1:0;
    const raw=season*(2.5+rnd(w*7+d+1,d+2)*9)*(rnd(w+1,d+5)>.12?1:0);
    return Math.round(raw);
  };
  obsReveal('calheat',s=>{
    const X0=56,Y0=42,P=14.8;
    let max=0,mw=0,md=0;
    for(let w=0;w<52;w++)for(let d=0;d<7;d++){const t=val(w,d);if(t>max){max=t;mw=w;md=d}}
    DAY.forEach((lab,k)=>{
      txt(s,{x:X0-10,y:Y0+[0,2,4,6][k]*P+3,'font-size':6.5,'font-weight':700,fill:'#8F8E88','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${k*.04}s`},lab);
    });
    MON.forEach((m,k)=>{
      const x=X0+Math.round(k*52/12)*P;
      txt(s,{x,y:Y0-16,'font-size':7,'font-weight':700,fill:MUTED,'letter-spacing':'.1em',
        class:'fade',style:`animation-delay:${k*.03}s`},m);
      el(s,'line',{x1:x,y1:Y0-11,x2:x,y2:Y0-5,stroke:'#C6C5BF','stroke-width':.7,
        class:'fade',style:`animation-delay:${k*.03}s`});
    });
    for(let w=0;w<52;w++)for(let d=0;d<7;d++){
      const x=X0+w*P,y=Y0+d*P,t=val(w,d),delay=w*.012+d*.004;
      if(!t){el(s,'circle',{cx:x,cy:y,r:.75,fill:'#D8D6CE',
        class:'pop',style:`animation-delay:${delay}s`});continue}
      const r=1.1+Math.sqrt(t)*1.55;
      const dot=el(s,'circle',{cx:x,cy:y,r,
        fill:t>max*.66?INK:t>max*.33?'#6A6963':'#B0AFA9',
        class:'pop',style:`animation-delay:${delay}s`});
      tip(dot,`W${w+1} ${['MON','TUE','WED','THU','FRI','SAT','SUN'][d]} — ${t} deploys`);
    }
    // peak: dashed ring + marginalia hairline
    const px=X0+mw*P,py=Y0+md*P,pr=1.1+Math.sqrt(max)*1.55;
    el(s,'circle',{cx:px,cy:py,r:pr+3.6,fill:'none',stroke:INK,'stroke-width':1,
      'stroke-dasharray':'2 3',class:'fade',style:'animation-delay:1s'});
    el(s,'path',{d:`M${px+pr+6} ${py+6} C${px+34} ${py+30} ${px+52} ${py+36} ${px+72} ${py+36}`,
      fill:'none',stroke:'#B0AFA9','stroke-width':.7,class:'fade',style:'animation-delay:1.1s'});
    txt(s,{x:px+78,y:py+39,'font-size':7,fill:'#6A6963','font-style':'italic',
      class:'fade',style:'animation-delay:1.15s'},`the release-week spike — ${max} deploys in a day`);
    txt(s,{x:420,y:222,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY');
  });
  })();

})();
}
