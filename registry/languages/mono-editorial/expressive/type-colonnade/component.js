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

  // ════ 8 · type colonnade ════
  (()=>{
  const PRE=['core','ui','api','data','auth','sync','mail','flag','edge','doc','bot'];
  const SUF=['-kit','-svc','-web','-cli','-db','-gw','-sdk','-jobs'];
  const TEAM=['PLATFORM','FRONTEND','BACKEND','DATA','INFRA','MOBILE','SECURITY','GROWTH','ML','DESIGN'];
  obsReveal('colonnade',s=>{
    const N=44;
    const teamY=j=>36+j*28,repoY=i=>16+i*6.7;
    const counts=Array(10).fill(0);
    const owner=i=>{const w=rnd(i+1,17);return Math.min(9,Math.floor(w*w*10))}; // skewed: low teams hoard
    for(let i=0;i<N;i++)counts[owner(i)]++;
    for(let i=0;i<N;i++){
      const name=PRE[i%11]+SUF[Math.floor(rnd(i+1,8)*8)%8]+(i>21?'-v2':'');
      const yi=repoY(i),j=owner(i),yj=teamY(j);
      txt(s,{x:112,y:yi+2,'font-size':5,fill:'#8F8E88','text-anchor':'end',
        class:'fade',style:`animation-delay:${i*.012}s`},name);
      el(s,'rect',{x:117,y:yi-1.2,width:4,height:2.4,fill:'#B0AFA9',
        class:'fade',style:`animation-delay:${i*.012}s`});
      el(s,'path',{d:`M123 ${yi} C 200 ${yi} 220 ${yj} 288 ${yj}`,fill:'none',
        stroke:'#A8A7A0','stroke-width':.6,opacity:.6,pathLength:1,
        class:'draw',style:`animation-delay:${.2+i*.015}s;animation-duration:.7s`});
    }
    TEAM.forEach((t,j)=>{
      const y=teamY(j);
      el(s,'circle',{cx:293,cy:y,r:2.6+counts[j]*.55,fill:counts[j]>=7?INK:counts[j]>=4?'#6A6963':'#B0AFA9',
        class:'pop',style:`animation-delay:${.6+j*.05}s`});
      const lab=txt(s,{x:302+counts[j]*.55,y:y+2.5,'font-size':7,'font-weight':700,fill:'#4A4944',
        class:'fade',style:`animation-delay:${.65+j*.05}s`},`${t} · ${counts[j]}`);
      tip(lab,`${t} owns ${counts[j]} repos`);
    });
  });
  })();
}
