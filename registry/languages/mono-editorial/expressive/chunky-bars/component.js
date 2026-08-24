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

  // Ported from Chart.js. The value labels above each bar were a custom
  // afterDatasetsDraw plugin there; ECharts does it with series label.
  eReveal('c3',{
    animationDuration:900,animationEasing:'quarticOut',
    animationDelay:i=>i*110,
    grid:{left:10,right:10,top:48,bottom:28},
    tooltip:{backgroundColor:'#1C1C1A',borderWidth:0,padding:[10,14],
      textStyle:{color:'#F0EFEB',fontFamily:'Inter',fontSize:12},
      formatter:p=>'$'+p.value+'K MRR'},
    xAxis:{type:'category',data:['STARTER','PRO','TEAM','ENT'],
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9,fontWeight:600,
        margin:10,letterSpacing:1}},
    yAxis:{show:false,max:540},
    series:[{type:'bar',barWidth:'52%',
      label:{show:true,position:'top',distance:10,color:'#1C1C1A',
        fontFamily:'Inter',fontSize:13,fontWeight:700,
        formatter:p=>'$'+p.value+'K'},
      data:[
        {value:182,itemStyle:{color:'#C6C5BF',borderRadius:[99,99,0,0]}},
        {value:486,itemStyle:{color:'#1C1C1A',borderRadius:[99,99,0,0]}},
        {value:391,itemStyle:{color:'#8F8E88',borderRadius:[99,99,0,0]}},
        {value:274,itemStyle:{color:'#B0AFA9',borderRadius:[99,99,0,0]}},
      ]}],
  });
}
