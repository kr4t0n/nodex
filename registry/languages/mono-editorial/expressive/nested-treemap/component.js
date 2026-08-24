/* Requires ECharts 6 on the page: see meta.json `dependencies`. */

export function mount(root) {
  const q = (name) => root.querySelector(`[data-nx-mount="${name}"]`);

  // ── shared Mono tokens（与 lupi-gallery 同源） ──
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  // ════ C9 · nested treemap ════
  // 面积只编码工时；Mono 不用随机灰阶区分类目，父级靠标题带和组间留白分开。
  (()=>{
  const TOTAL=1280,FILL='#55554F';
  const leaf=(name,value)=>({name,value,itemStyle:{color:FILL},label:{color:PAPER}});
  const DATA=[
    {name:'PRODUCT · 50%',children:[leaf('Core app',260),leaf('Collaboration',190),leaf('Search',110),leaf('Mobile',80)]},
    {name:'PLATFORM · 31%',children:[leaf('AI systems',170),leaf('Data infra',120),leaf('APIs',105)]},
    {name:'GROWTH · 19%',children:[leaf('Acquisition',90),leaf('Retention',80),leaf('Onboarding',75)]},
  ];
  const host=q('treemap');
  let chart;
  const draw=()=>{
    chart=chart||echarts.init(host,null,{renderer:'svg'});
    chart.clear();
    chart.setOption({animationDuration:900,animationEasing:'quarticOut',aria:{enabled:true},
      tooltip:{backgroundColor:PAPER,borderColor:INK,borderWidth:1,textStyle:{color:INK,fontSize:12},
        formatter:i=>`${i.treePathInfo.slice(1).map(d=>d.name.replace(/ · .*$/,'')).join(' / ')}<br><b>${i.value} hours</b> · ${(i.value/TOTAL*100).toFixed(1)}%`},
      series:[{type:'treemap',data:DATA,top:0,right:0,bottom:0,left:0,roam:false,nodeClick:false,
        breadcrumb:{show:false},leafDepth:2,squareRatio:1.2,
        label:{show:true,position:'insideTopLeft',padding:[10,8],color:INK,fontSize:12,fontWeight:700,lineHeight:18,
          formatter:p=>p.treePathInfo.length<=1?'':p.treePathInfo.length===2?p.name:`${p.name}\n${p.value} h`},
        upperLabel:{show:true,height:32,padding:[0,10],color:INK,fontSize:10,fontWeight:700,backgroundColor:PAPER},
        itemStyle:{borderColor:PAPER,borderWidth:2,gapWidth:2},
        emphasis:{focus:'ancestor',itemStyle:{borderColor:INK,borderWidth:1.5}},
        levels:[{itemStyle:{borderWidth:0,gapWidth:5}},
          {upperLabel:{show:true,height:32},itemStyle:{borderColor:PAPER,borderWidth:3,gapWidth:3}},
          {upperLabel:{show:false},itemStyle:{borderColor:PAPER,borderWidth:2,gapWidth:2}}]}]});
  };
  const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){draw();io.disconnect()}},{threshold:.25});
  io.observe(host);
  host.style.cursor='pointer';
  host.addEventListener('click',draw);
  addEventListener('resize',()=>chart?.resize());
  })();
}
