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


  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  //  bump—— X
  //  slope catalog
  //  = #1
  (()=>{
  const RANKS=[['Flows',[5,3,2,1,1,1]],['Editor',[1,1,1,2,2,2]],['Boards',[2,2,3,3,3,4]],
    ['Vault',[4,5,5,4,4,3]],['Docs',[3,4,4,5,5,5]]];
  const SHADE=[INK,'#4A4944','#8F8E88','#B0AFA9','#D8D7D1'];   // rank 1 → 5
  obsReveal('rankstrip',s=>{
    // rows sorted by final rank, the climber lands on top
    const rows=[...RANKS].sort((a,b)=>a[1][5]-b[1][5]);
    const X0=110,PX=38,Y0=64,PY=42,C=32;
    ['Q1','Q2','Q3','Q4','Q5','Q6'].forEach((q,k)=>
      txt(s,{x:X0+k*PX+C/2,y:Y0-12,'font-size':7.5,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${k*.04}s`},q));
    rows.forEach(([p,rk],i)=>{
      const y=Y0+i*PY,hero=p==='Flows';
      txt(s,{x:X0-12,y:y+C/2+3,'font-size':8.5,'font-weight':hero?800:600,fill:hero?INK:'#6A6963','text-anchor':'end',
        class:'fade',style:`animation-delay:${i*.07}s`},p);
      rk.forEach((r,q)=>{
        const dark=r<=2;
        const cell=el(s,'rect',{x:X0+q*PX,y,width:C,height:C,rx:8,fill:SHADE[r-1],
          stroke:'#CFCEC7','stroke-width':.5,
          class:'pop',style:`animation-delay:${i*.07+q*.035}s`});
        tip(cell,`${p} — #${r} in Q${q+1}`);
        txt(s,{x:X0+q*PX+C/2,y:y+C/2+3.5,'font-size':9.5,'font-weight':800,
          fill:dark?PAPER:'#55544E','text-anchor':'middle',
          class:'fade',style:`animation-delay:${.1+i*.07+q*.035}s`},r);
      });
      // arrival flag: climbed / fell / held, told at the row's end
      const d=rk[0]-rk[5];
      txt(s,{x:X0+6*PX+8,y:y+C/2+3,'font-size':8,'font-weight':800,
        fill:d>0?INK:d<0?'#B0AFA9':'#C6C5BF',
        class:'fade',style:`animation-delay:${.5+i*.07}s`},
        d>0?'▲'+d:d<0?'▼'+(-d):'—');
    });
    txt(s,{x:200,y:308,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'CELL = RANK THAT QUARTER · #1 WEARS BLACK · READ EACH ROW LIKE A FILMSTRIP');
  });
  })();

})();
}
