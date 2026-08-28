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

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  (()=>{
  const P=['Editor','Boards','Docs','Chat','Flows','Vault','Pages','Sync'];
  const YEARS=[2019,2020,2021,2022,2023,2024,2025,2026];
  const vals=[P.map((_,i)=>[42,38,30,26,18,14,10,8][i])];
  for(let y=1;y<YEARS.length;y++)
    vals.push(vals[y-1].map((v,i)=>v*(1.04+rnd(i+1,y+1)*.5)));
  obsReveal('race',el=>{
    const g=echarts.getInstanceByDom(el)||echarts.init(el);
    g.clear();
    let step=0;
    const frame=()=>{
      const row=vals[step];
      const rank=[...row].map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).map(d=>d[1]);
      g.setOption({
        animationDuration:0,animationDurationUpdate:950,animationEasingUpdate:'linear',
        tooltip:{...tipLight,valueFormatter:v=>'$'+Math.round(v)+'K'},
        grid:{left:64,right:64,top:8,bottom:8},
        xAxis:{type:'value',max:'dataMax',
          splitLine:{show:false},axisLine:{show:false},axisTick:{show:false},axisLabel:{show:false}},
        yAxis:{type:'category',data:P,inverse:true,max:7,
          animationDuration:300,animationDurationUpdate:300,
          axisLine:{show:false},axisTick:{show:false},
          axisLabel:{color:'#6A6963',fontFamily:'Inter',fontSize:9.5,fontWeight:600}},
        series:[{
          type:'bar',realtimeSort:true,barCategoryGap:'32%',
          data:row.map((v,i)=>({value:v,
            itemStyle:{color:L[Math.min(5,rank.indexOf(i))],borderRadius:99}})),
          label:{show:true,position:'right',valueAnimation:true,
            fontFamily:'Inter',fontSize:12,fontWeight:800,color:INK,
            formatter:p=>'$'+Math.round(p.value)+'K'},
        }],
        graphic:[{id:'yr',type:'text',right:18,bottom:14,
          style:{text:YEARS[step],font:'800 44px Inter',fill:'#DEDDD6'}}],
      });
      step=(step+1)%YEARS.length;
    };
    frame();
    keep('race',setInterval(frame,1150));
  });
  })();

  addEventListener('resize',()=>{
    ['rose','forest','circular','tree','rainfall','morph','negbar','force','wave',
     'custompie','singleaxis','jitter','race','stream','stroke']
      .forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
