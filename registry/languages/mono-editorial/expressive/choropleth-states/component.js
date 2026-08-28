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

  (()=>{
  const D={'California':96,'New York':78,'Texas':72,'Washington':68,'Massachusetts':66,
    'Florida':54,'Illinois':49,'Colorado':44,'Georgia':41,'Virginia':33,'Pennsylvania':31,
    'North Carolina':30,'New Jersey':28,'Oregon':22,'Ohio':21,'Michigan':19,'Arizona':18,
    'Minnesota':16,'Utah':15,'Maryland':14,'Tennessee':13,'Wisconsin':12,'Missouri':11,
    'Indiana':9,'Nevada':8,'Connecticut':7,'South Carolina':6,'Alabama':5,'Kentucky':5,
    'Oklahoma':4,'Iowa':4,'Kansas':3,'Arkansas':3,'Louisiana':3,'New Hampshire':2,
    'Idaho':2,'New Mexico':2,'Hawaii':2,'Maine':1,'Nebraska':1,'Alaska':1};
  fetch('https://cdn.jsdelivr.net/gh/apache/echarts-examples@gh-pages/public/data/asset/geo/USA.json')
    .then(r=>r.json()).then(geo=>{
      echarts.registerMap('mono-usa',geo,{
        Alaska:{left:-131,top:25,width:15},
        Hawaii:{left:-110,top:28,width:5},
        'Puerto Rico':{left:-76,top:26,width:2},
      });
      const opt={
        animationDuration:900,animationEasing:'quarticOut',
        tooltip:{backgroundColor:INK,borderWidth:0,padding:[10,14],
          textStyle:{color:PAPER,fontFamily:'Inter',fontSize:12},
          formatter:p=>isNaN(p.value)?p.name+' — no data':p.name+' — '+p.value+'k sign-ups'},
        visualMap:{type:'piecewise',bottom:6,left:'center',orient:'horizontal',
          pieces:[{max:9,label:'≤9k'},{min:10,max:20,label:'10–20k'},{min:21,max:38,label:'21–38k'},
            {min:39,max:64,label:'39–64k'},{min:65,label:'65k+'}],
          ...MAP_LEGEND},
        series:[{type:'map',map:'mono-usa',top:10,bottom:48,
          itemStyle:{areaColor:'#E4E3DC',borderColor:PAPER,borderWidth:1},
          emphasis:{label:{show:true,fontFamily:'Inter',fontSize:10,fontWeight:800,color:INK,
            textBorderColor:PAPER,textBorderWidth:3},
            itemStyle:{areaColor:null,borderColor:INK,borderWidth:1.2}},
          select:{disabled:true},
          data:Object.entries(D).map(([n,v])=>({name:n,value:v,
            label:n==='California'?{show:true,formatter:'CA 96k',fontFamily:'Inter',fontSize:9,
              fontWeight:800,color:PAPER,textBorderColor:INK,textBorderWidth:2}:undefined})),
        }],
      };
      obsReveal('mapus',elDom=>{
        const g=echarts.getInstanceByDom(elDom)||echarts.init(elDom);
        g.clear();g.setOption(opt);
      });
    });
  })();

  addEventListener('resize',()=>{
    ['mapus','mapworld'].forEach(id=>echarts.getInstanceByDom(q(id))?.resize());
  });
}
