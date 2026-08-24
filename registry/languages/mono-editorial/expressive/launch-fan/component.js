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

  // ════ 1 · launch fan ════
  // spokes sorted by launch week → the big dots cascade along a diagonal arc
  (()=>{
  const FEAT=['Editor','Boards','Docs','Chat','Flows','Vault','Pages','Sync','Grid','Views','Hub','Forms'];
  const LAUNCH=[1,3,4,6,8,9,11,12,14,16,17,19];     // week of launch
  const CX=40,CY=304,rOf=w=>56+w*9.7;
  obsReveal('fan',s=>{
    const ang=i=>-84+i*(76/11);
    // dotted week guides
    [5,10,15,20].forEach((w,gi)=>{
      const r=rOf(w),[x1,y1]=pol(CX,CY,r,-84),[x2,y2]=pol(CX,CY,r,-8);
      el(s,'path',{d:`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`,fill:'none',
        stroke:'#D8D6CE','stroke-width':1,'stroke-dasharray':'2 5',
        class:'fade',style:`animation-delay:${gi*.1}s`});
      const [lx,ly]=pol(CX,CY,r,-87.5);
      txt(s,{x:lx,y:ly,'font-size':6.5,fill:'#B0AFA9','text-anchor':'middle',
        class:'fade',style:`animation-delay:${gi*.1}s`},'W'+w);
    });
    FEAT.forEach((name,i)=>{
      const a=ang(i),L=LAUNCH[i];
      const mau=Math.round(48-i*3+rnd(i+1,3)*10);
      // hairline spoke from launch to rim
      const [sx,sy]=pol(CX,CY,rOf(L),a),[ex,ey]=pol(CX,CY,rOf(20),a);
      el(s,'line',{x1:sx,y1:sy,x2:ex,y2:ey,stroke:'#E3E2DB','stroke-width':.7,
        class:'fade',style:`animation-delay:${.15+i*.05}s`});
      // weekly texture dots
      for(let w=L+1;w<=20;w++){
        const [x,y]=pol(CX,CY,rOf(w),a);
        el(s,'circle',{cx:x,cy:y,r:1.1+rnd(i+1,w)*1.2,fill:'#B0AFA9',opacity:.8,
          class:'pop',style:`animation-delay:${.2+i*.06+(w-L)*.015}s`});
      }
      // launch dot, sized by MAU
      const [bx,by]=pol(CX,CY,rOf(L),a);
      const big=el(s,'circle',{cx:bx,cy:by,r:Math.sqrt(mau)*1.15,fill:INK,
        class:'pop',style:`animation-delay:${.15+i*.07}s`});
      tip(big,`${name} — launched W${L} · ${mau}k MAU`);
      // rim label along the spoke
      const [tx,ty]=pol(CX,CY,rOf(20)+9,a);
      txt(s,{x:tx,y:ty,'font-size':7,'font-weight':600,fill:'#6A6963',
        transform:`rotate(${a} ${tx} ${ty})`,'dominant-baseline':'middle',
        class:'fade',style:`animation-delay:${.3+i*.05}s`},name);
    });
  });
  })();
}
