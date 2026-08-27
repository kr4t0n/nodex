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

  // ════ force graph: the network shakes itself into place ════
  // (replaced the axis-break bar — bars must never lie about length; house rule)
  (()=>{
  const hubs=[['Core API',52,0]];
  const apps=[
    ['Slack',34,1],['GitHub',30,1],['Figma',22,1],['Notion',26,1],
    ['Linear',18,1],['Drive',16,1],['Zoom',10,2],['Jira',14,2],
    ['Sheets',12,2],['Intercom',8,2],['Stripe',20,1],['Segment',9,2],
  ];
  const nodes=[...hubs,...apps];
  const links=[
    ...apps.map((a,i)=>({source:a[0],target:'Core API',
      lineStyle:{width:Math.max(.8,a[1]*.09),color:'#B0AFA9',opacity:.6}})),
    // a few app-to-app side roads
    {source:'Slack',target:'GitHub',lineStyle:{width:1.2,color:'#C6C5BF',opacity:.5}},
    {source:'GitHub',target:'Linear',lineStyle:{width:1.2,color:'#C6C5BF',opacity:.5}},
    {source:'Figma',target:'Notion',lineStyle:{width:1,color:'#C6C5BF',opacity:.5}},
    {source:'Stripe',target:'Sheets',lineStyle:{width:1,color:'#C6C5BF',opacity:.5}},
  ];
  eReveal('force',{
    animationDuration:1200,animationEasing:'quarticOut',
    tooltip:{...tipLight,formatter:p=>p.dataType==='node'?p.name+' — '+p.value+'k syncs/mo':''},
    series:[{
      type:'graph',layout:'force',
      force:{repulsion:220,edgeLength:[36,110],gravity:.12,friction:.18},
      roam:false,draggable:true,
      left:14,right:14,top:14,bottom:14,
      data:nodes.map(([n,v,tier])=>({
        name:n,value:v,symbolSize:8+v*.75,
        itemStyle:{color:tier===0?INK:tier===1?'#6A6963':'#B0AFA9'},
        label:{show:true,position:'right',distance:6,
          color:tier===0?INK:'#8F8E88',fontFamily:'Inter',
          fontSize:tier===0?10.5:9,fontWeight:tier===0?800:600},
      })),
      links,
      emphasis:{focus:'adjacency',lineStyle:{color:INK,opacity:.85}},
    }],
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
