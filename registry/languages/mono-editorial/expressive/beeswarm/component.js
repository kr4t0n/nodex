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

  // ── New chart-family helpers (scoped to the added templates) ──
  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ L16 · matrix heat ════
  //  +  F10 dot heat
  (()=>{
  const FEAT=['EDITOR','BOARDS','DOCS','CHAT','FLOWS','VAULT','PAGES','SYNC'];
  const v=(i,j)=>{
    if(i===j)return -1;
    const a=Math.min(i,j),b=Math.max(i,j);
    const pop=(8-a)/8*(8-b)/8;
    const raw=pop*62*(0.35+rnd(a*8+b+1,a+b+3)*.9);
    return Math.round(raw);
  };
  const shade=t=>t>36?INK:t>24?'#4A4944':t>14?'#8F8E88':t>6?'#B0AFA9':'#D8D7D1';
  obsReveal('matheat',s=>{
    const X0=118,Y0=70,P=26,C=22;
    let max=0,mi=0,mj=0;
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){const t=v(i,j);if(t>max){max=t;mi=i;mj=j}}
    FEAT.forEach((f,i)=>{
      txt(s,{x:X0-10,y:Y0+i*P+C/2+3,'font-size':7,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${i*.04}s`},f);
      const cy=Y0-10;
      txt(s,{x:X0+i*P+C/2,y:cy,'font-size':7,'font-weight':700,fill:MUTED,'letter-spacing':'.06em',
        transform:`rotate(-55 ${X0+i*P+C/2} ${cy})`,class:'fade',style:`animation-delay:${i*.04}s`},f);
    });
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){
      const x=X0+j*P,y=Y0+i*P,t=v(i,j),d=(i+j)*.02;
      if(t<0){el(s,'rect',{x:x+C/2-3,y:y+C/2-.6,width:6,height:1.2,fill:'#D8D6CE',
        class:'fade',style:`animation-delay:${d}s`});continue}
      if(!t){el(s,'circle',{cx:x+C/2,cy:y+C/2,r:.9,fill:'#D8D6CE',
        class:'pop',style:`animation-delay:${d}s`});continue}
      const cell=el(s,'rect',{x,y,width:C,height:C,rx:4,fill:shade(t),
        class:'pop',style:`animation-delay:${d}s`});
      tip(cell,`${FEAT[i]} × ${FEAT[j]} — ${t}% of accounts use both`);
      if(i===mi&&j===mj){
        el(s,'rect',{x:x-3.5,y:y-3.5,width:C+7,height:C+7,rx:6,fill:'none',
          stroke:INK,'stroke-width':1,'stroke-dasharray':'2 3',
          class:'fade',style:'animation-delay:.9s'});
        txt(s,{x:x+C/2,y:y+C/2+3.5,'font-size':9,'font-weight':800,fill:PAPER,'text-anchor':'middle',
          class:'fade',style:'animation-delay:1s'},t);
      }
    }
    // shade legend, countable buckets
    const LG=[['#D8D7D1','1–6'],['#B0AFA9','7–14'],['#8F8E88','15–24'],['#4A4944','25–36'],[INK,'37+']];
    LG.forEach(([c,lab],k)=>{
      const x=118+k*54;
      el(s,'rect',{x,y:292,width:9,height:9,rx:2,fill:c,class:'fade',style:`animation-delay:${1+k*.05}s`});
      txt(s,{x:x+13,y:300,'font-size':6.5,'font-weight':600,fill:'#8F8E88',
        class:'fade',style:`animation-delay:${1+k*.05}s`},lab+'%');
    });
    txt(s,{x:36,y:300,'font-size':7,'font-weight':600,fill:'#B0AFA9','letter-spacing':'.1em',
      class:'fade',style:'animation-delay:1s'},'SHADE = %');
  });
  })();

  // ════ L17 · calendar heat ════
  // GitHub  Lupi 52  × 7
  //  = sqrt
  //  +  365
  (()=>{
  const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const DAY=['MON','WED','FRI','SUN'];
  const val=(w,d)=>{
    const wd=d<5;
    const season=1+.55*Math.sin((w-8)/9);
    if(!wd)return rnd(w*7+d+1,3)>.82?1:0;
    const raw=season*(2.5+rnd(w*7+d+1,d+2)*9)*(rnd(w+1,d+5)>.12?1:0);
    return Math.round(raw);
  };
  obsReveal('calheat',s=>{
    const X0=56,Y0=42,P=14.8;
    let max=0,mw=0,md=0;
    for(let w=0;w<52;w++)for(let d=0;d<7;d++){const t=val(w,d);if(t>max){max=t;mw=w;md=d}}
    DAY.forEach((lab,k)=>{
      txt(s,{x:X0-10,y:Y0+[0,2,4,6][k]*P+3,'font-size':6.5,'font-weight':700,fill:'#8F8E88','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${k*.04}s`},lab);
    });
    MON.forEach((m,k)=>{
      const x=X0+Math.round(k*52/12)*P;
      txt(s,{x,y:Y0-16,'font-size':7,'font-weight':700,fill:MUTED,'letter-spacing':'.1em',
        class:'fade',style:`animation-delay:${k*.03}s`},m);
      el(s,'line',{x1:x,y1:Y0-11,x2:x,y2:Y0-5,stroke:'#C6C5BF','stroke-width':.7,
        class:'fade',style:`animation-delay:${k*.03}s`});
    });
    for(let w=0;w<52;w++)for(let d=0;d<7;d++){
      const x=X0+w*P,y=Y0+d*P,t=val(w,d),delay=w*.012+d*.004;
      if(!t){el(s,'circle',{cx:x,cy:y,r:.75,fill:'#D8D6CE',
        class:'pop',style:`animation-delay:${delay}s`});continue}
      const r=1.1+Math.sqrt(t)*1.55;
      const dot=el(s,'circle',{cx:x,cy:y,r,
        fill:t>max*.66?INK:t>max*.33?'#6A6963':'#B0AFA9',
        class:'pop',style:`animation-delay:${delay}s`});
      tip(dot,`W${w+1} ${['MON','TUE','WED','THU','FRI','SAT','SUN'][d]} — ${t} deploys`);
    }
    // peak: dashed ring + marginalia hairline
    const px=X0+mw*P,py=Y0+md*P,pr=1.1+Math.sqrt(max)*1.55;
    el(s,'circle',{cx:px,cy:py,r:pr+3.6,fill:'none',stroke:INK,'stroke-width':1,
      'stroke-dasharray':'2 3',class:'fade',style:'animation-delay:1s'});
    el(s,'path',{d:`M${px+pr+6} ${py+6} C${px+34} ${py+30} ${px+52} ${py+36} ${px+72} ${py+36}`,
      fill:'none',stroke:'#B0AFA9','stroke-width':.7,class:'fade',style:'animation-delay:1.1s'});
    txt(s,{x:px+78,y:py+39,'font-size':7,fill:'#6A6963','font-style':'italic',
      class:'fade',style:'animation-delay:1.15s'},`the release-week spike — ${max} deploys in a day`);
    txt(s,{x:420,y:222,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE DOT = ONE DAY · DOT AREA = DEPLOYS · TINY DOT = A QUIET DAY');
  });
  })();

  // ════ L18 · beeswarm ════
  // violin  Lupi  120
  //  = enterprise  =
  (()=>{
  const N=120;
  const deals=Array.from({length:N},(_,i)=>{
    const u=rnd(i+1,3),ent=rnd(i+2,11)>.86;
    const v=Math.round(4+(ent?60:6)+150*Math.pow(u,2.6)+rnd(i+3,7)*10);
    return [Math.min(178,v),ent];
  });
  obsReveal('beeswarm',s=>{
    const X0=36,X1=376,BASE=246,R=4,GAP=R*2+.8;
    const mapX=v=>X0+v/180*(X1-X0);
    // axis rail + barcode ticks
    el(s,'line',{x1:X0-4,y1:BASE,x2:X1+4,y2:BASE,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let g=0;g<=9;g++){
      const x=X0+g/9*(X1-X0);
      el(s,'line',{x1:x,y1:BASE,x2:x,y2:BASE+(g%3===0?7:4),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${g*.02}s`});
      if(g%3===0)txt(s,{x,y:BASE+18,'font-size':7,'font-weight':600,fill:'#C6C5BF','text-anchor':'middle',
        class:'fade',style:`animation-delay:${g*.02}s`},'$'+Math.round(g/9*180)+'k');
    }
    // swarm as clean stacks: x snaps to a GAP-wide lane, dots pile upward —
    // the pile height IS the density. no half-overlaps, every dot countable.
    const lanes={};
    const sorted=deals.map((d,i)=>[d[0],d[1],i]).sort((a,b)=>a[0]-b[0]);
    sorted.forEach(([v,ent,i])=>{
      const lane=Math.round((mapX(v)-X0)/GAP);
      const x=X0+lane*GAP;
      const row=lanes[lane]||0;lanes[lane]=row+1;
      const y=BASE-R-1-row*GAP;
      const dot=ent
        ?el(s,'circle',{cx:x,cy:y,r:R,fill:PAPER,stroke:INK,'stroke-width':1.1,
          class:'pop',style:`animation-delay:${.1+i*.007}s`})
        :el(s,'circle',{cx:x,cy:y,r:R,fill:INK,opacity:.82,
          class:'pop',style:`animation-delay:${.1+i*.007}s`});
      tip(dot,`deal #${i+1} — $${v}k${ent?' · enterprise':''}`);
    });
    // median
    const vs=deals.map(d=>d[0]).sort((a,b)=>a-b);
    const med=vs[Math.floor(N/2)];
    const mx=mapX(med);
    el(s,'line',{x1:mx,y1:52,x2:mx,y2:BASE+8,stroke:'#8F8E88','stroke-width':.9,
      'stroke-dasharray':'2 4',class:'fade',style:'animation-delay:1s'});
    txt(s,{x:mx,y:44,'font-size':9.5,'font-weight':800,fill:INK,'text-anchor':'middle',
      style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1.1s`,
      class:'fade'},'MEDIAN $'+med+'k');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE DOT = ONE DEAL · THE PILE IS THE DISTRIBUTION · HOLLOW = ENTERPRISE');
  });
  })();

  // ════ L19 · ridgeline ════
  //  Lupi
  // F3 hairline area
  //  slab dotty matrix
  (()=>{
  const ROWS=[['MOBILE',3.2,1.3],['DESKTOP',5.1,1.9],['API',7.4,2.3],['IMPORTS',10.8,3.2],['BATCH',15.2,4]];
  obsReveal('ridge',s=>{
    const X0=92,X1=372,MAXH=24,N=72,LIFT=54;
    const rowY=i=>96+i*44;
    ROWS.forEach(([name,c,sp],i)=>{
      const y0=rowY(i);
      const dens=Array.from({length:N},(_,k)=>{
        const h=k/(N-1)*MAXH;
        return Math.exp(-((h-c)**2)/(2*sp*sp))+.26*Math.exp(-((h-c*2.1)**2)/(2*(sp*1.7)**2));
      });
      const dmax=Math.max(...dens);
      const pts=dens.map((d,k)=>[X0+k/(N-1)*(X1-X0),y0-d/dmax*LIFT]);
      const crest='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ');
      el(s,'path',{d:crest+` L${X1} ${y0} L${X0} ${y0} Z`,fill:PAPER,'fill-opacity':.96,
        class:'fade',style:`animation-delay:${i*.1}s`});
      pts.forEach(([px,py],k)=>{
        if(k%2)return;
        el(s,'line',{x1:px,y1:y0,x2:px,y2:py,stroke:'#8F8E88','stroke-width':.5,
          opacity:.28+rnd(k+1,i+3)*.32,class:'fade',style:`animation-delay:${i*.1+k*.004}s`});
      });
      el(s,'path',{d:crest,fill:'none',stroke:INK,'stroke-width':.9,pathLength:1,
        class:'draw',style:`animation-delay:${.1+i*.1}s;animation-duration:.8s`});
      el(s,'line',{x1:X0,y1:y0,x2:X1,y2:y0,stroke:GRID,'stroke-width':.7,
        class:'fade',style:`animation-delay:${i*.1}s`});
      const pk=dens.indexOf(dmax),[px,py]=pts[pk];
      const dot=el(s,'circle',{cx:px,cy:py,r:2.6,fill:INK,class:'pop',style:`animation-delay:${.6+i*.1}s`});
      tip(dot,`${name} — most runs finish around ${c.toFixed(1)}h`);
      txt(s,{x:px+7,y:py+1,'font-size':8,'font-weight':800,fill:INK,
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.7+i*.1}s`,
        class:'fade'},c.toFixed(1)+'h');
      txt(s,{x:X0-10,y:y0-3,'font-size':7.5,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        'letter-spacing':'.06em',class:'fade',style:`animation-delay:${i*.1}s`},name);
    });
    const yb=rowY(4);
    [0,6,12,18,24].forEach(h=>{
      const x=X0+h/MAXH*(X1-X0);
      el(s,'line',{x1:x,y1:yb+4,x2:x,y2:yb+9,stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:'animation-delay:.8s'});
      txt(s,{x,y:yb+20,'font-size':7,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        class:'fade',style:'animation-delay:.85s'},h+'h');
    });
    txt(s,{x:200,y:308,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'EACH CREST = ONE PIPELINE · THE AREA IS MADE OF HAIRLINES · DOT = THE PEAK');
  });
  })();

  // ════ L20 · parallel coordinates ════
  //  Lupi  =
  //  min/max
  (()=>{
  const DIMS=[['PRICE $',8,30],['CSAT',6,9.6],['RETENTION %',55,95],['GROWTH %',-5,40]];
  const P=[['Editor',12,9.1,91,22],['Boards',18,8.4,86,18],['Forms',9,8.8,78,31],
    ['Docs',15,8.0,82,12],['Chat',7,7.2,64,8],['Vault',24,7.8,88,6],
    ['Flows',21,8.6,90,38],['Views',11,7.5,71,14],['Sync',16,6.9,58,-2],
    ['Pages',8,8.2,74,19],['Grid',19,7.1,62,4],['Hub',13,6.6,52,9]];
  obsReveal('parallel',s=>{
    const AX=[64,156,248,340],TOP=64,BOT=252;
    const mapY=(di,v)=>{const [,lo,hi]=DIMS[di];return BOT-(v-lo)/(hi-lo)*(BOT-TOP)};
    // hero: judged on csat+retention+growth (price is a fact, not a virtue)
    const score=p=>(p[2]-6)/3.6+(p[3]-55)/40+(p[4]+5)/45;
    const hero=P.reduce((a,b)=>score(b)>score(a)?b:a);
    DIMS.forEach(([name,lo,hi],di)=>{
      el(s,'line',{x1:AX[di],y1:TOP-8,x2:AX[di],y2:BOT+8,stroke:'#B0AFA9','stroke-width':1,
        class:'fade',style:`animation-delay:${di*.06}s`});
      [[TOP-8],[BOT+8]].forEach(([yy])=>
        el(s,'line',{x1:AX[di]-4,y1:yy,x2:AX[di]+4,y2:yy,stroke:'#B0AFA9','stroke-width':1,
          class:'fade',style:`animation-delay:${di*.06}s`}));
      txt(s,{x:AX[di],y:TOP-22,'font-size':7,'font-weight':800,fill:'#6A6963','text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${di*.06}s`},name);
      txt(s,{x:AX[di]+8,y:TOP-5,'font-size':6.5,'font-weight':600,fill:'#C6C5BF',
        class:'fade',style:`animation-delay:${.1+di*.06}s`},hi);
      txt(s,{x:AX[di]+8,y:BOT+11,'font-size':6.5,'font-weight':600,fill:'#C6C5BF',
        class:'fade',style:`animation-delay:${.1+di*.06}s`},lo);
    });
    P.forEach((p,i)=>{
      const isHero=p===hero;
      const ys=[mapY(0,p[1]),mapY(1,p[2]),mapY(2,p[3]),mapY(3,p[4])];
      let d=`M${AX[0]} ${ys[0].toFixed(1)}`;
      for(let k=0;k<3;k++){
        const mx=(AX[k]+AX[k+1])/2;
        d+=` C${mx} ${ys[k].toFixed(1)} ${mx} ${ys[k+1].toFixed(1)} ${AX[k+1]} ${ys[k+1].toFixed(1)}`;
      }
      const ln=el(s,'path',{d,fill:'none',
        stroke:isHero?INK:'#8F8E88','stroke-width':isHero?2:.65,
        opacity:isHero?1:.5+rnd(i+1,5)*.3,pathLength:1,
        class:'draw',style:`animation-delay:${.2+i*.05}s;animation-duration:.8s`});
      tip(ln,`${p[0]} — $${p[1]} · CSAT ${p[2]} · ${p[3]}% retained · ${p[4]}% growth`);
      ys.forEach((y,di)=>el(s,'circle',{cx:AX[di],cy:y,r:isHero?3:1.4,
        fill:isHero?INK:'#8F8E88',opacity:isHero?1:.7,
        class:'pop',style:`animation-delay:${.3+i*.05+di*.04}s`}));
      if(isHero)
        txt(s,{x:AX[3]+12,y:ys[3]+3,'font-size':9,'font-weight':800,fill:INK,
          style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
          class:'fade'},p[0]);
    });
    txt(s,{x:200,y:302,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE HAIRLINE = ONE PRODUCT · INK = BEST ACROSS THE BOARD');
  });
  })();
  })();
}
