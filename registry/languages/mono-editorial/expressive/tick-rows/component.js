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

  // ════ C1 · tick rows ════
  // 横向条形：一行 = 一支队伍的发布队列，1 tick = 1 次发布。
  // tick 高度/透明度抖动，每 5 根一个点标，行尾大数。
  (()=>{
  const D=[['PLATFORM',34],['GROWTH',28],['MOBILE',22],['INFRA',17],['ML',11],['DESIGN',8]];
  obsReveal('tickrows',s=>{
    const y0=i=>52+i*44,X0=104,PX=6.9;
    D.forEach(([name,v],i)=>{
      const y=y0(i);
      txt(s,{x:94,y:y+3,'font-size':8,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
      el(s,'line',{x1:X0,y1:y+9,x2:X0+34*PX,y2:y+9,stroke:GRID,'stroke-width':.6,
        class:'fade',style:`animation-delay:${i*.08}s`});
      for(let k=0;k<v;k++){
        const x=X0+k*PX+PX/2,h=9+rnd(k+1,i+2)*6;
        el(s,'line',{x1:x,y1:y+9,x2:x,y2:y+9-h,stroke:INK,'stroke-width':.9,
          opacity:.55+rnd(k+3,i+5)*.45,class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
        if(k%5===4)el(s,'circle',{cx:x,cy:y+13,r:.8,fill:'#C6C5BF',
          class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
      }
      const lab=txt(s,{x:X0+v*PX+10,y:y+4,'font-size':11,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.4+i*.08}s`},v);
      tip(lab,`${name} — ${v} releases`);
    });
    txt(s,{x:200,y:308,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:.9s'},
      'ONE TICK = ONE RELEASE · DOT MARKS EVERY FIFTH');
  });
  })();
}
