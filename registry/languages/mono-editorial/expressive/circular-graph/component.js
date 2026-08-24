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

  // ════ mono-fancy · 2: circular graph on dark ════
  (()=>{
  const teams=[
    ['Product',52],['Design',38],['Frontend',46],['Backend',44],
    ['Data',30],['Growth',34],['Support',22],['Ops',18],['Legal',9],['Finance',12],
  ];
  const links=[
    [0,1,9],[0,2,8],[0,3,7],[1,2,9],[2,3,6],[3,4,7],[0,5,6],[5,4,5],
    [5,6,4],[6,2,3],[7,3,4],[7,9,3],[8,9,2],[0,8,2],[4,2,4],[1,5,3],
  ];
  eReveal('circular',{
    animationDuration:1200,animationEasing:'quarticOut',
    tooltip:tipDark,
    series:[{
      type:'graph',layout:'circular',circular:{rotateLabel:false},
      left:52,right:52,top:34,bottom:34,
      data:teams.map(([n,v],i)=>({
        name:n,value:v,symbolSize:v*.62,
        itemStyle:{color:i<4?PAPER:i<8?'#8F8E88':'#4A4944',borderWidth:0},
        label:{show:true,position:'right',distance:7,color:'#B3B0A4',fontFamily:'Inter',fontSize:9.5,fontWeight:600},
      })),
      links:links.map(([s,t,w])=>({
        source:s,target:t,
        lineStyle:{width:w*.7,color:'#4A4840',opacity:.55,curveness:.28},
      })),
      emphasis:{focus:'adjacency',lineStyle:{color:PAPER,opacity:.8}},
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
