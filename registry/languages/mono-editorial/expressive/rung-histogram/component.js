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

  // ── New chart-family helpers (scoped to the added templates) ──
  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ F14 · rung histogram ════
  // 直方图的 Lupi Basics 皮：连续数值分箱，一箱一把梯子，1 档 = 1 张工单
  // （百分之一）。箱界写在梯脚之间——直方图的箱是区间不是类目，
  // 这是它和 F1 Rung Bars 的本质区别。峰值箱标数，中位数落点小旗标注。
  (()=>{
  const BIN=[6,14,22,19,13,9,6,4,3,2,1,1];       // 2h bins, sums to 100
  obsReveal('histo',s=>{
    const X0=44,PW=27.5,base=252,step=5.4,HW=10.5;
    BIN.forEach((v,i)=>{
      const x=X0+i*PW+PW/2;
      for(let k=0;k<v;k++){
        const y=base-k*step,w=HW-1.4+rnd(k+1,i+2)*2.8;
        el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:INK,'stroke-width':1,
          opacity:.55+rnd(k+2,i+4)*.45,class:'fade',style:`animation-delay:${i*.06+k*.012}s`});
        if(k%5===4)el(s,'circle',{cx:x+HW+3.5,cy:y,r:.7,fill:'#C6C5BF',
          class:'fade',style:`animation-delay:${i*.06+k*.012}s`});
      }
    });
    // peak label
    const pk=BIN.indexOf(Math.max(...BIN));
    const px=X0+pk*PW+PW/2;
    const num=txt(s,{x:px,y:base-(BIN[pk]-1)*step-10,'font-size':11,'font-weight':800,fill:INK,
      'text-anchor':'middle',class:'fade',style:'animation-delay:.8s'},BIN[pk]);
    tip(num,`${BIN[pk]} of 100 tickets took ${pk*2}–${pk*2+2}h`);
    // bin edges: the continuous axis is the histogram's identity
    el(s,'line',{x1:X0-4,y1:base+4,x2:X0+12*PW+4,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let e=0;e<=12;e++){
      const x=X0+e*PW;
      el(s,'line',{x1:x,y1:base+4,x2:x,y2:base+(e%2===0?11:8),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${e*.02}s`});
      if(e%2===0)txt(s,{x,y:base+21,'font-size':7,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${e*.02}s`},e*2+'h');
    }
    // median flag: cumulative crosses 50 inside bin 2
    let acc=0,mb=0;for(let i=0;i<12;i++){acc+=BIN[i];if(acc>=50){mb=i;break}}
    const mx=X0+mb*PW+PW*.7;
    el(s,'line',{x1:mx,y1:base+4,x2:mx,y2:base-BIN[mb]*step-16,stroke:'#8F8E88','stroke-width':.9,
      'stroke-dasharray':'2 4',class:'fade',style:'animation-delay:1s'});
    txt(s,{x:mx+4,y:base-BIN[mb]*step-20,'font-size':7.5,'font-weight':800,fill:'#6A6963',
      class:'fade',style:'animation-delay:1.1s'},'HALF RESOLVED BY HERE');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE RUNG = ONE TICKET IN A HUNDRED · BINS OF TWO HOURS · DOT MARKS EVERY FIFTH');
  });
  })();

  // ════ F15 · tick box ════
  // 箱线图的 Basics 皮：发丝须线 + 胶囊箱体（IQR），纸色横档 = 中位数，
  // 空心点 = 离群值。箱体明度按中位数快慢排：越快越黑。
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

  // ════ F16 · stream ribbon ════
  // Streamgraph / ThemeRiver：多系列构成随时间此消彼长。轮廓对称于中轴
  // （silhouette 基线），带宽 = 该系列当周量，纸色缝分带（treemap 同法）。
  // 三带明度按当前份额排：现任霸主最黑。带名标在各自最宽处。
  (()=>{
  const N=48;
  const mk=(base,trend,w1,w2,seed)=>Array.from({length:N},(_,t)=>
    Math.max(2,base+trend*t+10*Math.sin(t/w1+seed)+5*Math.sin(t/w2+seed*2)+rnd(t+1,seed)*6));
  const SERIES=[
    ['LEGACY EDITOR',mk(46,-.62,9,3.7,2),'#C6C5BF'],
    ['BOARDS',mk(26,.10,11,4.2,5),'#8F8E88'],
    ['FLOWS',mk(12,.78,10,3.1,8),INK],
  ];
  obsReveal('stream',s=>{
    const X0=36,X1=744,CY=138,SC=1.15;
    const x=t=>X0+t/(N-1)*(X1-X0);
    const tot=Array.from({length:N},(_,t)=>SERIES.reduce((a,S)=>a+S[1][t],0));
    // stacked offsets, silhouette baseline: top of stack starts at -total/2
    const y0=Array.from({length:N},(_,t)=>CY-tot[t]*SC/2);
    const smooth=pts=>{
      let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for(let k=1;k<pts.length-1;k++){
        const p=pts[k],q=pts[k+1];
        d+=` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;
      }
      return d+` L${pts[pts.length-1][0].toFixed(1)} ${pts[pts.length-1][1].toFixed(1)}`;
    };
    let run=y0.slice();
    SERIES.forEach(([name,vals,shade],si)=>{
      const top=run.map((v,t)=>[x(t),v]);
      const bot=run.map((v,t)=>[x(t),v+vals[t]*SC]);
      run=bot.map(p=>p[1]);
      const d=smooth(top)+' L '+[...bot].reverse().map(p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')+' Z';
      const band=el(s,'path',{d,fill:shade,stroke:PAPER,'stroke-width':2,
        class:'fade',style:`animation-delay:${si*.16}s`});
      tip(band,`${name} — weekly active accounts, 48 weeks`);
      // label at the band's widest week — clamped off both ends so the
      // paper-colored text never spills past the band onto paper (invisible)
      let wk=4;vals.forEach((v,t)=>{if(t>=4&&t<=N-6&&v>vals[wk])wk=t});
      const midY=(top[wk][1]+bot[wk][1])/2;
      const dark=shade===INK||shade==='#4A4944';
      txt(s,{x:x(wk),y:midY+3,'font-size':9,'font-weight':800,'text-anchor':'middle',
        fill:dark?PAPER:'#4A4944','letter-spacing':'.06em',
        class:'fade',style:`animation-delay:${.5+si*.14}s`},name);
    });
    // month floor: barcode ticks + labels every 8 weeks
    const base=252;
    el(s,'line',{x1:X0-6,y1:base,x2:X1+6,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let t=0;t<N;t++)
      el(s,'line',{x1:x(t),y1:base,x2:x(t),y2:base-(t%8===0?7:4),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${t*.006}s`});
    ['JAN','MAR','MAY','JUL','SEP','NOV'].forEach((m,k)=>
      txt(s,{x:x(k*8),y:base+15,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.1em',class:'fade'},m));
    txt(s,{x:390,y:288,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'BAND WIDTH = WEEKLY ACTIVES · DARKEST = TODAY’S LEADER · THE RIVER IS THE TOTAL');
  });
  })();

  // ════ F17 · candlestick ════
  // K 线的 Mono 化：不用红绿——实心墨 = 收跌，空心（纸底墨框）= 收涨，
  // 和哑铃图 hollow/ink 的语义一脉。影线是发丝，柱体胶囊圆角。
  // OHLC 四值都是真实记录，最高/最低两日标数。30 个交易日。
  (()=>{
  const N=30;
  // deterministic random walk with a dip-and-recover arc
  const DAYS=[];
  let px=52;
  for(let d=0;d<N;d++){
    const drift=d<10?.4:d<18?-1.5:1.3;
    const open=px;
    const close=Math.max(30,open+drift+(rnd(d+1,3)-.5)*4.6);
    const hi=Math.max(open,close)+rnd(d+2,7)*2.6;
    const lo=Math.min(open,close)-rnd(d+3,11)*2.6;
    DAYS.push([open,close,hi,lo]);
    px=close;
  }
  obsReveal('candle',s=>{
    const X0=40,PW=11.2,BASE=258,TOP=44;
    const vmin=Math.min(...DAYS.map(d=>d[3])),vmax=Math.max(...DAYS.map(d=>d[2]));
    const mapY=v=>BASE-(v-vmin)/(vmax-vmin)*(BASE-TOP);
    const x=d=>X0+d*PW+PW/2;
    // price grid
    for(let g=0;g<=4;g++){
      const v=vmin+g/4*(vmax-vmin);
      el(s,'line',{x1:X0-4,y1:mapY(v),x2:X0+N*PW+4,y2:mapY(v),stroke:'#E3E2DB','stroke-width':.8,
        class:'fade',style:`animation-delay:${g*.03}s`});
      txt(s,{x:X0-8,y:mapY(v)+3,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'end',
        class:'fade',style:`animation-delay:${g*.03}s`},'$'+Math.round(v));
    }
    let hiD=0,loD=0;
    DAYS.forEach(([o,c,h,l],d)=>{
      if(h>DAYS[hiD][2])hiD=d;
      if(l<DAYS[loD][3])loD=d;
    });
    DAYS.forEach(([o,c,h,l],d)=>{
      const cx=x(d),up=c>=o;
      const yT=mapY(Math.max(o,c)),yB=mapY(Math.min(o,c));
      // wick: one hairline, full reach
      el(s,'line',{x1:cx,y1:mapY(h),x2:cx,y2:mapY(l),stroke:'#6A6963','stroke-width':.7,
        class:'fade',style:`animation-delay:${d*.03}s`});
      // body: capsule; hollow = up, ink = down
      const body=el(s,'rect',{x:cx-3.4,y:yT,width:6.8,height:Math.max(2.5,yB-yT),rx:3,
        ...(up?{fill:PAPER,stroke:INK,'stroke-width':1.1}:{fill:INK}),
        class:'fade',style:`animation-delay:${.05+d*.03}s`});
      tip(body,`Day ${d+1} — open $${o.toFixed(1)} · close $${c.toFixed(1)} · high $${h.toFixed(1)} · low $${l.toFixed(1)}`);
      // extremes, labeled with hairline flags
      if(d===hiD)txt(s,{x:cx,y:mapY(h)-7,'font-size':8,'font-weight':800,fill:INK,'text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
        class:'fade'},'$'+Math.round(h));
      if(d===loD)txt(s,{x:cx,y:mapY(l)+14,'font-size':8,'font-weight':800,fill:'#6A6963','text-anchor':'middle',
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:1s`,
        class:'fade'},'$'+Math.round(l));
    });
    // week ticks on the floor
    el(s,'line',{x1:X0-4,y1:BASE+8,x2:X0+N*PW+4,y2:BASE+8,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let d=0;d<N;d++)
      el(s,'line',{x1:x(d),y1:BASE+8,x2:x(d),y2:BASE+8-(d%5===0?6:3),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${d*.008}s`});
    ['W1','W2','W3','W4','W5','W6'].forEach((w,k)=>
      txt(s,{x:x(k*5),y:BASE+21,'font-size':7,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade'},w));
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'INK BODY = CLOSED DOWN · HOLLOW = CLOSED UP · WICK = THE DAY’S FULL REACH');
  });
  })();
  })();
}
