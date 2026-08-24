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

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  // ════ 1 · brand spectrum ════
  // paired opposites; the pale ribbon threads our position down the page
  (()=>{
  const ROWS=[['FRIEND','AUTHORITY'],['SERIOUS','PLAYFUL'],['RELIABLE','RISK-TAKING'],['CONTEMPORARY','CLASSIC']];
  const US=[.74,.80,.40,.22];                 // 0 = left trait, 1 = right trait
  const COMP=[[.42,.52,.57],[.60,.65,.86],[.30,.34,.50],[.36,.41,.73]];
  const X0=118,X1=342,Y=i=>58+i*60,px=t=>X0+t*(X1-X0);
  obsReveal('spectrum',s=>{
    // the ribbon first, underneath everything
    let d=`M${px(US[0])} ${Y(0)}`;
    for(let i=1;i<4;i++)
      d+=` C${px(US[i-1])} ${Y(i-1)+30} ${px(US[i])} ${Y(i)-30} ${px(US[i])} ${Y(i)}`;
    el(s,'path',{d,fill:'none',stroke:'#F0EFEB','stroke-width':30,'stroke-linecap':'round',
      'stroke-linejoin':'round',opacity:.9,pathLength:1,class:'draw',
      style:'animation-duration:1.4s'});
    ROWS.forEach(([a,b],i)=>{
      const y=Y(i);
      el(s,'line',{x1:X0,y1:y,x2:X1,y2:y,stroke:'#B0AFA9','stroke-width':1,
        class:'fade',style:`animation-delay:${i*.08}s`});
      [X0,X1].forEach(x=>el(s,'line',{x1:x,y1:y-4,x2:x,y2:y+4,stroke:'#B0AFA9','stroke-width':1,
        class:'fade',style:`animation-delay:${i*.08}s`}));
      txt(s,{x:X0-14,y:y+3,'font-size':8,'font-weight':600,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.1em',class:'fade',style:`animation-delay:${i*.08}s`},a);
      txt(s,{x:X1+14,y:y+3,'font-size':8,'font-weight':600,fill:'#6A6963',
        'letter-spacing':'.1em',class:'fade',style:`animation-delay:${i*.08}s`},b);
      COMP[i].forEach((t,k)=>{
        const c=el(s,'circle',{cx:px(t),cy:y,r:3.2,fill:'#8F8E88',
          class:'pop',style:`animation-delay:${.3+i*.1+k*.05}s`});
        tip(c,`competitor ${'ABC'[k]} — ${Math.round(t*100)}% toward ${b}`);
      });
      const us=el(s,'circle',{cx:px(US[i]),cy:y,r:8,fill:INK,
        class:'pop',style:`animation-delay:${.5+i*.1}s`});
      tip(us,`us — ${Math.round(US[i]*100)}% toward ${b}`);
    });
    txt(s,{x:X0,y:284,'font-size':7.5,'font-weight':600,fill:'#B0AFA9','letter-spacing':'.12em',
      class:'fade',style:'animation-delay:.9s'},'● US    ● COMPETITORS A · B · C');
  });
  })();
}
