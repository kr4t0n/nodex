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

  // ════ mono-fancy · 3: LR tree ════
  (()=>{
  const b=(name,kids,shade)=>({name,itemStyle:{color:shade},lineStyle:{color:shade},
    children:kids.map(k=>({name:k,itemStyle:{color:shade},lineStyle:{color:shade}}))});
  eReveal('tree',{
    animationDuration:1100,animationEasing:'quarticOut',
    tooltip:tipLight,
    series:[{
      type:'tree',layout:'orthogonal',orient:'LR',
      left:64,right:96,top:8,bottom:8,
      symbol:'circle',symbolSize:7,
      initialTreeDepth:2,expandAndCollapse:false,roam:false,
      itemStyle:{borderWidth:0},
      lineStyle:{width:1.4,curveness:.5},
      label:{fontFamily:'Inter',fontSize:10,fontWeight:600,color:'#6A6963',position:'left'},
      leaves:{label:{position:'right',color:MUTED,fontWeight:500}},
      data:[{
        name:'Platform',itemStyle:{color:INK},lineStyle:{color:'#C6C5BF'},
        label:{fontSize:11.5,color:INK},
        children:[
          b('Editor',['Blocks','Tables','Comments','History'],L[0]),
          b('Automate',['Workflows','Triggers','Webhooks'],L[2]),
          b('Collaborate',['Spaces','Guests','Mentions'],L[3]),
          b('Integrate',['API','Slack','GitHub'],L[4]),
        ],
      }],
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
