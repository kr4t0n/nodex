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

  // ════ mono-fancy · 4: rainfall dual area ════
  (()=>{
  const days=Array.from({length:30},(_,i)=>i+1);
  const flow=[42,45,44,48,52,55,53,58,64,62,66,71,69,75,82,79,84,80,86,92,88,95,91,97,104,101,108,105,112,118];
  const rain=[2,0,4,8,3,0,6,12,7,3,9,15,6,2,11,5,8,14,4,9,6,13,3,7,10,5,12,8,15,6];
  eReveal('rainfall',{
    animationDuration:1200,animationEasing:'quarticOut',
    tooltip:{...tipLight,trigger:'axis',
      formatter:p=>`Day ${p[0].axisValue} — spend $${rain[p[0].dataIndex]}K · ${p[0].value} sign-ups`},
    axisPointer:{link:[{xAxisIndex:'all'}],lineStyle:{color:'#B0AFA9'}},
    grid:[
      {left:44,right:14,top:8,height:'26%'},
      {left:44,right:14,top:'42%',bottom:26},
    ],
    xAxis:[
      {gridIndex:0,type:'category',data:days,axisLine:{show:false},axisTick:{show:false},axisLabel:{show:false},position:'bottom'},
      {gridIndex:1,type:'category',data:days,axisLine:{show:false},axisTick:{show:false},
       axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9.5,interval:6,formatter:v=>'D'+v}},
    ],
    yAxis:[
      {gridIndex:0,inverse:true,max:18,splitLine:{show:false},
       axisLabel:{color:'#B0AFA9',fontFamily:'Inter',fontSize:9,formatter:'${value}K'},
       axisLine:{show:false},axisTick:{show:false}},
      {gridIndex:1,splitLine:{lineStyle:{color:'#DEDDD6'}},
       axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9.5},
       axisLine:{show:false},axisTick:{show:false}},
    ],
    series:[
      {name:'spend',type:'bar',xAxisIndex:0,yAxisIndex:0,data:rain,
       itemStyle:{color:'#B0AFA9',borderRadius:[0,0,4,4]},barWidth:'55%'},
      {name:'sign-ups',type:'line',xAxisIndex:1,yAxisIndex:1,data:flow,
       smooth:.4,symbol:'none',lineStyle:{color:INK,width:2.2},
       areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
         colorStops:[{offset:0,color:'rgba(28,28,26,.22)'},{offset:1,color:'rgba(28,28,26,0)'}]}}},
    ],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
