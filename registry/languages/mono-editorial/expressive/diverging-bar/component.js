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

  const tipLight={backgroundColor:INK,borderWidth:0,textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},padding:[10,14]};

  // ════ mono-fancy2 · 2: diverging bar ════
  (()=>{
  const D=[
    ['Enterprise',86],['Team',54],['Pro',31],['Starter',12],
    ['Legacy Basic',-18],['Trial expired',-42],['Free dormant',-67],
  ];
  eReveal('negbar',{
    animationDuration:900,animationEasing:'quarticOut',animationDelay:i=>i*80,
    tooltip:{...tipLight,formatter:p=>p.name+' — '+(p.value>0?'+':'')+p.value+' accounts'},
    grid:{left:96,right:52,top:8,bottom:8},
    xAxis:{type:'value',
      splitLine:{lineStyle:{color:'#DEDDD6'}},
      axisLine:{show:false},axisTick:{show:false},axisLabel:{show:false}},
    yAxis:{type:'category',data:D.map(d=>d[0]),inverse:true,
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#6A6963',fontFamily:'Inter',fontSize:9.5,fontWeight:600}},
    series:[{
      type:'bar',barWidth:16,
      data:D.map(([n,v])=>({name:n,value:v,
        itemStyle:{color:v>0?INK:'#B0AFA9',
          borderRadius:v>0?[0,9,9,0]:[9,0,0,9]}})),
      label:{show:true,fontFamily:'Inter',fontSize:11,fontWeight:700,
        position:'outside',
        formatter:p=>(p.value>0?'+':'')+p.value,color:INK},
      markLine:{symbol:'none',silent:true,label:{show:false},
        lineStyle:{color:'#8F8E88',width:1.5},
        data:[{xAxis:0}]},
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
