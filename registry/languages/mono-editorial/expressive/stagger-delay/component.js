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

  (()=>{
  const n=50;
  const vals=Array.from({length:n},(_,i)=>
    Math.round(30+55*Math.sin(i/7.5)+18*Math.sin(i/2.6)+(i%5)*3+28));
  eReveal('wave',{
    tooltip:{...tipLight,formatter:p=>'Market '+(p.dataIndex+1)+' — '+p.value},
    grid:{left:36,right:10,top:14,bottom:24},
    xAxis:{type:'category',data:vals.map((_,i)=>i+1),
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9,interval:9}},
    yAxis:{type:'value',
      splitLine:{lineStyle:{color:'#DEDDD6'}},
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9.5}},
    series:[{
      type:'bar',barCategoryGap:'26%',
      data:vals.map((v,i)=>({value:v,
        itemStyle:{color:L[Math.min(5,Math.floor((120-v)/16))],borderRadius:[4,4,0,0]}})),
      animationDelay:i=>i*36,
      animationDuration:640,animationEasing:'elasticOut',
    }],
    animationDurationUpdate:640,
    animationDelayUpdate:i=>i*36,
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
