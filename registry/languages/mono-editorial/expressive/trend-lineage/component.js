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

  (()=>{
  // [name, events [year, type f|o], aliveToday]
  const TR=[
    ['Dark mode',[[2017,'f'],[2022,'o']],true],
    ['Kanban',[[2016,'f']],true],
    ['Wikis',[[2016,'f'],[2019,'o']],false],
    ['Slash cmds',[[2018,'f']],true],
    ['Templates',[[2019,'f'],[2024,'o']],true],
    ['Inbox',[[2020,'f']],false],
    ['Live cursors',[[2020,'f'],[2023,'o']],true],
    ['AI drafts',[[2023,'f'],[2025,'o']],true],
    ['Voice notes',[[2021,'f']],false],
    ['Offline',[[2018,'f'],[2026,'o']],true],
  ];
  const Y0=2016,yY=yr=>34+(yr-Y0)*24,colX=c=>76+c*31;
  obsReveal('lineage',s=>{
    for(let yr=Y0;yr<=2026;yr++){
      el(s,'line',{x1:60,y1:yY(yr),x2:372,y2:yY(yr),stroke:'#E3E2DB','stroke-width':.8,
        class:'fade',style:`animation-delay:${(yr-Y0)*.03}s`});
      if(yr%2===0)txt(s,{x:52,y:yY(yr)+3,'font-size':8,'font-weight':600,fill:MUTED,'text-anchor':'end',
        class:'fade',style:`animation-delay:${(yr-Y0)*.03}s`},yr);
    }
    TR.forEach(([name,ev,alive],c)=>{
      const x=colX(c);
      // segments between events: solid while fresh, dashed once dormant
      for(let k=0;k<ev.length-1;k++){
        const gap=ev[k+1][0]-ev[k][0];
        el(s,'line',{x1:x,y1:yY(ev[k][0])+7,x2:x,y2:yY(ev[k+1][0])-7,
          stroke:'#B0AFA9','stroke-width':1,
          'stroke-dasharray':gap>2?'2 4':'none',pathLength:1,
          class:'draw',style:`animation-delay:${.3+c*.07}s;animation-duration:.6s`});
      }
      const last=ev[ev.length-1][0];
      if(alive)
        el(s,'line',{x1:x,y1:yY(last)+7,x2:x,y2:yY(2026)+16,stroke:'#B0AFA9','stroke-width':1,
          pathLength:1,class:'draw',style:`animation-delay:${.45+c*.07}s;animation-duration:.6s`});
      ev.forEach(([yr,t])=>{
        const node=el(s,'circle',t==='f'
          ?{cx:x,cy:yY(yr),r:5.5,fill:INK}
          :{cx:x,cy:yY(yr),r:5.5,fill:PAPER,stroke:INK,'stroke-width':1.4});
        node.setAttribute('class','pop');
        node.style.animationDelay=(.35+c*.07)+'s';
        tip(node,`${name} — ${t==='f'?'shipped':'reworked'} ${yr}`);
      });
      // terminal dot: alive lands on today's baseline, dead stops where it stopped
      el(s,'circle',{cx:x,cy:alive?yY(2026)+16:yY(last)+12,r:alive?3:1.6,
        fill:alive?INK:'#C6C5BF',class:'pop',style:`animation-delay:${.6+c*.07}s`});
      const ly=yY(2026)+26;
      txt(s,{x,y:ly,'font-size':6.8,'font-weight':600,fill:alive?'#4A4944':'#B0AFA9',
        transform:`rotate(-38 ${x} ${ly})`,'text-anchor':'end',
        class:'fade',style:`animation-delay:${.7+c*.05}s`},name);
    });
  });
  })();
}
