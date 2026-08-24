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

  // ════ mono-fancy · 1: pictorial bar forest ════
  (()=>{
  const TREE='path://M20,0 L38,28 L29,28 L40,46 L26,46 L26,58 L14,58 L14,46 L0,46 L11,28 L2,28 Z';
  const years=['2022','2023','2024','2025','2026'];
  const vals=[26,41,63,88,117];
  eReveal('forest',{
    animationDuration:900,animationEasing:'quarticOut',animationDelay:i=>i*120,
    tooltip:{...tipLight,formatter:p=>p.name+' — '+vals[p.dataIndex]+'k trees'},
    grid:{left:44,right:56,top:10,bottom:8},
    yAxis:{type:'category',data:years,inverse:true,
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:10.5,fontWeight:700}},
    xAxis:{show:false,max:13},
    series:[{
      type:'pictorialBar',symbol:TREE,
      symbolRepeat:true,symbolSize:[17,24],symbolMargin:3,symbolClip:true,
      data:vals.map((v,i)=>({name:years[i],value:v/10,itemStyle:{color:L[Math.max(0,4-i)]}})),
      label:{show:true,position:'right',offset:[8,0],
        color:INK,fontFamily:'Inter',fontSize:12,fontWeight:700,
        formatter:p=>vals[p.dataIndex]+'k'},
      z:10,
    },{
      type:'pictorialBar',symbol:TREE,
      symbolRepeat:'fixed',symbolSize:[17,24],symbolMargin:3,symbolClip:true,
      itemStyle:{color:'#DEDDD6'},data:years.map(()=>13),silent:true,z:5,
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
