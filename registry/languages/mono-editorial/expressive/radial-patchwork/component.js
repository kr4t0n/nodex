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

  // deterministic
  const D2R=Math.PI/180;

  const pol=(cx,cy,r,deg)=>[cx+r*Math.cos(deg*D2R),cy+r*Math.sin(deg*D2R)];

  const sect=(cx,cy,r0,r1,a0,a1)=>{
    const big=a1-a0>180?1:0;
    const [xa,ya]=pol(cx,cy,r1,a0),[xb,yb]=pol(cx,cy,r1,a1);
    const [xc,yc]=pol(cx,cy,r0,a1),[xd,yd]=pol(cx,cy,r0,a0);
    return `M${xa} ${ya} A${r1} ${r1} 0 ${big} 1 ${xb} ${yb} L${xc} ${yc} A${r0} ${r0} 0 ${big} 0 ${xd} ${yd} Z`;
  };

  (()=>{
  const CX=200,CY=168,N=46;
  obsReveal('patchwork',s=>{
    // 24h rim ticks
    for(let h=0;h<96;h++){
      const a=-90+h*3.75,[x1,y1]=pol(CX,CY,140,a),[x2,y2]=pol(CX,CY,h%4===0?146:143,a);
      el(s,'line',{x1,y1,x2,y2,stroke:'#C6C5BF','stroke-width':h%4===0?1:.5,
        class:'fade',style:`animation-delay:${h*.006}s`});
    }
    [0,6,12,18].forEach(h=>{
      const [x,y]=pol(CX,CY,157,-90+h*15);
      txt(s,{x,y:y+3,'font-size':8,'font-weight':700,fill:MUTED,'text-anchor':'middle',
        class:'fade'},String(h).padStart(2,'0'));
    });
    // the patchwork: translucent wedges pile into ink
    const wedges=[];
    for(let i=0;i<N;i++){
      // deploys cluster around 11h and 16h, thin overnight
      const peak=rnd(i+1,2)>.5?11:16;
      const hour=(peak+(rnd(i+1,3)-.5)*7+24)%24;
      const a0=-90+hour*15,sw=10+rnd(i+1,4)*34;
      const r1=34+rnd(i+1,5)*100;
      wedges.push([a0,sw,r1,hour,i]);
    }
    wedges.forEach(([a0,sw,r1,hour,i])=>{
      const w=el(s,'path',{d:sect(CX,CY,16,r1,a0,a0+sw),fill:INK,
        'fill-opacity':.07+rnd(i+1,6)*.09,class:'fade',
        style:`animation-delay:${.2+i*.022}s`});
      tip(w,`deploy #${i+1} — ${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(hour%1*60)).padStart(2,'0')} · ${Math.round(r1*6)} files`);
    });
    // three outlined wedges: the ones that paged somebody
    [4,17,31].forEach((i,k)=>{
      const [a0,sw,r1]=wedges[i];
      const w=el(s,'path',{d:sect(CX,CY,16,r1,a0,a0+sw),fill:'none',
        stroke:INK,'stroke-width':1.1,class:'fade',style:`animation-delay:${1.2+k*.15}s`});
      tip(w,`deploy #${i+1} — triggered an incident`);
    });
    el(s,'circle',{cx:CX,cy:CY,r:3,fill:INK,class:'pop',style:'animation-delay:1.3s'});
    txt(s,{x:CX,y:308,'font-size':7.5,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.4s'},'OUTLINED = TRIGGERED AN INCIDENT');
  });
  })();
}
