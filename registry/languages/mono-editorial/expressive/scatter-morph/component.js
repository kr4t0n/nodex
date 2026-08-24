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

  // ── shared Mono tokens ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  const tipLight={backgroundColor:INK,borderWidth:0,textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},padding:[10,14]};

  // ════ mono-fancy · 5: universal transition morph ════
  (()=>{
  const P12=[
    ['Editor',12,9.1,486],['Boards',18,8.4,391],['Forms',9,8.8,274],
    ['Docs',15,8.0,318],['Chat',7,7.2,182],['Vault',24,7.8,226],
    ['Flows',21,8.6,352],['Views',11,7.5,198],['Sync',16,6.9,141],
    ['Pages',8,8.2,243],['Grid',19,7.1,167],['Hub',13,6.6,118],
  ];
  const shade=i=>L[Math.min(5,Math.floor(i/2))];
  const axis={splitLine:{lineStyle:{color:'#DEDDD6'}},axisLine:{show:false},axisTick:{show:false},
    axisLabel:{color:MUTED,fontFamily:'Inter',fontSize:9.5}};
  const VIEWS=[
    {opt:{
      grid:{left:38,right:16,top:30,bottom:30},
      xAxis:{...axis,type:'value',min:5,max:26,name:'PRICE $',nameTextStyle:{color:'#C6C5BF',fontSize:8.5}},
      yAxis:{...axis,type:'value',min:6,max:9.6,name:'CSAT',nameTextStyle:{color:'#C6C5BF',fontSize:8.5}},
      series:[{
        id:'p',type:'scatter',universalTransition:true,
        symbolSize:d=>Math.sqrt(d[3])*1.35,
        data:P12.map((d,i)=>({name:d[0],value:[d[1],d[2],d[0],d[3]],
          groupId:d[0],itemStyle:{color:shade(i)}})),
        label:{show:true,position:'top',color:MUTED,fontFamily:'Inter',fontSize:8.5,
          formatter:p=>p.name},
      }],
    }},
    {opt:{
      grid:{left:38,right:16,top:30,bottom:44},
      xAxis:{...axis,type:'category',
        data:[...P12].sort((a,b)=>b[3]-a[3]).map(d=>d[0]),
        axisLabel:{...axis.axisLabel,rotate:38,fontSize:8.5}},
      yAxis:{...axis,type:'value',max:520},
      series:[{
        id:'p',type:'bar',universalTransition:true,
        data:[...P12].sort((a,b)=>b[3]-a[3]).map((d,i)=>({name:d[0],value:d[3],
          groupId:d[0],itemStyle:{color:shade(i),borderRadius:[6,6,0,0]}})),
        barCategoryGap:'32%',
      }],
    }},
    {opt:{
      grid:{left:0,right:0,top:0,bottom:0},
      xAxis:{show:false,type:'value'},yAxis:{show:false,type:'value'},
      series:[{
        id:'p',type:'pie',universalTransition:true,
        radius:['26%','72%'],center:['50%','50%'],
        itemStyle:{borderColor:'#F0EFEB',borderWidth:2,borderRadius:6},
        label:{color:'#6A6963',fontFamily:'Inter',fontSize:9,formatter:'{b}'},
        labelLine:{lineStyle:{color:'#C6C5BF'}},
        data:[...P12].sort((a,b)=>b[3]-a[3]).map((d,i)=>({name:d[0],value:d[3],
          groupId:d[0],itemStyle:{color:shade(i)}})),
      }],
    }},
  ];
  const base={animationDurationUpdate:1100,animationEasingUpdate:'cubicInOut',tooltip:{...tipLight}};
  obsReveal('morph',el=>{
    const g=echarts.getInstanceByDom(el)||echarts.init(el);
    g.clear();
    let vi=0;
    g.setOption({...base,...VIEWS[0].opt});
    keep('morph',setInterval(()=>{
      vi=(vi+1)%VIEWS.length;
      g.setOption({...base,...VIEWS[vi].opt},{replaceMerge:['xAxis','yAxis','series']});
    },3000));
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
