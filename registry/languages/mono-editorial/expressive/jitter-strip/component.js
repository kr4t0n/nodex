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

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  (()=>{
  const cats=['P0 CRITICAL','P1 HIGH','P2 NORMAL','P3 LOW'];
  const mkPts=(ci,n,median,spread,outliers)=>{
    const pts=[];
    for(let i=0;i<n;i++){
      const u=rnd(i+1,ci+1), v=rnd(i+7,ci+3);
      let x=median+ (u-.5)*spread*2 + (v>.5?u*spread*.6:0);
      if(i<outliers) x=median+spread*2.2+u*spread*3;
      const jy=ci+ (rnd(i+13,ci+5)-.5)*.58;
      pts.push([Math.max(.2,x),jy]);
    }
    return pts;
  };
  const groups=[
    mkPts(0,38,.8,.5,2),
    mkPts(1,64,2.4,1.1,3),
    mkPts(2,110,6.5,2.4,4),
    mkPts(3,72,14,4.5,3),
  ];
  const flat=groups.flat();
  eReveal('jitter',{
    animationDuration:450,animationEasing:'cubicOut',
    animationDelay:i=>i<flat.length?Math.round(flat[i][1])*260+(i%37)*9:0,
    tooltip:{...tipLight,formatter:p=>cats[Math.round(p.value[1])]+' — '+p.value[0].toFixed(1)+'h to resolve'},
    grid:{left:86,right:16,top:14,bottom:30},
    xAxis:{type:'value',name:'HOURS TO RESOLVE',nameTextStyle:{color:'#C6C5BF',fontSize:8.5},
      splitLine:{lineStyle:{color:'#DEDDD6'}},
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9.5,formatter:v=>v+'h'}},
    yAxis:{type:'value',min:-.6,max:3.6,inverse:true,
      splitLine:{show:false},axisLine:{show:false},axisTick:{show:false},
      axisLabel:{show:false}},
    series:[{
      type:'scatter',
      data:flat,
      symbolSize:7,
      itemStyle:{color:p=>L[Math.round(p.value[1])],opacity:.62},
    },{
      type:'scatter',silent:true,symbolSize:0,
      data:cats.map((c,i)=>({value:[0,i],label:{show:true,position:'left',offset:[-6,0],
        color:'#6A6963',fontFamily:'Inter',fontSize:9,fontWeight:700,formatter:c}})),
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
