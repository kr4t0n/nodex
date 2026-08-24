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

  // ── shared Mono tokens（与 lupi-gallery 同源） ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const NS='http://www.w3.org/2000/svg';

  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};

  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ C8 · dumbbell queue ════
  // 哑铃对比：空心点=改版前，实心点=改版后，两点之间的轨道上串珠，
  // 一珠 = 省下的一分钟，可数。全部向左走（变快），没有交叉没有 X。
  (()=>{
  const D=[['INVITE FLOW',14,6],['FIRST BOARD',19,9],['IMPORT DATA',26,13],['TEAM SETUP',31,21],['GO LIVE',38,30]];
  obsReveal('dumbbell',s=>{
    const y0=i=>56+i*46,X0=118,X1=364,mapX=v=>X0+(v-4)/36*(X1-X0);
    D.forEach(([name,was,now],i)=>{
      const y=y0(i),xa=mapX(was),xb=mapX(now);
      txt(s,{x:108,y:y+3,'font-size':7.5,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${i*.08}s`},name);
      el(s,'line',{x1:X0-6,y1:y,x2:X1+6,y2:y,stroke:'#E3E2DB','stroke-width':.7,
        class:'fade',style:`animation-delay:${i*.08}s`});
      // beads: one per minute saved, strung between the two dots
      const n=was-now;
      for(let k=0;k<n;k++){
        const t=(k+.5)/n,x=xb+t*(xa-xb),yy=y+(rnd(k+1,i+3)-.5)*2.6;
        el(s,'circle',{cx:x,cy:yy,r:1.5+rnd(k+2,i+4)*.9,fill:'#8F8E88',opacity:.85,
          class:'pop',style:`animation-delay:${.3+i*.08+k*.03}s`});
      }
      el(s,'circle',{cx:xa,cy:y,r:4.2,fill:PAPER,stroke:INK,'stroke-width':1.3,
        class:'pop',style:`animation-delay:${.2+i*.08}s`});
      const after=el(s,'circle',{cx:xb,cy:y,r:4.6,fill:INK,
        class:'pop',style:`animation-delay:${.6+i*.08}s`});
      tip(after,`${name} — ${was} min → ${now} min`);
      txt(s,{x:xa+10,y:y-8,'font-size':8.5,'font-weight':700,fill:'#B0AFA9',
        class:'fade',style:`animation-delay:${.3+i*.08}s`},was);
      txt(s,{x:xb-10,y:y-8,'font-size':10,'font-weight':800,fill:INK,'text-anchor':'end',
        class:'fade',style:`animation-delay:${.7+i*.08}s`},now);
    });
    txt(s,{x:X0,y:290,'font-size':7,'font-weight':600,fill:'#C6C5BF',class:'fade'},'FASTER ←');
    txt(s,{x:X1,y:290,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'end',
      class:'fade'},'MINUTES');
    txt(s,{x:200,y:308,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
      'ONE BEAD = ONE MINUTE SAVED · HOLLOW = BEFORE · INK = AFTER');
  });
  })();
}
