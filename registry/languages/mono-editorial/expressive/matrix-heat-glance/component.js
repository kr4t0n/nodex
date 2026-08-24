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

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  const rnd=(i,k)=>((i*73856093)^(k*19349663))%1000/1000;

  // ── New chart-family helpers (scoped to the added templates) ──
  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ G19 · violin ════
  // Glance beeswarm
  //  plan  = KDE
  (()=>{
  const G=[['ENT',1.6,.8],['PRO',3.4,1.6],['STARTER',6.2,2.6],['FREE',9.5,4.2]];
  const M=64;
  const samples=g=>Array.from({length:M},(_,i)=>{
    const [,c,s]=G[g];
    const v=c+s*((rnd(i+1,g*3+1)+rnd(i+7,g*3+2)+rnd(i+13,g*3+3))-1.5);
    return Math.max(.2,v);
  });
  obsReveal('violin',s=>{
    const TOP=40,BASE=262,HMAX=17;
    const mapY=h=>BASE-h/HMAX*(BASE-TOP);
    const colX=g=>76+g*84;
    // hour grid
    [0,4,8,12,16].forEach(h=>{
      el(s,'line',{x1:34,y1:mapY(h),x2:378,y2:mapY(h),stroke:'#E3E2DB','stroke-width':.8,
        class:'fade',style:`animation-delay:${h*.01}s`});
      txt(s,{x:28,y:mapY(h)+3,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'end',
        class:'fade',style:`animation-delay:${h*.01}s`},h+'h');
    });
    const SHADE=[INK,'#4A4944','#8F8E88','#B0AFA9'];
    G.forEach(([name],g)=>{
      const vs=samples(g).sort((a,b)=>a-b);
      const med=vs[Math.floor(M/2)];
      // fuller bandwidth = the classic rounded violin belly, not a spindle
      const bw=Math.max(.9,G[g][2]*.72);
      // pad past the data by 1.6 bandwidths so the density decays to ~0 and the
      // ends taper naturally — clipping tighter gives flat-cut lantern ends
      const lo=Math.max(0,vs[0]-bw*1.6),hi=Math.min(HMAX,vs[M-1]+bw*1.6);
      const NPTS=44;
      const grid=Array.from({length:NPTS},(_,k)=>lo+k/(NPTS-1)*(hi-lo));
      const dens=grid.map(h=>vs.reduce((a,v)=>a+Math.exp(-((h-v)**2)/(2*bw*bw)),0));
      const dmax=Math.max(...dens);
      const W=30;
      const x=colX(g);
      // smooth closed outline through the mirrored density — quadratic
      // midpoint smoothing, same trick as almanac's blob
      const pts=[];
      grid.forEach((h,k)=>pts.push([x+dens[k]/dmax*W,mapY(h)]));
      for(let k=NPTS-1;k>=0;k--)pts.push([x-dens[k]/dmax*W,mapY(grid[k])]);
      let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let t=0;t<pts.length;t++){
        const p=pts[t],q=pts[(t+1)%pts.length];
        d+=` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;
      }
      const body=el(s,'path',{d:d+' Z',fill:SHADE[g],class:'fade',style:`animation-delay:${g*.14}s`});
      tip(body,`${name} — median ${med.toFixed(1)}h to first reply`);
      // median: paper tick across the body, value parked right
      const mk=Math.round((med-lo)/(hi-lo)*(NPTS-1));
      const wAtMed=dens[Math.max(0,Math.min(NPTS-1,mk))]/dmax*W;
      el(s,'line',{x1:x-wAtMed,y1:mapY(med),x2:x+wAtMed,y2:mapY(med),
        stroke:PAPER,'stroke-width':2.2,class:'fade',style:`animation-delay:${.5+g*.14}s`});
      txt(s,{x:x+W+5,y:mapY(med)+3,'font-size':9.5,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.6+g*.14}s`},med.toFixed(1)+'h');
      txt(s,{x,y:BASE+18,'font-size':7.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${g*.14}s`},name);
    });
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'WIDTH = HOW MANY TICKETS WAIT THAT LONG · PAPER TICK = MEDIAN · DARKEST = FASTEST');
  });
  })();

  // ════ G20 · matrix heat ════
  //  Glance 3
  //  P1 Lupi
  (()=>{
  const FEAT=['EDITOR','BOARDS','DOCS','CHAT','FLOWS','VAULT'];
  const VER=['v2.0','v1.9','v1.8','v1.7','v1.6'];
  const BASEV=[88,74,61,42,35,27];
  const v=(r,c)=>Math.max(2,Math.round(BASEV[c]-r*(6+c*.8)+(rnd(r*6+c+1,c+3)-.5)*10));
  const shade=t=>t>64?INK:t>46?'#4A4944':t>30?'#8F8E88':t>15?'#B0AFA9':'#D8D7D1';
  obsReveal('gheat',s=>{
    const X0=92,Y0=58,PX=48,PY=42,W=42,H=36;
    FEAT.forEach((f,c)=>{
      txt(s,{x:X0+c*PX+W/2,y:Y0-12,'font-size':6.5,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.04em',class:'fade',style:`animation-delay:${c*.04}s`},f);
    });
    VER.forEach((ver,r)=>{
      txt(s,{x:X0-10,y:Y0+r*PY+H/2+3,'font-size':8.5,'font-weight':700,fill:'#6A6963','text-anchor':'end',
        class:'fade',style:`animation-delay:${r*.05}s`},ver);
      FEAT.forEach((f,c)=>{
        const t=v(r,c),x=X0+c*PX,y=Y0+r*PY,dark=t>46;
        const cell=el(s,'rect',{x,y,width:W,height:H,rx:9,fill:shade(t),
          class:'pop',style:`animation-delay:${(r*6+c)*.022}s`});
        tip(cell,`${f} on ${ver} — ${t}% of accounts`);
        txt(s,{x:x+W/2,y:y+H/2+4,'font-size':10.5,'font-weight':800,fill:dark?PAPER:INK,'text-anchor':'middle',
          class:'fade',style:`animation-delay:${.15+(r*6+c)*.022}s`},t);
      });
    });
    txt(s,{x:200,y:300,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
      'SHADE = ADOPTION · NEWER VERSIONS RUN DARKER');
  });
  })();

  // ════ G21 · rank strip ════
  //  bump—— X
  //  slope catalog
  //  = #1
  (()=>{
  const RANKS=[['Flows',[5,3,2,1,1,1]],['Editor',[1,1,1,2,2,2]],['Boards',[2,2,3,3,3,4]],
    ['Vault',[4,5,5,4,4,3]],['Docs',[3,4,4,5,5,5]]];
  const SHADE=[INK,'#4A4944','#8F8E88','#B0AFA9','#D8D7D1'];   // rank 1 → 5
  obsReveal('rankstrip',s=>{
    // rows sorted by final rank, the climber lands on top
    const rows=[...RANKS].sort((a,b)=>a[1][5]-b[1][5]);
    const X0=110,PX=38,Y0=64,PY=42,C=32;
    ['Q1','Q2','Q3','Q4','Q5','Q6'].forEach((q,k)=>
      txt(s,{x:X0+k*PX+C/2,y:Y0-12,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${k*.04}s`},q));
    rows.forEach(([p,rk],i)=>{
      const y=Y0+i*PY,hero=p==='Flows';
      txt(s,{x:X0-12,y:y+C/2+3,'font-size':8.5,'font-weight':hero?800:600,fill:hero?INK:'#6A6963','text-anchor':'end',
        class:'fade',style:`animation-delay:${i*.07}s`},p);
      rk.forEach((r,q)=>{
        const dark=r<=2;
        const cell=el(s,'rect',{x:X0+q*PX,y,width:C,height:C,rx:8,fill:SHADE[r-1],
          stroke:'#CFCEC7','stroke-width':.5,
          class:'pop',style:`animation-delay:${i*.07+q*.035}s`});
        tip(cell,`${p} — #${r} in Q${q+1}`);
        txt(s,{x:X0+q*PX+C/2,y:y+C/2+3.5,'font-size':9.5,'font-weight':800,
          fill:dark?PAPER:'#55544E','text-anchor':'middle',
          class:'fade',style:`animation-delay:${.1+i*.07+q*.035}s`},r);
      });
      // arrival flag: climbed / fell / held, told at the row's end
      const d=rk[0]-rk[5];
      txt(s,{x:X0+6*PX+8,y:y+C/2+3,'font-size':8,'font-weight':800,
        fill:d>0?INK:d<0?'#B0AFA9':'#C6C5BF',
        class:'fade',style:`animation-delay:${.5+i*.07}s`},
        d>0?'▲'+d:d<0?'▼'+(-d):'—');
    });
    txt(s,{x:200,y:308,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'CELL = RANK THAT QUARTER · #1 WEARS BLACK · READ EACH ROW LIKE A FILMSTRIP');
  });
  })();

  // ════ G22 · aggregate sankey ════
  // B3 Threads ——
  //  .5  convergence
  (()=>{
  const SRC=[['SEARCH',[20,10,4]],['REFERRAL',[12,9,6]],['SOCIAL',[12,4,2]],['PAID',[6,3,3]],['OTHER',[5,2,2]]];
  const DST=['FREE','PRO','TEAM'];
  const SH=[INK,'#4A4944','#8F8E88','#B0AFA9','#C6C5BF'];
  obsReveal('sankey',s=>{
    const XL=104,XR=298,Y0=34,SC=1.9,GAPL=8,GAPR=22,MID=(XL+XR)/2;
    const srcTot=SRC.map(d=>d[1].reduce((a,b)=>a+b,0));
    const dstTot=DST.map((_,j)=>SRC.reduce((a,d)=>a+d[1][j],0));
    const sy=[],dy=[];
    let y=Y0;srcTot.forEach((t,i)=>{sy[i]=y;y+=t*SC+GAPL});
    y=Y0+2;dstTot.forEach((t,j)=>{dy[j]=y;y+=t*SC+GAPR});
    const syc=[...sy],dyc=[...dy];
    SRC.forEach((d,i)=>{
      d[1].forEach((v,j)=>{
        if(!v)return;
        const sa=syc[i],sb=sa+v*SC,da=dyc[j],db=da+v*SC;
        syc[i]=sb;dyc[j]=db;
        const rib=el(s,'path',{d:`M${XL} ${sa} C${MID} ${sa} ${MID} ${da} ${XR} ${da} L${XR} ${db} C${MID} ${db} ${MID} ${sb} ${XL} ${sb} Z`,
          fill:SH[i],opacity:.5,class:'fade',style:`animation-delay:${.2+(i*3+j)*.06}s`});
        tip(rib,`${SRC[i][0]} → ${DST[j]} — ${v} accounts of 100`);
      });
    });
    SRC.forEach((d,i)=>{
      el(s,'rect',{x:XL-9,y:sy[i],width:9,height:srcTot[i]*SC,rx:4,fill:SH[i],
        class:'fade',style:`animation-delay:${i*.06}s`});
      txt(s,{x:XL-16,y:sy[i]+srcTot[i]*SC/2+2.5,'font-size':7.5,'font-weight':700,fill:'#4A4944','text-anchor':'end',
        'letter-spacing':'.05em',class:'fade',style:`animation-delay:${i*.06}s`},`${d[0]} · ${srcTot[i]}`);
    });
    DST.forEach((n,j)=>{
      el(s,'rect',{x:XR,y:dy[j],width:9,height:dstTot[j]*SC,rx:4,fill:'#3A3934',
        class:'fade',style:`animation-delay:${.1+j*.06}s`});
      txt(s,{x:XR+16,y:dy[j]+dstTot[j]*SC/2-3,'font-size':7.5,'font-weight':700,fill:'#4A4944',
        'letter-spacing':'.05em',class:'fade',style:`animation-delay:${.15+j*.06}s`},n);
      txt(s,{x:XR+16,y:dy[j]+dstTot[j]*SC/2+9,'font-size':10,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.2+j*.06}s`},dstTot[j]);
    });
    txt(s,{x:200,y:302,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'RIBBON WIDTH = ACCOUNTS OF 100 · SHADE = CHANNEL');
  });
  })();
  })();
}
