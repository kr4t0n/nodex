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

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  //  Glance 3
  //  P1 Lupi
  (()=>{
  const FEAT=['EDITOR','BOARDS','DOCS','CHAT','FLOWS','VAULT'];
  const VER=['v2.0','v1.9','v1.8','v1.7','v1.6'];
  const BASEV=[88,74,61,42,35,27];
  const v=(r,c)=>Math.max(2,Math.round(BASEV[c]-r*(6+c*.8)+(rnd(r*6+c+1,c+3)-.5)*10));
  const shade=t=>t>64?INK:t>46?'#4A4944':t>30?'#8F8E88':t>15?'#B0AFA9':'#D8D7D1';
  obsReveal('gheat',s=>{
    const X0=92,Y0=58,PX=48,PY=42,W=42,H=36;
    FEAT.forEach((f,c)=>{
      txt(s,{x:X0+c*PX+W/2,y:Y0-12,'font-size':6.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.04em',class:'fade',style:`animation-delay:${c*.04}s`},f);
    });
    VER.forEach((ver,r)=>{
      txt(s,{x:X0-10,y:Y0+r*PY+H/2+3,'font-size':8.5,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        class:'fade',style:`animation-delay:${r*.05}s`},ver);
      FEAT.forEach((f,c)=>{
        const t=v(r,c),x=X0+c*PX,y=Y0+r*PY,dark=t>46;
        const cell=el(s,'rect',{x,y,width:W,height:H,rx:9,fill:shade(t),
          class:'pop',style:`animation-delay:${(r*6+c)*.022}s`});
        tip(cell,`${f} on ${ver} — ${t}% of accounts`);
        txt(s,{x:x+W/2,y:y+H/2+4,'font-size':10.5,'font-weight':800,fill:dark?PAPER:INK,'text-anchor':'middle',
          class:'fade',style:`animation-delay:${.15+(r*6+c)*.022}s`},t);
      });
    });
    txt(s,{x:200,y:300,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
      'SHADE = ADOPTION · NEWER VERSIONS RUN DARKER');
  });
  })();

})();
}
