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

  // ════ C4 · plumb scatter ════
  // 散点：每个点垂一根发丝铅垂线到地板，x 读线脚、y 读高度。
  // 地板是 barcode 刻度。最好/最差两个点标名。
  (()=>{
  const P=[['Editor',72,86],['Boards',58,74],['Docs',44,79],['Chat',38,62],['Flows',66,58],
           ['Vault',82,71],['Pages',28,55],['Sync',52,49],['Grid',88,44],['Views',20,68],
           ['Hub',76,32],['Forms',34,38]];
  obsReveal('plumb',s=>{
    const X0=48,X1=368,base=258,mapX=p=>X0+p/100*(X1-X0),mapY=v=>base-(v-20)*2.6;
    // barcode floor
    for(let g=0;g<=20;g++){
      const x=X0+g/20*(X1-X0);
      el(s,'line',{x1:x,y1:base,x2:x,y2:base-(g%5===0?7:4),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${g*.01}s`});
    }
    el(s,'line',{x1:X0-6,y1:base,x2:X1+6,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
    txt(s,{x:X0,y:base+16,'font-size':7,'font-weight':600,fill:'#C6C5BF',class:'fade'},'CHEAP');
    txt(s,{x:X1,y:base+16,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'end',
      class:'fade'},'PREMIUM');
    const best=P.reduce((a,b)=>b[2]>a[2]?b:a),worst=P.reduce((a,b)=>b[2]<a[2]?b:a);
    P.forEach(([name,px,sat],i)=>{
      const x=mapX(px),y=mapY(sat),hero=name===best[0]||name===worst[0];
      el(s,'line',{x1:x,y1:base,x2:x,y2:y,stroke:'#B0AFA9','stroke-width':.55,
        opacity:.6,class:'fade',style:`animation-delay:${.2+i*.05}s`});
      const dot=el(s,'circle',{cx:x,cy:y,r:hero?4.6:2.6,fill:hero?INK:'#55554F',
        class:'pop',style:`animation-delay:${.25+i*.05}s`});
      tip(dot,`${name} — price ${px} · satisfaction ${sat}`);
      if(hero)txt(s,{x,y:y-10,'font-size':8.5,'font-weight':800,fill:INK,'text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.8}s`,
        class:'fade'},`${name} · ${sat}`);
    });
    txt(s,{x:26,y:mapY(85),'font-size':7,'font-weight':600,fill:'#C6C5BF',
      transform:`rotate(-90 26 ${mapY(85)})`,'text-anchor':'end','letter-spacing':'.08em',class:'fade'},'HAPPIER ↑');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
      'EVERY DOT HANGS A PLUMB LINE · READ X AT THE FLOOR');
  });
  })();
}
