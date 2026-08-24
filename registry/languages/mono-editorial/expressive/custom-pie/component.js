/* Requires ECharts 6 on the page: see meta.json `dependencies`. */

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

  const eReveal = (name, opt) => obsReveal(name, (node) => {
    const chart = echarts.getInstanceByDom(node) || echarts.init(node);
    chart.clear();
    chart.setOption(opt);
    window.addEventListener('resize', () => chart.resize());
  });

  // ── shared Mono tokens ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  const tipLight={backgroundColor:INK,borderWidth:0,textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},padding:[10,14]};

  // ════ mono-fancy3 · 1: custom double-encoded pie ════
  (()=>{
  const D=[
    ['Editor',34,42],['Boards',22,31],['Docs',18,38],
    ['Chat',12,11],['Automations',8,24],['Other',6,7],
  ];
  const SCALE=45;
  const TAU=Math.PI*2;
  const byShare=[...D].sort((a,b)=>b[1]-a[1]);
  const minsDesc=D.map(d=>d[2]).sort((a,b)=>b-a);
  let acc=0;
  const slices=byShare.map(([n,share,mins])=>{
    const p0=-Math.PI/2+acc/100*TAU, p1=-Math.PI/2+(acc+share)/100*TAU;
    acc+=share;
    return {n,share,mins,p0,p1,color:L[minsDesc.indexOf(mins)]};
  });
  eReveal('custompie',{
    animationDuration:900,animationEasing:'cubicOut',animationDelay:i=>i*130,
    tooltip:{...tipLight,formatter:p=>{
      const s=slices[p.dataIndex];
      return s.n+' — '+s.share+'% of users · '+s.mins+' min/day';
    }},
    xAxis:{show:false,min:-1,max:1},
    yAxis:{show:false,min:-1,max:1},
    grid:{left:0,right:0,top:0,bottom:0},
    series:[{
      type:'custom',
      renderItem:(params,api)=>{
        const s=slices[params.dataIndex];
        const cx=api.getWidth()/2, cy=api.getHeight()/2+6;
        const R=Math.min(api.getWidth(),api.getHeight())*.37;
        const r0=R*.24;
        const rOf=m=>r0+(R-r0)*m/SCALE;
        const pm=(s.p0+s.p1)/2, lr=R+14;
        const cos=Math.cos(pm);
        const kids=[];
        if(params.dataIndex===0){
          [15,30,45].forEach(m=>kids.push({type:'circle',
            shape:{cx,cy,r:rOf(m)},
            style:{fill:'none',stroke:'#D8D6CE',lineWidth:1,lineDash:[3,4]}}));
        }
        kids.push({type:'sector',
          shape:{cx,cy,r0,r:rOf(s.mins),startAngle:s.p0,endAngle:s.p1,clockwise:true,cornerRadius:5},
          style:{fill:s.color,stroke:PAPER,lineWidth:3},
          enterFrom:{shape:{r:r0}}});
        kids.push({type:'text',style:{
          x:cx+cos*lr, y:cy+Math.sin(pm)*lr,
          text:s.n+'  '+s.share+'% · '+s.mins+'m',
          font:'600 10px Inter',fill:'#55544E',
          align:Math.abs(cos)<.25?'center':(cos>0?'left':'right'),
          verticalAlign:'middle'},
          enterFrom:{style:{opacity:0}}});
        return {type:'group',children:kids};
      },
      data:slices.map(s=>s.share),
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
