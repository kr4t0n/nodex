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

  // Ported from Chart.js floating bars. ECharts has no native [min,max] bar,
  // so this is two stacked series with the lower one transparent — which also
  // keeps the pill radius on the visible segment only.
  const ranges=[[195,235],[165,192],[150,232],[73,168],[122,202],[182,192],[138,178],
    [162,227],[195,235],[228,305],[218,232],[165,232],[118,210],[195,232]];
  eReveal('c1',{
    animationDuration:800,animationEasing:'quarticOut',
    animationDelay:i=>i*40,
    grid:{left:46,right:14,top:16,bottom:30},
    tooltip:{trigger:'axis',backgroundColor:'#1C1C1A',borderWidth:0,padding:[10,14],
      axisPointer:{type:'none'},
      textStyle:{color:'#F0EFEB',fontFamily:'Inter',fontSize:12},
      formatter:p=>{
        const i=Array.isArray(p)?p[0].dataIndex:p.dataIndex;
        return ranges[i][0]+'K – '+ranges[i][1]+'K users';
      }},
    xAxis:{type:'category',data:ranges.map((_,i)=>i+1),
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9,margin:10,
        formatter:(v,i)=>[0,6,13].includes(i)?(i+1)+' FEB':''}},
    yAxis:{type:'value',min:50,max:320,
      splitLine:{show:false},axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#8F8E88',fontFamily:'Inter',fontSize:9.5,margin:10,
        formatter:v=>v+'K'}},
    series:[
      {type:'bar',stack:'range',silent:true,barWidth:'32%',
        itemStyle:{color:'transparent'},data:ranges.map(r=>r[0])},
      {type:'bar',stack:'range',barWidth:'32%',
        itemStyle:{color:'#1C1C1A',borderRadius:99},
        data:ranges.map(r=>r[1]-r[0])},
    ],
  });
}
