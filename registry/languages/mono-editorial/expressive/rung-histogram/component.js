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

  //  Lupi Basics 1  = 1
  //  F1 Rung Bars
  (()=>{
  const BIN=[6,14,22,19,13,9,6,4,3,2,1,1];       // 2h bins, sums to 100
  obsReveal('histo',s=>{
    const X0=44,PW=27.5,base=252,step=5.4,HW=10.5;
    BIN.forEach((v,i)=>{
      const x=X0+i*PW+PW/2;
      for(let k=0;k<v;k++){
        const y=base-k*step,w=HW-1.4+rnd(k+1,i+2)*2.8;
        el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:INK,'stroke-width':1,
          opacity:.55+rnd(k+2,i+4)*.45,class:'fade',style:`animation-delay:${i*.06+k*.012}s`});
        if(k%5===4)el(s,'circle',{cx:x+HW+3.5,cy:y,r:.7,fill:'#C6C5BF',
          class:'fade',style:`animation-delay:${i*.06+k*.012}s`});
      }
    });
    // peak label
    const pk=BIN.indexOf(Math.max(...BIN));
    const px=X0+pk*PW+PW/2;
    const num=txt(s,{x:px,y:base-(BIN[pk]-1)*step-10,'font-size':11,'font-weight':800,fill:INK,
      'text-anchor':'middle',class:'fade',style:'animation-delay:.8s'},BIN[pk]);
    tip(num,`${BIN[pk]} of 100 tickets took ${pk*2}–${pk*2+2}h`);
    // bin edges: the continuous axis is the histogram's identity
    el(s,'line',{x1:X0-4,y1:base+4,x2:X0+12*PW+4,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
    for(let e=0;e<=12;e++){
      const x=X0+e*PW;
      el(s,'line',{x1:x,y1:base+4,x2:x,y2:base+(e%2===0?11:8),stroke:'#CFCEC7','stroke-width':.6,
        class:'fade',style:`animation-delay:${e*.02}s`});
      if(e%2===0)txt(s,{x,y:base+21,'font-size':7,'font-weight':600,fill:MUTED,'text-anchor':'middle',
        class:'fade',style:`animation-delay:${e*.02}s`},e*2+'h');
    }
    // median flag: cumulative crosses 50 inside bin 2
    let acc=0,mb=0;for(let i=0;i<12;i++){acc+=BIN[i];if(acc>=50){mb=i;break}}
    const mx=X0+mb*PW+PW*.7;
    el(s,'line',{x1:mx,y1:base+4,x2:mx,y2:base-BIN[mb]*step-16,stroke:'#8F8E88','stroke-width':.9,
      'stroke-dasharray':'2 4',class:'fade',style:'animation-delay:1s'});
    txt(s,{x:mx+4,y:base-BIN[mb]*step-20,'font-size':7.5,'font-weight':800,fill:'#6A6963',
      class:'fade',style:'animation-delay:1.1s'},'HALF RESOLVED BY HERE');
    txt(s,{x:200,y:306,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.2s'},
      'ONE RUNG = ONE TICKET IN A HUNDRED · BINS OF TWO HOURS · DOT MARKS EVERY FIFTH');
  });
  })();

})();
}
