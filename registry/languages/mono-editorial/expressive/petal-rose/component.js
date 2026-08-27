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

  // ════ mono-demo · 2: petal rose ════
  (()=>{
  const EMO=[
    ['Happiness',12],['Awe',10],['Admiration',5],['Surprise',12],
    ['Sadness',6],['Fear',4],['Anger',2],['Anticipation',5],
  ];
  const MAXV=12;
  // Darkest carries the most, the way every other chart in the language reads.
  const petal=v=>{const t=v/MAXV;return t>.8?'#1C1C1A':t>.6?'#4A4944':t>.35?'#8F8E88':'#C6C5BF'};
  eReveal('rose',{
    animationDuration:1100,animationEasing:'quarticOut',
    tooltip:{...tipLight,formatter:p=>p.name+' — '+EMO[p.dataIndex][1]},
    series:[
      {type:'pie',silent:false,radius:['14%','92%'],center:['50%','50%'],
       itemStyle:{color:'#E4E3DD',borderRadius:16,borderColor:PAPER,borderWidth:5},
       label:{show:false},emphasis:{scale:false},
       data:EMO.map(([n])=>({name:n,value:1})),z:1},
      {type:'pie',silent:true,radius:['14%','92%'],center:['50%','50%'],
       itemStyle:{color:'transparent'},label:{position:'inside'},
       data:EMO.map(([n,v])=>({name:n,value:1,
         label:{formatter:`{n|${v}}\n{l|${n}}`,rich:{
           // A long petal reaches under its own label, so the text knocks out
           // of the ink; a short one leaves the label on the pale backdrop.
           n:{fontSize:17,fontWeight:700,fontFamily:'Inter',lineHeight:20,color:v>=8?PAPER:INK},
           l:{fontSize:9.5,fontFamily:'Inter',color:v>=8?'#C6C5BF':'#8F8E88'},
         }}})),z:3},
      {type:'pie',roseType:'area',silent:true,radius:['14%','88%'],center:['50%','50%'],
       itemStyle:{borderRadius:14,borderColor:PAPER,borderWidth:5},label:{show:false},
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
