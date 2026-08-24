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

  // ════ C6 · dot heat ════
  // 热力图：punch card 的 Lupi 皮。7×12 网格，点面积 = 工单量，
  // 静默格留一粒极小点（沉默可见）。最热格标数。
  (()=>{
  const DAY=['MON','TUE','WED','THU','FRI','SAT','SUN'];
  obsReveal('dotheat',s=>{
    const x0=j=>64+j*27,y0=i=>58+i*30;
    let max=0,mi=0,mj=0;
    const v=(i,j)=>{
      const day=i<5?1:.32;                       // weekends quiet
      const hour=Math.exp(-((j-4.6)**2)/7)+.7*Math.exp(-((j-8.4)**2)/5); // two peaks
      const raw=day*hour*22*(0.6+rnd(i*12+j+1,j+3)*.8);
      return Math.round(raw);
    };
    for(let i=0;i<7;i++)for(let j=0;j<12;j++){const t=v(i,j);if(t>max){max=t;mi=i;mj=j}}
    for(let i=0;i<7;i++){
      txt(s,{x:50,y:y0(i)+3,'font-size':7.5,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.05}s`},DAY[i]);
      for(let j=0;j<12;j++){
        const t=v(i,j),x=x0(j),y=y0(i);
        if(!t){el(s,'circle',{cx:x,cy:y,r:.8,fill:'#D8D6CE',
          class:'pop',style:`animation-delay:${i*.05+j*.015}s`});continue}
        const hero=i===mi&&j===mj;
        const dot=el(s,'circle',{cx:x,cy:y,r:1.2+Math.sqrt(t)*2.1,
          fill:t>max*.66?INK:t>max*.33?'#6A6963':'#B0AFA9',
          class:'pop',style:`animation-delay:${i*.05+j*.015}s`});
        tip(dot,`${DAY[i]} ${8+j}:00 — ${t} tickets`);
        if(hero)el(s,'circle',{cx:x,cy:y,r:1.2+Math.sqrt(t)*2.1+3.4,fill:'none',
          stroke:INK,'stroke-width':1,'stroke-dasharray':'2 3',
          class:'fade',style:'animation-delay:1s'});
      }
    }
    for(let j=0;j<12;j+=2)
      txt(s,{x:x0(j),y:y0(6)+26,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'middle',
        class:'fade',style:`animation-delay:${j*.02}s`},(8+j)+':00');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      `DOT AREA = TICKETS · DASHED RING = THE PEAK, ${max} · TINY DOT = A QUIET HOUR`);
  });
  })();
}
