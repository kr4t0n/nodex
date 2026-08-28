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
  const days=['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const hours=Array.from({length:24},(_,i)=>i);
  const mkRow=di=>hours.map(h=>{
    const workday=di<5, core=h>=9&&h<=17;
    let v=Math.round((workday&&core?6+5*Math.sin((h-9)/8*Math.PI):0)+((h+di)%5===0?2:0)+(h>=22||h<=5?0:1));
    return [h,v];
  }).filter(d=>d[1]>0);
  eReveal('singleaxis',{
    animationDuration:500,animationEasing:'backOut',
    tooltip:{...tipLight,formatter:p=>days[p.seriesIndex]+' '+String(p.value[0]).padStart(2,'0')+':00 — '+p.value[1]+' tickets'},
    title:days.map((d,i)=>({
      text:d,textBaseline:'middle',top:(i+.5)*100/7-1+'%',left:0,
      textStyle:{fontSize:9,fontWeight:700,fontFamily:'Inter',color:MUTED},
    })),
    singleAxis:days.map((d,i)=>({
      left:52,right:14,type:'category',boundaryGap:false,
      data:hours.map(h=>String(h).padStart(2,'0')),
      top:i*100/7+6+'%',height:100/7-8+'%',
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{show:i===6,color:MUTED,fontFamily:'Inter',fontSize:8.5,interval:3},
      splitLine:{show:false},
    })),
    series:days.map((d,i)=>({
      singleAxisIndex:i,coordinateSystem:'singleAxis',
      type:'scatter',
      data:mkRow(i),
      symbolSize:dd=>dd[1]*2.6,
      itemStyle:{color:i<5?L[Math.min(4,i)]:'#C6C5BF'},
      animationDelay:di=>i*160+di*14,
    })),
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
