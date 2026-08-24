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

  // ════ 3 · bubble almanac ════
  // the vintage-almanac feel lives in three things: ledger-paper hairlines
  // under everything, bubbles big enough to collide, and marginalia. do all three.
  (()=>{
  const AREAS=['EDITOR','BOARDS','DOCS','CHAT','FLOWS','VAULT','PAGES','SYNC','GRID','VIEWS','HUB','FORMS'];
  const BETA={GRID:2023,VIEWS:2024,HUB:2025,FORMS:2025};   // beta until this year
  const BORN={EDITOR:2019,BOARDS:2019,DOCS:2019,CHAT:2020,FLOWS:2020,VAULT:2021,PAGES:2021,SYNC:2022,GRID:2022,VIEWS:2023,HUB:2024,FORMS:2024};
  obsReveal('almanac',s=>{
    const rowY=i=>62+i*34,colX=j=>132+j*57;
    // ledger paper: hairlines every 6.8px, edge to edge, under everything
    for(let y=40;y<=318;y+=6.8)
      el(s,'line',{x1:56,y1:y,x2:822,y2:y,stroke:'#E4E3DC','stroke-width':.5,
        class:'fade',style:`animation-delay:${(y-40)*.001}s`});
    const vals=[];
    for(let i=0;i<8;i++){
      const yr=2019+i;
      el(s,'line',{x1:56,y1:rowY(i),x2:822,y2:rowY(i),stroke:'#D3D2CA','stroke-width':.9,
        class:'fade',style:`animation-delay:${i*.04}s`});
      txt(s,{x:48,y:rowY(i)+3,'font-size':9,'font-weight':700,fill:'#8F8E88','text-anchor':'end',
        class:'fade',style:`animation-delay:${i*.04}s`},yr);
      AREAS.forEach((a,j)=>{
        if(yr<BORN[a])return;
        const age=yr-BORN[a];
        // steep spread: quiet areas stay pinpricks, busy ones balloon
        const v=Math.round((2+age*5)*(0.25+rnd(i*12+j+1,j+3)**2*2.2));
        vals.push([Math.max(1,v),i,j,a,yr]);
      });
    }
    // draw small over large so the giants sit underneath as washes
    vals.sort((a,b)=>b[0]-a[0]);
    const top3=vals.slice(0,3);
    // hand-drawn circle: radius wobbles around the rim on two slow sine waves,
    // so every bubble is its own slightly-off print — never a compass circle
    const blob=(x,y,r,seed)=>{
      const n=Math.max(14,Math.round(r*1.6)),pts=[];
      for(let t=0;t<n;t++){
        const a=t/n*Math.PI*2;
        const w=1+.055*Math.sin(a*2+seed*7)+.04*Math.sin(a*3+seed*13)+(rnd(seed+t,3)-.5)*.03;
        pts.push([x+Math.cos(a)*r*w,y+Math.sin(a)*r*w]);
      }
      let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let t=0;t<n;t++){
        const p=pts[t],q=pts[(t+1)%n];
        d+=` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;
      }
      return d+' Z';
    };
    vals.forEach(([v,i,j,a,yr],k)=>{
      const x=colX(j)+(rnd(i*7+j+2,j+9)-.5)*10,  // jitter off the gridline
            y=rowY(i),r=Math.sqrt(v)*3.8;        // big: rows are 34 apart, giants reach ~28 and collide
      const beta=BETA[a]&&yr<=BETA[a];
      const g=el(s,'g',{class:'pop',style:`animation-delay:${.15+k*.012}s`});
      const seed=i*12+j;
      const dot=el(g,'path',beta
        ?{d:blob(x,y,r,seed),fill:'none',stroke:'#8F8E88','stroke-width':1,'stroke-dasharray':'3 3'}
        :{d:blob(x,y,r,seed),fill:INK,'fill-opacity':.09+rnd(i+2,j+4)*.1,
          stroke:INK,'stroke-opacity':.3+rnd(i+5,j+7)*.35,'stroke-width':.6+rnd(i+3,j+11)*.9});
      tip(dot,`${a} · ${yr} — ${v*10} tickets${beta?' (beta)':''}`);
      // escalation core: small wobbly blot, nudged off-center like a press mark
      if(!beta){
        const ox=(rnd(seed+1,17)-.5)*r*.3,oy=(rnd(seed+3,19)-.5)*r*.3;
        el(g,'path',{d:blob(x+ox,y+oy,Math.max(1.4,r*.17),seed+29),fill:INK});
      }
      if(top3.includes(vals[k]))
        txt(s,{x,y:y-r-5,'font-size':8.5,'font-weight':800,fill:INK,'text-anchor':'middle',
          class:'fade',style:'animation-delay:1s'},v*10);
    });
    AREAS.forEach((a,j)=>{
      const x=colX(j);
      txt(s,{x,y:34,'font-size':7.5,'font-weight':700,fill:MUTED,'letter-spacing':'.1em',
        transform:`rotate(-32 ${x} 34)`,class:'fade',style:`animation-delay:${j*.03}s`},a);
    });
    // marginalia: two annotations with pointer hairlines, like the original's notes
    el(s,'path',{d:`M${colX(3)+30} ${rowY(5)-14} C${colX(3)+70} ${rowY(5)-34} ${colX(3)+96} ${rowY(5)-38} ${colX(3)+118} ${rowY(5)-38}`,
      fill:'none',stroke:'#B0AFA9','stroke-width':.7,class:'fade',style:'animation-delay:1.1s'});
    txt(s,{x:colX(3)+124,y:rowY(5)-35,'font-size':7,fill:'#6A6963','font-style':'italic',
      class:'fade',style:'animation-delay:1.1s'},'chat tickets triple after mobile GA');
    el(s,'path',{d:`M${colX(9)+16} ${rowY(2)+8} C${colX(9)+40} ${rowY(2)+26} ${colX(9)+60} ${rowY(2)+30} ${colX(9)+80} ${rowY(2)+30}`,
      fill:'none',stroke:'#B0AFA9','stroke-width':.7,class:'fade',style:'animation-delay:1.2s'});
    txt(s,{x:colX(9)+86,y:rowY(2)+33,'font-size':7,fill:'#6A6963','font-style':'italic',
      class:'fade',style:'animation-delay:1.2s'},'betas barely ticket — nobody files bugs on toys');
    // footer strip: important events, the almanac's timeline shelf
    const evY=356;
    el(s,'line',{x1:56,y1:evY-16,x2:822,y2:evY-16,stroke:'#C6C5BF','stroke-width':.8,
      class:'fade',style:'animation-delay:1.2s'});
    txt(s,{x:56,y:evY-24,'font-size':7,'font-weight':800,fill:'#8F8E88','letter-spacing':'.16em',
      class:'fade',style:'animation-delay:1.2s'},'IMPORTANT EVENTS');
    [['2020','SLA introduced'],['2022','self-serve help center'],['2023','the GA wave'],['2025','AI deflection live']]
    .forEach(([yr,note],k)=>{
      const x=90+k*196;
      el(s,'line',{x1:x,y1:evY-16,x2:x,y2:evY-6,stroke:'#8F8E88','stroke-width':1,
        class:'fade',style:`animation-delay:${1.3+k*.08}s`});
      txt(s,{x,y:evY+4,'font-size':8,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${1.3+k*.08}s`},yr);
      txt(s,{x,y:evY+15,'font-size':7,fill:'#8F8E88',
        class:'fade',style:`animation-delay:${1.3+k*.08}s`},note);
    });
  });
  })();
}
