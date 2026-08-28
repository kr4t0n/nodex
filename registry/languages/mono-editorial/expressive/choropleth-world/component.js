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

  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';

  // ECharts registerMap + GeoJSONECharts jsdelivr
  // // registerMap  specialAreas
  //  USA d3 albersUsa
  // Mono piecewise  visualMap
  //  #E4E3DC
  //  DataV GeoAtlas 100000_full
  const MAP_LEGEND={
    itemWidth:11,itemHeight:11,itemSymbol:'rect',
    textStyle:{fontFamily:'Inter',fontSize:9,color:'#8F8E88'},
    inRange:{color:['#D8D7D1','#B0AFA9','#8F8E88','#4A4944','#1C1C1A']},
  };

  //  Mono  boundingCoords
  // ≥39k
  (()=>{
  const D={'United States':95,'India':62,'United Kingdom':48,'Germany':41,'Brazil':39,'Canada':34,
    'France':30,'Australia':28,'China':26,'Japan':26,'Korea':21,'Spain':19,'Italy':17,'Singapore':16,
    'Indonesia':15,'Mexico':14,'Netherlands':13,'Poland':13,'Sweden':12,'Ireland':12,'Philippines':11,
    'Turkey':10,'Vietnam':9,'South Africa':9,'Denmark':9,'Norway':8,'Thailand':8,'Malaysia':8,
    'United Arab Emirates':8,'Argentina':7,'Finland':7,'Nigeria':7,'Chile':6,'Colombia':6,
    'Saudi Arabia':6,'Ukraine':6,'New Zealand':6,'Egypt':5,'Pakistan':5,'Russia':5,'Portugal':5,
    'Greece':4,'Kenya':4,'Peru':4,'Morocco':3,'Iceland':2,'Iran':2,'Kazakhstan':2,'Ethiopia':2,
    'Ghana':2,'Ecuador':2,'Algeria':2,'Mongolia':1,'Libya':1};
  const BIG={'United States':['US 95k',[0,0]],'India':['IN 62k',[0,4]],
    'United Kingdom':['UK 48k',[-26,-12]],'Germany':['DE 41k',[26,14]],'Brazil':['BR 39k',[0,0]]};
  fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
    .then(r=>r.json()).then(geo=>{
      echarts.registerMap('mono-world',geo);
      const opt={
        animationDuration:900,animationEasing:'quarticOut',
        tooltip:{backgroundColor:INK,borderWidth:0,padding:[10,14],
          textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},
          formatter:p=>isNaN(p.value)?p.name+' — not opened yet':p.name+' — '+p.value+'k MAU'},
        visualMap:{type:'piecewise',bottom:2,left:'center',orient:'horizontal',
          pieces:[{max:9,label:'≤9k'},{min:10,max:20,label:'10–20k'},{min:21,max:38,label:'21–38k'},
            {min:39,max:64,label:'39–64k'},{min:65,label:'65k+'}],
          ...MAP_LEGEND},
        series:[{type:'map',map:'mono-world',top:4,bottom:36,
          boundingCoords:[[-170,76],[190,-58]],   // crop antarctica
          itemStyle:{areaColor:'#E4E3DC',borderColor:PAPER,borderWidth:.7},
          emphasis:{label:{show:true,fontFamily:'Inter',fontSize:10,fontWeight:800,color:INK,
            textBorderColor:PAPER,textBorderWidth:3},
            itemStyle:{areaColor:null,borderColor:INK,borderWidth:1.1}},
          select:{disabled:true},
          data:Object.entries(D).map(([n,v])=>({name:n,value:v,
            label:BIG[n]?{show:true,formatter:BIG[n][0],offset:BIG[n][1],fontFamily:'Inter',fontSize:8.5,
              fontWeight:800,color:INK,textBorderColor:PAPER,textBorderWidth:3}:undefined})),
        }],
      };
      obsReveal('mapworld',elDom=>{
        const g=echarts.getInstanceByDom(elDom)||echarts.init(elDom);
        g.clear();g.setOption(opt);
      });
    });
  })();

  addEventListener('resize',()=>{
    ['mapus','mapworld'].forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
