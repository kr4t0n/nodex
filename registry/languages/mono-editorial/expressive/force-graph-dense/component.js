/* Requires ECharts 6 on the page: see meta.json `dependencies`. */

export function mount(root) {
  const q = (name) => root.querySelector(`[data-nx-mount="${name}"]`);


  const INK='#1C1C1A',PAPER='#F0EFEB';
  const rnd=(i,k)=>((i*73856093)^(k*19349663))%1000/1000; // deterministic

  // ── 8 domain hubs, each with a swarm of services; hubs interconnect ──
  const DOMAINS=[
    ['auth',26,'#1C1C1A'],['billing',24,'#33322D'],['content',28,'#4A4944'],
    ['search',20,'#6A6963'],['notify',22,'#7C7A72'],['media',20,'#8F8E88'],
    ['analytics',18,'#9C9A91'],['edge',14,'#B0AFA9'],
  ];
  const nodes=[],links=[];
  DOMAINS.forEach(([dom,count,shade],di)=>{
    // the hub
    nodes.push({name:dom,value:60+Math.round(rnd(di+1,3)*50),hub:true,shade,dom:di});
    // satellites: long-tail sizes, a couple of mid-weights per domain
    for(let i=0;i<count;i++){
      const v=i<3?14+rnd(di+2,i+4)*18:2+rnd(di+5,i+9)*9;
      const name=dom+'-'+String(i+1).padStart(2,'0');
      nodes.push({name,value:Math.round(v),hub:false,shade,dom:di});
      // satellite -> its hub
      links.push({source:name,target:dom,
        lineStyle:{width:.5+v*.05,color:'#C6C5BF',opacity:.5}});
      // occasional satellite-to-satellite shortcut inside the domain
      if(i>1&&rnd(di+3,i+11)<.22){
        links.push({source:name,target:dom+'-'+String(1+Math.floor(rnd(di+4,i+13)*i)).padStart(2,'0'),
          lineStyle:{width:.5,color:'#DEDDD6',opacity:.4}});
      }
    }
  });
  // hub-to-hub backbone: every domain talks to 2-3 others
  const H=DOMAINS.length;
  for(let a=0;a<H;a++)for(let b=a+1;b<H;b++){
    if(rnd(a+7,b+9)<.42){
      links.push({source:DOMAINS[a][0],target:DOMAINS[b][0],
        lineStyle:{width:1.6+rnd(a+2,b+3)*2.2,color:'#B0AFA9',opacity:.65,curveness:.08}});
    }
  }
  // a few cross-domain satellite shortcuts — the messy real-world wires
  for(let k=0;k<26;k++){
    const a=nodes[1+Math.floor(rnd(k+1,17)*(nodes.length-1))];
    const b=nodes[1+Math.floor(rnd(k+3,23)*(nodes.length-1))];
    if(a.name!==b.name&&a.dom!==b.dom&&!a.hub&&!b.hub){
      links.push({source:a.name,target:b.name,
        lineStyle:{width:.5,color:'#E3E2DB',opacity:.38,curveness:.15}});
    }
  }

  const g=echarts.init(q('ch'));
  const opt={
    animationDuration:300,
    tooltip:{backgroundColor:INK,borderWidth:0,
      textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},padding:[10,14],
      formatter:p=>p.dataType==='node'?p.name+' — '+p.value+'k calls/day':''},
    series:[{
      type:'graph',layout:'force',
      force:{repulsion:46,edgeLength:[10,42],gravity:.16,friction:.22,layoutAnimation:true},
      roam:true,draggable:true,
      left:6,right:6,top:6,bottom:6,
      data:nodes.map(n=>({
        name:n.name,value:n.value,
        symbolSize:n.hub?16+Math.sqrt(n.value)*1.6:2.5+Math.sqrt(n.value)*1.5,
        itemStyle:{color:n.shade,borderWidth:n.hub?2:0,borderColor:PAPER},
        label:{show:n.hub,position:'inside',
          color:PAPER,fontFamily:'Inter',fontSize:9.5,fontWeight:800},
      })),
      links,
      emphasis:{
        focus:'adjacency',
        lineStyle:{color:INK,opacity:.9,width:1.4},
        label:{show:true,color:INK,position:'right'},
      },
      blur:{itemStyle:{opacity:.1},lineStyle:{opacity:.03}},
    }],
  };
  const play=()=>{g.clear();g.setOption(opt)};
  play();
  // click on empty canvas replays; clicks on nodes are for dragging
  g.getZr().on('click',e=>{if(!e.target)play()});
  addEventListener('resize',()=>g.resize());

}
