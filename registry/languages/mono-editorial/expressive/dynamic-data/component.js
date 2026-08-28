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

  const tipLight={backgroundColor:INK,borderWidth:0,textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},padding:[10,14]};

  const rnd=(i,k)=>((i*73856093)^(k*19349663))%1000/1000;

  (()=>{
  const WIN=50;
  obsReveal('stream',el=>{
    const g=echarts.getInstanceByDom(el)||echarts.init(el);
    g.clear();
    let t=0,v=64;
    const data=[];
    for(;t<WIN;t++){v=Math.max(30,v+(rnd(t+1,7)-.48)*9);data.push(Math.round(v))}
    const draw=()=>g.setOption({
      animation:true,animationDuration:0,animationDurationUpdate:260,animationEasingUpdate:'linear',
      tooltip:{...tipLight,valueFormatter:x=>x+'k users'},
      grid:{left:14,right:58,top:44,bottom:20},
      xAxis:{type:'category',data:data.map((_,i)=>t-WIN+i),boundaryGap:false,
        axisLine:{show:false},axisTick:{show:false},axisLabel:{show:false},splitLine:{show:false}},
      yAxis:{show:false,min:20,max:130},
      series:[{
        type:'line',data:[...data],smooth:.45,symbol:'none',
        lineStyle:{color:INK,width:1.1},
        endLabel:{show:true,fontFamily:'Inter',fontSize:14,fontWeight:800,color:INK,
          formatter:p=>p.value+'k'},
        areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
          colorStops:[{offset:0,color:'rgba(28,28,26,.16)'},{offset:1,color:'rgba(28,28,26,0)'}]}},
      }],
      graphic:[{type:'group',left:16,top:10,children:[
        {type:'circle',shape:{cx:5,cy:5,r:4},style:{fill:'#4A4944'}},
        {type:'text',style:{text:'LIVE',x:16,y:0,font:'800 11px Inter',fill:INK}},
      ]}],
    });
    draw();
    keep('stream',setInterval(()=>{
      v=Math.max(30,Math.min(125,v+(rnd(t+1,7)-.48)*9));
      data.push(Math.round(v));data.shift();t++;
      draw();
    },300));
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
