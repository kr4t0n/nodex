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

  (()=>{
  const PROD=['Editor','Boards','Docs','Flows','Chat','Vault','Pages','Sync'];
  const CITY=['SF','NYC','LON','BER','TOK','SYD','SIN','PAR','AMS','TOR','SEO','SAO'];
  const W=[9,8,7,7,6,5,5,4,4,3,3,2];             // market weight
  obsReveal('arcmatrix',s=>{
    const rowY=i=>74+i*29, colX=j=>92+j*27, dy=j=>-16*Math.sin(Math.PI*j/11);
    const v=(i,j)=>{
      if(rnd(i*13+1,j*7+3)<.09)return 0;                 // a few true absences
      const age=1-i*.085;                                // older rows reach further
      return Math.min(40,Math.round(W[j]*3.4*age*(.45+rnd(i+1,j+1)*.85)));
    };
    // find top-4 cells for labels
    const all=[];
    PROD.forEach((_,i)=>CITY.forEach((_,j)=>all.push([v(i,j),i,j])));
    const top=all.sort((a,b)=>b[0]-a[0]).slice(0,4).map(d=>d[1]*100+d[2]);
    PROD.forEach((p,i)=>{
      // the horizon arc
      const d='M'+CITY.map((_,j)=>`${colX(j)} ${rowY(i)+dy(j)}`).join(' L ');
      el(s,'path',{d,fill:'none',stroke:'#E3E2DB','stroke-width':1,pathLength:1,
        class:'draw',style:`animation-delay:${i*.08}s`});
      txt(s,{x:84,y:rowY(i)+3,'font-size':8,'font-weight':600,fill:'#6A6963','text-anchor':'end',
        class:'fade',style:`animation-delay:${i*.08}s`},p);
      CITY.forEach((c,j)=>{
        const x=colX(j),y=rowY(i)+dy(j),vv=v(i,j);
        if(!vv){el(s,'circle',{cx:x,cy:y,r:.9,fill:'#D8D6CE',
          class:'pop',style:`animation-delay:${.2+i*.08+j*.02}s`});return}
        const fill=vv>=25?INK:vv>=12?'#6A6963':'#B0AFA9';
        const dot=el(s,'circle',{cx:x,cy:y,r:Math.sqrt(vv)*1.3,fill,
          class:'pop',style:`animation-delay:${.2+i*.08+j*.02}s`});
        tip(dot,`${p} · ${c} — ${vv} accounts`);
        if(top.includes(i*100+j))
          txt(s,{x,y:y-Math.sqrt(vv)*1.3-4,'font-size':7,'font-weight':800,fill:INK,
            'text-anchor':'middle',class:'fade',style:`animation-delay:${.6}s`},vv);
      });
    });
    CITY.forEach((c,j)=>{
      const x=colX(j),y=74+dy(j)-24;
      txt(s,{x,y,'font-size':7,'font-weight':700,fill:MUTED,'letter-spacing':'.08em',
        transform:`rotate(-55 ${x} ${y})`,class:'fade',style:`animation-delay:${j*.03}s`},c);
    });
  });
  })();
}
