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

  const tipDark={backgroundColor:PAPER,borderWidth:0,textStyle:{color:INK,fontFamily:'Inter',fontSize:12},padding:[10,14]};

  // ════ mono-demo · 2: petal rose on dark ════
  (()=>{
  const EMO=[
    ['Happiness',12],['Awe',10],['Admiration',5],['Surprise',12],
    ['Sadness',6],['Fear',4],['Anger',2],['Anticipation',5],
  ];
  const MAXV=12;
  const petal=v=>{const t=v/MAXV;return t>.8?'#F2F1ED':t>.6?'#E4E3DD':t>.35?'#C9C8C1':'#A8A7A0'};
  eReveal('rose',{
    animationDuration:1100,animationEasing:'quarticOut',
    tooltip:{...tipDark,formatter:p=>p.name+' — '+EMO[p.dataIndex][1]},
    series:[
      {type:'pie',silent:false,radius:['14%','92%'],center:['50%','50%'],
       itemStyle:{color:'#32312D',borderRadius:16,borderColor:'#1C1C1A',borderWidth:5},
       label:{show:false},emphasis:{scale:false},
       data:EMO.map(([n])=>({name:n,value:1})),z:1},
      {type:'pie',silent:true,radius:['14%','92%'],center:['50%','50%'],
       itemStyle:{color:'transparent'},label:{position:'inside'},
       data:EMO.map(([n,v])=>({name:n,value:1,
         label:{formatter:`{n|${v}}\n{l|${n}}`,rich:{
           n:{fontSize:17,fontWeight:700,fontFamily:'Inter',lineHeight:20,color:v>=8?'#1C1C1A':'#C8C7C1'},
           l:{fontSize:9.5,fontFamily:'Inter',color:v>=8?'#55554F':'#8F8E88'},
         }}})),z:3},
      {type:'pie',roseType:'area',silent:true,radius:['14%','88%'],center:['50%','50%'],
       itemStyle:{borderRadius:14,borderColor:'#1C1C1A',borderWidth:5},label:{show:false},
       data:EMO.map(([n,v])=>({name:n,value:v,itemStyle:{color:petal(v)}})),z:2},
    ],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
