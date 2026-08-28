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

  //  Basics  + IQR =
  (()=>{
  const G=[['ENT',[.4,.9,1.5,2.6,4.4],[6.2]],
           ['PRO',[.8,2.1,3.3,5,7.8],[10.5]],
           ['STARTER',[1.5,3.8,6.1,8.9,13.2],[16.8]],
           ['FREE',[2.2,6,9.4,13.8,19.6],[22.1,23.5]]];
  const SHADE=[INK,'#4A4944','#8F8E88','#B0AFA9'];
  obsReveal('boxplot',s=>{
    const TOP=42,BASE=260,MAXH=24,mapY=v=>BASE-v/MAXH*(BASE-TOP);
    const colX=g=>78+g*84,BW=24;
    [0,6,12,18,24].forEach(h=>{
      el(s,'line',{x1:36,y1:mapY(h),x2:378,y2:mapY(h),stroke:'#E3E2DB','stroke-width':.8,
        class:'fade',style:`animation-delay:${h*.008}s`});
      txt(s,{x:30,y:mapY(h)+3,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'end',
        class:'fade',style:`animation-delay:${h*.008}s`},h+'h');
    });
    G.forEach(([name,[mn,q1,md,q3,mx],outs],g)=>{
      const x=colX(g);
      el(s,'line',{x1:x,y1:mapY(mn),x2:x,y2:mapY(mx),stroke:'#8F8E88','stroke-width':.8,
        pathLength:1,class:'draw',style:`animation-delay:${g*.12}s;animation-duration:.6s`});
      [mn,mx].forEach(vv=>el(s,'line',{x1:x-7,y1:mapY(vv),x2:x+7,y2:mapY(vv),
        stroke:'#8F8E88','stroke-width':1,class:'fade',style:`animation-delay:${.2+g*.12}s`}));
      const box=el(s,'rect',{x:x-BW/2,y:mapY(q3),width:BW,height:mapY(q1)-mapY(q3),rx:9,
        fill:SHADE[g],class:'pop',style:`animation-delay:${.15+g*.12}s`});
      tip(box,`${name} — half of tickets answered in ${q1}–${q3}h`);
      el(s,'line',{x1:x-BW/2+3,y1:mapY(md),x2:x+BW/2-3,y2:mapY(md),stroke:PAPER,'stroke-width':2.2,
        class:'fade',style:`animation-delay:${.5+g*.12}s`});
      txt(s,{x:x+BW/2+6,y:mapY(md)+3,'font-size':9.5,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.6+g*.12}s`},md.toFixed(1)+'h');
      outs.forEach((o,k)=>{
        const d=el(s,'circle',{cx:x+(rnd(k+1,g+3)-.5)*8,cy:mapY(o),r:2.6,fill:PAPER,
          stroke:'#6A6963','stroke-width':1.1,class:'pop',style:`animation-delay:${.7+g*.12+k*.06}s`});
        tip(d,`${name} outlier — ${o}h`);
      });
      txt(s,{x,y:BASE+18,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${g*.12}s`},name);
    });
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'BOX = MIDDLE HALF · PAPER TICK = MEDIAN · HOLLOW = OUTLIER · DARKEST = FASTEST');
  });
  })();

})();
}
