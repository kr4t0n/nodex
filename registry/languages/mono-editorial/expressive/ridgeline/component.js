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

})();
}
