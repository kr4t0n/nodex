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

  const NS='http://www.w3.org/2000/svg';

  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};

  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};

  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};

  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // ════ 15 · ballot tally ════
  // multi-select survey (each option independent, 0–100): every option is a row of
  // 100 hairline ticks — a hundred people standing in line, the ones who picked it inked.
  (()=>{
  const ASK=[['DO MORE WITH THE SAME PAY',51],['AN UNSUSTAINABLE PACE',46],['QUALITY OF WORK SLIPPING',41],['BEING REPLACED OUTRIGHT',22]];
  obsReveal('ballottally',s=>{
    ASK.forEach(([name,v],i)=>{
      const base=78+i*62;
      txt(s,{x:28,y:base-26,'font-size':7.5,'font-weight':700,fill:'#6A6963',
        'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.1}s`},name);
      el(s,'line',{x1:28,y1:base,x2:372,y2:base,stroke:GRID,'stroke-width':.6,
        class:'fade',style:`animation-delay:${i*.1}s`});
      for(let k=0;k<100;k++){
        const x=28+k*3.44,picked=k<v;
        const h=picked?12+rnd(k+1,i+2)*5:4.5+rnd(k+1,i+5)*2;
        el(s,'line',{x1:x,y1:base,x2:x,y2:base-h,
          stroke:picked?INK:'#CFCEC7','stroke-width':picked?.9:.55,
          class:'fade',style:`animation-delay:${i*.1+k*.006}s`});
        if(k%10===0)el(s,'circle',{cx:x,cy:base+4.5,r:.8,fill:'#C6C5BF',
          class:'fade',style:`animation-delay:${i*.1+k*.006}s`});
      }
      const lab=txt(s,{x:28+(v-1)*3.44+9,y:base-11,'font-size':11,'font-weight':800,fill:INK,
        style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.5+i*.1}s`,
        class:'fade'},v);
      tip(lab,`${v} of 100 picked this — they could pick several`);
    });
    txt(s,{x:200,y:314,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},'ONE TICK = ONE RESPONDENT · DOT MARKS EVERY TENTH');
  });
  })();
}
