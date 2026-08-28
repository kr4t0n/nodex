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

  (()=>{
  const FEAT=['EDITOR','BOARDS','DOCS','CHAT','FLOWS','VAULT','PAGES','SYNC'];
  const v=(i,j)=>{
    if(i===j)return -1;
    const a=Math.min(i,j),b=Math.max(i,j);
    const pop=(8-a)/8*(8-b)/8;
    const raw=pop*62*(0.35+rnd(a*8+b+1,a+b+3)*.9);
    return Math.round(raw);
  };
  const shade=t=>t>36?INK:t>24?'#4A4944':t>14?'#8F8E88':t>6?'#B0AFA9':'#D8D7D1';
  obsReveal('matheat',s=>{
    const X0=118,Y0=70,P=26,C=22;
    let max=0,mi=0,mj=0;
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){const t=v(i,j);if(t>max){max=t;mi=i;mj=j}}
    FEAT.forEach((f,i)=>{
      txt(s,{x:X0-10,y:Y0+i*P+C/2+3,'font-size':7,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${i*.04}s`},f);
      const cy=Y0-10;
      txt(s,{x:X0+i*P+C/2,y:cy,'font-size':7,'font-weight':700,fill:MUTED,'letter-spacing':'.06em',
        transform:`rotate(-55 ${X0+i*P+C/2} ${cy})`,class:'fade',style:`animation-delay:${i*.04}s`},f);
    });
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){
      const x=X0+j*P,y=Y0+i*P,t=v(i,j),d=(i+j)*.02;
      if(t<0){el(s,'rect',{x:x+C/2-3,y:y+C/2-.6,width:6,height:1.2,fill:'#D8D6CE',
        class:'fade',style:`animation-delay:${d}s`});continue}
      if(!t){el(s,'circle',{cx:x+C/2,cy:y+C/2,r:.9,fill:'#D8D6CE',
        class:'pop',style:`animation-delay:${d}s`});continue}
      const cell=el(s,'rect',{x,y,width:C,height:C,rx:4,fill:shade(t),
        class:'pop',style:`animation-delay:${d}s`});
      tip(cell,`${FEAT[i]} × ${FEAT[j]} — ${t}% of accounts use both`);
      if(i===mi&&j===mj){
        el(s,'rect',{x:x-3.5,y:y-3.5,width:C+7,height:C+7,rx:6,fill:'none',
          stroke:INK,'stroke-width':1,'stroke-dasharray':'2 3',
          class:'fade',style:'animation-delay:.9s'});
        txt(s,{x:x+C/2,y:y+C/2+3.5,'font-size':9,'font-weight':800,fill:PAPER,'text-anchor':'middle',
          class:'fade',style:'animation-delay:1s'},t);
      }
    }
    // shade legend, countable buckets
    const LG=[['#D8D7D1','1–6'],['#B0AFA9','7–14'],['#8F8E88','15–24'],['#4A4944','25–36'],[INK,'37+']];
    LG.forEach(([c,lab],k)=>{
      const x=118+k*54;
      el(s,'rect',{x,y:292,width:9,height:9,rx:2,fill:c,class:'fade',style:`animation-delay:${1+k*.05}s`});
      txt(s,{x:x+13,y:300,'font-size':6.5,'font-weight':600,fill:'#8F8E88',
        class:'fade',style:`animation-delay:${1+k*.05}s`},lab+'%');
    });
    txt(s,{x:36,y:300,'font-size':7,'font-weight':600,fill:'#B0AFA9','letter-spacing':'.1em',
      class:'fade',style:'animation-delay:1s'},'SHADE = %');
  });
  })();

})();
}
