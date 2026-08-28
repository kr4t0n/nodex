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

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // deterministic
  const D2R=Math.PI/180;

  const pol=(cx,cy,r,deg)=>[cx+r*Math.cos(deg*D2R),cy+r*Math.sin(deg*D2R)];

  // small data, unit-decomposed: four shares of 100% become 100 people.
  // phyllotaxis discs (golden angle) so; share is countable, not just readable.
  (()=>{
  const SEG=[['CHARGED',41,INK],['TORN',35,'#55554F'],['ADRIFT',12,'#8F8E88'],['AVERSE',12,'#B0AFA9']];
  const POS=[[132,140],[276,116],[186,252],[322,238]];
  obsReveal('hundredfield',s=>{
    // dashed constellation hairlines tying the cluster cores
    [[0,1],[0,2],[1,3],[2,3]].forEach(([a,b],k)=>{
      el(s,'line',{x1:POS[a][0],y1:POS[a][1],x2:POS[b][0],y2:POS[b][1],
        stroke:GRID,'stroke-width':.7,'stroke-dasharray':'2 5',
        class:'fade',style:`animation-delay:${.9+k*.1}s`});
    });
    SEG.forEach(([name,v,shade],ci)=>{
      const [cx,cy]=POS[ci];
      let edge=0;
      for(let k=0;k<v;k++){
        const a=k*137.508+ci*55;
        const rr=4+Math.sqrt(k)*5.9+rnd(k+1,ci+2)*3;
        edge=Math.max(edge,rr);
        const [x,y]=pol(cx,cy,rr,a);
        // hairline spoke for every 5th person, core to dot
        if(k%5===0)el(s,'line',{x1:cx,y1:cy,x2:x,y2:y,stroke:'#CDCCC5','stroke-width':.6,
          class:'fade',style:`animation-delay:${ci*.14+k*.012}s`});
        const dot=el(s,'circle',{cx:x,cy:y,r:1.5+rnd(k+2,ci+3)*1.7,fill:shade,opacity:.9,
          class:'pop',style:`animation-delay:${ci*.14+k*.012}s`});
        tip(dot,`${name} — one of ${v} in 100`);
      }
      el(s,'circle',{cx,cy,r:2.4,fill:INK,class:'pop',style:`animation-delay:${ci*.14}s`});
      txt(s,{x:cx,y:cy+edge+13,'font-size':8,'font-weight':800,fill:INK,'text-anchor':'middle',
        'letter-spacing':'.1em',style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.5+ci*.12}s`,
        class:'fade'},`${name} · ${v}`);
    });
    txt(s,{x:200,y:314,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.3s'},'ONE DOT = ONE PERSON · 41 + 35 + 12 + 12 = 100');
  });
  })();
}
