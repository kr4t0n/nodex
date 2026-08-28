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

  const rnd=(i,k)=>((i*73856093)^(k*19349663))%1000/1000;

  (()=>{
  const days=Array.from({length:180},(_,i)=>i);
  const daily=days.map(i=>14+10*Math.sin(i/29)+i*.12+rnd(i+1,3)*6);
  const cum=[];daily.reduce((a,b,i)=>(cum[i]=a+b,cum[i]),0);
  const TOTAL=cum[cum.length-1];
  const DUR=2600;
  let gen=0; // replay guard: only the latest counter loop may write
  obsReveal('stroke',el=>{
    const g=echarts.getInstanceByDom(el)||echarts.init(el);
    g.clear();
    gen++;const my=gen;
    g.setOption({
      animationDuration:DUR,animationEasing:'cubicOut',
      tooltip:{show:false},
      grid:{left:14,right:20,top:64,bottom:24},
      xAxis:{type:'category',data:days,boundaryGap:false,
        axisLine:{show:false},axisTick:{show:false},splitLine:{show:false},
        axisLabel:{color:'#C6C5BF',fontFamily:'Inter',fontSize:9,fontWeight:600,
          interval:29,formatter:i=>['JAN','FEB','MAR','APR','MAY','JUN'][Math.floor(i/30)]||''}},
      yAxis:{show:false,max:TOTAL*1.06},
      series:[{
        type:'line',data:cum.map(x=>Math.round(x)),smooth:.2,symbol:'none',
        lineStyle:{color:INK,width:1.1},
        areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
          colorStops:[{offset:0,color:'rgba(28,28,26,.14)'},{offset:1,color:'rgba(28,28,26,0)'}]}},
      }],
    });
    const t0=performance.now();
    const tick=()=>{
      if(my!==gen)return;
      const p=Math.min(1,(performance.now()-t0)/DUR);
      const eased=1-Math.pow(1-p,3);
      const val=(TOTAL*eased/1000).toFixed(2);
      g.setOption({graphic:[{id:'kpi',type:'group',left:16,top:8,children:[
        {type:'text',style:{text:'$'+val+'M',font:'800 32px Inter',fill:INK}},
        {type:'text',style:{text:'ARR · H1 2026',y:38,font:'600 10px Inter',fill:'#8F8E88'}},
      ]}]});
      if(p<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
