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

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

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

})();
}
