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

  //  Lupi  =
  //  min/max
  (()=>{
  const DIMS=[['PRICE $',8,30],['CSAT',6,9.6],['RETENTION %',55,95],['GROWTH %',-5,40]];
  const P=[['Editor',12,9.1,91,22],['Boards',18,8.4,86,18],['Forms',9,8.8,78,31],
    ['Docs',15,8.0,82,12],['Chat',7,7.2,64,8],['Vault',24,7.8,88,6],
    ['Flows',21,8.6,90,38],['Views',11,7.5,71,14],['Sync',16,6.9,58,-2],
    ['Pages',8,8.2,74,19],['Grid',19,7.1,62,4],['Hub',13,6.6,52,9]];
  obsReveal('parallel',s=>{
    const AX=[64,156,248,340],TOP=64,BOT=252;
    const mapY=(di,v)=>{const [,lo,hi]=DIMS[di];return BOT-(v-lo)/(hi-lo)*(BOT-TOP)};
    // hero: judged on csat+retention+growth (price is a fact, not a virtue)
    const score=p=>(p[2]-6)/3.6+(p[3]-55)/40+(p[4]+5)/45;
    const hero=P.reduce((a,b)=>score(b)>score(a)?b:a);
    DIMS.forEach(([name,lo,hi],di)=>{
      el(s,'line',{x1:AX[di],y1:TOP-8,x2:AX[di],y2:BOT+8,stroke:'#B0AFA9','stroke-width':1,
        class:'fade',style:`animation-delay:${di*.06}s`});
      [[TOP-8],[BOT+8]].forEach(([yy])=>
        el(s,'line',{x1:AX[di]-4,y1:yy,x2:AX[di]+4,y2:yy,stroke:'#B0AFA9','stroke-width':1,
          class:'fade',style:`animation-delay:${di*.06}s`}));
      txt(s,{x:AX[di],y:TOP-22,'font-size':7,'font-weight':800,fill:'#6A6963','text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${di*.06}s`},name);
      txt(s,{x:AX[di]+8,y:TOP-5,'font-size':6.5,'font-weight':600,fill:'#C6C5BF',
        class:'fade',style:`animation-delay:${.1+di*.06}s`},hi);
      txt(s,{x:AX[di]+8,y:BOT+11,'font-size':6.5,'font-weight':600,fill:'#C6C5BF',
        class:'fade',style:`animation-delay:${.1+di*.06}s`},lo);
    });
    P.forEach((p,i)=>{
      const isHero=p===hero;
      const ys=[mapY(0,p[1]),mapY(1,p[2]),mapY(2,p[3]),mapY(3,p[4])];
      let d=`M${AX[0]} ${ys[0].toFixed(1)}`;
      for(let k=0;k<3;k++){
        const mx=(AX[k]+AX[k+1])/2;
        d+=` C${mx} ${ys[k].toFixed(1)} ${mx} ${ys[k+1].toFixed(1)} ${AX[k+1]} ${ys[k+1].toFixed(1)}`;
      }
      const ln=el(s,'path',{d,fill:'none',
        stroke:isHero?INK:'#8F8E88','stroke-width':isHero?1.1:.65,
        opacity:isHero?1:.5+rnd(i+1,5)*.3,pathLength:1,
        class:'draw',style:`animation-delay:${.2+i*.05}s;animation-duration:.8s`});
      tip(ln,`${p[0]} — $${p[1]} · CSAT ${p[2]} · ${p[3]}% retained · ${p[4]}% growth`);
      ys.forEach((y,di)=>el(s,'circle',{cx:AX[di],cy:y,r:isHero?3:1.4,
        fill:isHero?INK:'#8F8E88',opacity:isHero?1:.7,
        class:'pop',style:`animation-delay:${.3+i*.05+di*.04}s`}));
      if(isHero)
        txt(s,{x:AX[3]+12,y:ys[3]+3,'font-size':9,'font-weight':800,fill:INK,
          style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
          class:'fade'},p[0]);
    });
    txt(s,{x:200,y:302,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE HAIRLINE = ONE PRODUCT · INK = BEST ACROSS THE BOARD');
  });
  })();
  })();
}
