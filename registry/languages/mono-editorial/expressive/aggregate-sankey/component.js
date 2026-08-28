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

  const L=['#1C1C1A','#4A4944','#6A6963','#8F8E88','#B0AFA9','#C6C5BF'];

  (()=>{
  const INK='#1C1C1A',PAPER='#F0EFEB',MUTED='#8F8E88',GRID='#DEDDD6';
  const NS='http://www.w3.org/2000/svg';
  const el=(p,t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);p.appendChild(n);return n};
  const txt=(p,a,s)=>{const n=el(p,'text',a);n.textContent=s;return n};
  const tip=(n,s)=>{const t=document.createElementNS(NS,'title');t.textContent=s;n.appendChild(t)};
  const rnd=(i,k)=>Math.abs(((i*73856093)^(k*19349663))%1000)/1000;

  // B3 Threads ——
  //  .5  convergence
  (()=>{
  const SRC=[['SEARCH',[20,10,4]],['REFERRAL',[12,9,6]],['SOCIAL',[12,4,2]],['PAID',[6,3,3]],['OTHER',[5,2,2]]];
  const DST=['FREE','PRO','TEAM'];
  const SH=[INK,'#4A4944','#8F8E88','#B0AFA9','#C6C5BF'];
  obsReveal('sankey',s=>{
    const XL=104,XR=298,Y0=34,SC=1.9,GAPL=8,GAPR=22,MID=(XL+XR)/2;
    const srcTot=SRC.map(d=>d[1].reduce((a,b)=>a+b,0));
    const dstTot=DST.map((_,j)=>SRC.reduce((a,d)=>a+d[1][j],0));
    const sy=[],dy=[];
    let y=Y0;srcTot.forEach((t,i)=>{sy[i]=y;y+=t*SC+GAPL});
    y=Y0+2;dstTot.forEach((t,j)=>{dy[j]=y;y+=t*SC+GAPR});
    const syc=[...sy],dyc=[...dy];
    SRC.forEach((d,i)=>{
      d[1].forEach((v,j)=>{
        if(!v)return;
        const sa=syc[i],sb=sa+v*SC,da=dyc[j],db=da+v*SC;
        syc[i]=sb;dyc[j]=db;
        const rib=el(s,'path',{d:`M${XL} ${sa} C${MID} ${sa} ${MID} ${da} ${XR} ${da} L${XR} ${db} C${MID} ${db} ${MID} ${sb} ${XL} ${sb} Z`,
          fill:SH[i],opacity:.5,class:'fade',style:`animation-delay:${.2+(i*3+j)*.06}s`});
        tip(rib,`${SRC[i][0]} → ${DST[j]} — ${v} accounts of 100`);
      });
    });
    SRC.forEach((d,i)=>{
      el(s,'rect',{x:XL-9,y:sy[i],width:9,height:srcTot[i]*SC,rx:4,fill:SH[i],
        class:'fade',style:`animation-delay:${i*.06}s`});
      txt(s,{x:XL-16,y:sy[i]+srcTot[i]*SC/2+2.5,'font-size':7.5,'font-weight':700,fill:'#4A4944','text-anchor':'end',
        'letter-spacing':'.05em',class:'fade',style:`animation-delay:${i*.06}s`},`${d[0]} · ${srcTot[i]}`);
    });
    DST.forEach((n,j)=>{
      el(s,'rect',{x:XR,y:dy[j],width:9,height:dstTot[j]*SC,rx:4,fill:'#3A3934',
        class:'fade',style:`animation-delay:${.1+j*.06}s`});
      txt(s,{x:XR+16,y:dy[j]+dstTot[j]*SC/2-3,'font-size':7.5,'font-weight':700,fill:'#4A4944',
        'letter-spacing':'.05em',class:'fade',style:`animation-delay:${.15+j*.06}s`},n);
      txt(s,{x:XR+16,y:dy[j]+dstTot[j]*SC/2+9,'font-size':10,'font-weight':800,fill:INK,
        class:'fade',style:`animation-delay:${.2+j*.06}s`},dstTot[j]);
    });
    txt(s,{x:200,y:302,'font-size':7,'font-weight':600,fill:'#B0AFA9','text-anchor':'middle',
      'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
      'RIBBON WIDTH = ACCOUNTS OF 100 · SHADE = CHANNEL');
  });
  })();
  })();
}
