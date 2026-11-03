const express=require('express'),path=require('path'),fs=require('fs'),PptxGenJS=require('pptxgenjs');
const app=express(),PORT=3434,ROOT=__dirname;
app.use('/pres-assets',express.static(path.join(ROOT,'pres-assets')));
app.get('/',(req,res)=>res.sendFile(path.join(ROOT,'presentation.html')));
app.get('/download-pptx',async(req,res)=>{
  try{console.log('Building PPTX...');const buf=await buildPptx();
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition','attachment; filename="CampusCoin-Flandek.pptx"');
    res.send(buf);console.log('Done.');
  }catch(e){console.error(e);res.status(500).send(e.message);}
});
app.listen(PORT,()=>console.log(`\nhttp://localhost:${PORT}\n`));

async function buildPptx(){
  const prs=new PptxGenJS();
  prs.layout='LAYOUT_16x9';prs.title='CampusCoin — Team Flandek';
  const G='1c8f53',GD='0f5c35',GL='edf7f1',GM='c8e6d4',
        TXT='111827',MUT='6b7280',BDR='e5e7eb',BG='f9fafb',W='ffffff',
        GLD='d97706',RED='dc2626';
  const A=f=>path.join(ROOT,'pres-assets',f);
  function img(f){const p=A(f);if(!fs.existsSync(p))return null;const e=path.extname(f).replace('.','').toLowerCase();const m=e==='webp'?'image/webp':e==='png'?'image/png':'image/jpeg';return `data:${m};base64,${fs.readFileSync(p).toString('base64')}`;}
  function bar(s){s.addShape(prs.ShapeType.rect,{x:0,y:0,w:10,h:0.045,fill:{type:'gradient',stops:[{position:0,color:G},{position:100,color:'34d399'}]},line:{type:'none'}});}
  function card(s,x,y,w,h,f=BG,l=BDR,r=0.09){s.addShape(prs.ShapeType.roundRect,{x,y,w,h,fill:{color:f},line:{color:l,pt:1},rectRadius:r});}

  /* SLIDE 1 — TITLE */
  (()=>{
    const s=prs.addSlide();s.background={color:'071a0e'};
    // bg photo right side only, low opacity
    const h1=img('herosld1.png');
    if(h1)s.addImage({data:h1,x:5,y:0,w:5,h:5.63,sizing:{type:'cover'}});
    // fade left
    s.addShape(prs.ShapeType.rect,{x:0,y:0,w:10,h:5.63,fill:{type:'gradient',angle:90,stops:[{position:0,color:'071a0e',transparency:0},{position:50,color:'071a0e',transparency:0},{position:100,color:'071a0e',transparency:65}]},line:{type:'none'}});
    bar(s);
    // green line accent
    s.addShape(prs.ShapeType.rect,{x:0.55,y:0.72,w:0.55,h:0.04,fill:{color:G},line:{type:'none'}});
    // logo
    const ld=img('logo.png');if(ld)s.addImage({data:ld,x:0.55,y:0.85,w:0.8,h:0.8});
    s.addText([{text:'Campus',options:{color:W}},{text:'Coin',options:{color:'4ade80'}}],{x:1.48,y:0.85,w:4,h:0.8,fontSize:52,bold:true,letterSpacing:-1});
    s.addText('STUDENT FINANCE PLATFORM',{x:1.48,y:1.7,w:4,h:0.22,fontSize:7.5,bold:true,color:W,charSpacing:2,transparency:65});
    s.addText('A smart budgeting platform built for students —\nno bank account or credit card required.',{x:0.55,y:2.1,w:4.6,h:0.75,fontSize:14,color:W,lineSpacingMultiple:1.45,transparency:38});
    // chips row 1
    [[' Team Flandek',G,W,G],['Full-Stack Web App','ffffff10',W,'ffffff30'],['8 Currencies','ffffff10',W,'ffffff30']].reduce((cx,c)=>{
      const cw=c[0].length*0.085+0.3;
      s.addShape(prs.ShapeType.roundRect,{x:cx,y:3.02,w:cw,h:0.3,fill:{color:c[1]},line:{color:c[3],pt:1},rectRadius:0.15});
      s.addText(c[0],{x:cx,y:3.02,w:cw,h:0.3,fontSize:9,bold:true,color:c[2],align:'center'});
      return cx+cw+0.1;
    },0.55);
    // chips row 2
    ['AI-Powered','100% Free','No Bank Needed'].reduce((cx,t)=>{
      const cw=t.length*0.082+0.28;
      s.addShape(prs.ShapeType.roundRect,{x:cx,y:3.43,w:cw,h:0.28,fill:{color:'4ade8015'},line:{color:'4ade8040',pt:1},rectRadius:0.14});
      s.addText(t,{x:cx,y:3.43,w:cw,h:0.28,fontSize:9,bold:true,color:'4ade80',align:'center'});
      return cx+cw+0.1;
    },0.55);
    s.addText('"Smart money, Brighter Future."',{x:0.55,y:3.86,w:4.6,h:0.26,fontSize:11,italic:true,color:W,transparency:65});
  })();

  /* SLIDE 2 — PROBLEM + SOLUTION */
  (()=>{
    const s=prs.addSlide();s.background={color:W};bar(s);
    // left dark panel
    const h3=img('herosld3.png');
    if(h3)s.addImage({data:h3,x:0,y:0,w:4.4,h:5.63,sizing:{type:'cover'}});
    s.addShape(prs.ShapeType.rect,{x:0,y:0,w:4.4,h:5.63,fill:{type:'gradient',angle:135,stops:[{position:0,color:'05120a',transparency:0},{position:100,color:'0d4a2a',transparency:12}]},line:{type:'none'}});
    // left text
    s.addText('THE PROBLEM',{x:0.38,y:0.62,w:3.7,h:0.2,fontSize:8,bold:true,color:'4ade80',charSpacing:2});
    s.addText([{text:"Students struggle with money.\n",options:{color:W}},{text:'Every semester.',options:{color:'4ade80'}}],{x:0.38,y:0.84,w:3.7,h:0.9,fontSize:22,bold:true,lineSpacingMultiple:1.15});
    [{t:'No Visibility',d:'Allowances, gigs, scholarships — no single place to track it all.'},{t:'Wrong Tools',d:'Existing apps assume a bank account. Most students have neither.'},{t:'No Guidance',d:'Nobody teaches personal finance. Students overspend and only notice at month-end.'}].forEach((p,i)=>{
      const y=1.88+i*0.72;
      s.addShape(prs.ShapeType.roundRect,{x:0.33,y,w:3.75,h:0.6,fill:{color:'ffffff08'},line:{color:'ffffff18',pt:1},rectRadius:0.07});
      s.addShape(prs.ShapeType.rect,{x:0.33,y,w:0.03,h:0.6,fill:{color:'f87171'},line:{type:'none'}});
      s.addText(p.t,{x:0.5,y:y+0.07,w:3.45,h:0.2,fontSize:11,bold:true,color:W});
      s.addText(p.d,{x:0.5,y:y+0.28,w:3.45,h:0.26,fontSize:9,color:W,transparency:50,lineSpacingMultiple:1.2});
    });
    s.addShape(prs.ShapeType.roundRect,{x:0.33,y:4.1,w:3.75,h:0.48,fill:{color:'f59e0b10'},line:{color:'f59e0b30',pt:1},rectRadius:0.07});
    s.addShape(prs.ShapeType.rect,{x:0.33,y:4.1,w:0.03,h:0.48,fill:{color:'f59e0b'},line:{type:'none'}});
    s.addText('"100% of students handle money. 0% were taught how."',{x:0.5,y:4.13,w:3.45,h:0.4,fontSize:10,italic:true,bold:true,color:'fcd34d',lineSpacingMultiple:1.3});
    // right white panel
    s.addText('OUR ANSWER',{x:4.65,y:0.62,w:5.05,h:0.2,fontSize:8,bold:true,color:G,charSpacing:2});
    s.addText([{text:'Built for campus life.\n',options:{color:TXT}},{text:'No bank needed.',options:{color:G}}],{x:4.65,y:0.84,w:5.05,h:0.9,fontSize:26,bold:true,lineSpacingMultiple:1.15});
    [{n:'01',t:'Track',d:'Log income and expenses with campus-tuned categories — Hostel, Allowance, Data, Transport.'},{n:'02',t:'Plan',d:'Set monthly budgets per category and savings goals with live progress bars and milestone rewards.'},{n:'03',t:'Improve',d:'AI-powered insights and personalised saving tips based on your actual spending history.'}].forEach((p,i)=>{
      const x=4.65+i*1.72;
      card(s,x,1.88,1.62,1.75,GL,GM);
      s.addShape(prs.ShapeType.rect,{x,y:1.88,w:1.62,h:0.035,fill:{color:G},line:{type:'none'}});
      s.addText(p.n,{x,y:1.94,w:1.62,h:0.36,fontSize:24,bold:true,color:GM,align:'center'});
      s.addText(p.t,{x,y:2.3,w:1.62,h:0.24,fontSize:13,bold:true,color:TXT,align:'center'});
      s.addText(p.d,{x:x+0.1,y:2.55,w:1.42,h:0.9,fontSize:9,color:MUT,align:'center',lineSpacingMultiple:1.3});
    });
    ['8 Currencies','No Bank Account','Milestone Rewards','Import from Excel / CSV'].reduce((bx,b)=>{
      const bw=b.length*0.075+0.25;
      s.addShape(prs.ShapeType.roundRect,{x:bx,y:3.76,w:bw,h:0.26,fill:{color:GL},line:{color:GM,pt:1},rectRadius:0.13});
      s.addText(b,{x:bx,y:3.76,w:bw,h:0.26,fontSize:8.5,bold:true,color:G,align:'center'});
      return bx+bw+0.1;
    },4.65);
  })();

  /* SLIDE 3 — FEATURES + AI + TECH */
  (()=>{
    const s=prs.addSlide();s.background={color:'071a0e'};bar(s);
    const dk=img('fthrdrk.png');
    if(dk)s.addImage({data:dk,x:0,y:0,w:10,h:5.63,sizing:{type:'cover'}});
    s.addShape(prs.ShapeType.rect,{x:0,y:0,w:10,h:5.63,fill:{color:'071a0e',transparency:10},line:{type:'none'}});
    s.addShape(prs.ShapeType.rect,{x:4.5,y:0.1,w:0.012,h:5.43,fill:{color:'ffffff',transparency:88},line:{type:'none'}});
    // LEFT
    s.addText('WHAT WE BUILT',{x:0.42,y:0.58,w:3.8,h:0.2,fontSize:7.5,bold:true,color:'4ade80',charSpacing:2});
    s.addText([{text:'10 features. ',options:{color:W}},{text:'All student-first.',options:{color:'4ade80'}}],{x:0.42,y:0.78,w:3.8,h:0.38,fontSize:18,bold:true});
    const feats=[['Dashboard','Balance, income, expenses at a glance'],['Transactions','Add, edit, search, filter, delete, restore'],['Budgets','Monthly limits with live progress bars'],['Reports','6-month trends, heatmap, 5 export formats'],['AI Assistant','Proposes entries — you approve before saving'],['Savings Goals','Target + deadline + milestone badges'],['Recurring','Auto-post daily / weekly / monthly'],['Import & Export','7 formats in — 5 formats out'],['Saving Tips','Personalised from real spending data'],['Notifications','Budget alerts and announcements']];
    const cw2=1.89,ch2=0.66,sx=0.4,sy=1.26,gx=0.07,gy=0.06;
    feats.forEach((f,i)=>{
      const c=i%2,r=Math.floor(i/2),x=sx+c*(cw2+gx),y=sy+r*(ch2+gy);
      s.addShape(prs.ShapeType.roundRect,{x,y,w:cw2,h:ch2,fill:{color:'ffffff',transparency:93},line:{color:'ffffff',transparency:88,pt:1},rectRadius:0.07});
      s.addText(f[0],{x:x+0.12,y:y+0.1,w:cw2-0.22,h:0.2,fontSize:11,bold:true,color:W});
      s.addText(f[1],{x:x+0.12,y:y+0.33,w:cw2-0.22,h:0.26,fontSize:8.5,color:W,transparency:50,lineSpacingMultiple:1.2});
    });
    // RIGHT
    s.addText('AI ASSISTANT',{x:4.72,y:0.58,w:4.98,h:0.2,fontSize:7.5,bold:true,color:'4ade80',charSpacing:2});
    s.addText([{text:'Ask anything. ',options:{color:W}},{text:'It does the work.',options:{color:'4ade80'}}],{x:4.72,y:0.78,w:4.98,h:0.38,fontSize:18,bold:true});
    const ai=img('ai-assistant.webp');
    if(ai){s.addShape(prs.ShapeType.roundRect,{x:4.72,y:1.24,w:4.98,h:2.28,fill:{color:BG},line:{color:BDR,pt:1},rectRadius:0.09});s.addImage({data:ai,x:4.73,y:1.25,w:4.96,h:2.26,sizing:{type:'cover',align:'left',valign:'top'}});}
    s.addShape(prs.ShapeType.roundRect,{x:4.72,y:3.6,w:4.98,h:0.52,fill:{color:G,transparency:82},line:{color:G,transparency:62,pt:1},rectRadius:0.09});
    s.addText('SAFEGUARD',{x:4.87,y:3.63,w:4.68,h:0.18,fontSize:7,bold:true,color:'4ade80',charSpacing:1.5});
    s.addText('The AI never saves anything without your approval. Every change is shown before it is stored.',{x:4.87,y:3.81,w:4.68,h:0.27,fontSize:9,color:W,transparency:38,lineSpacingMultiple:1.2});
    const tcs=[{h:'Frontend',rows:[['React 18 + TypeScript','UI'],['Vite 6 + Tailwind','Build'],['Framer Motion + Recharts','Anim / Charts'],['SheetJS 0.20','Excel / CSV']]},{h:'Backend & Infra',rows:[['Node + Express 5','API'],['MongoDB Atlas','Database'],['JWT + bcrypt','Auth'],['pdfkit + nodemailer','PDF / Email'],['Vercel Serverless','Hosting']]}];
    let tcx=4.72;
    tcs.forEach(sec=>{
      s.addText(sec.h,{x:tcx,y:4.22,w:2.38,h:0.18,fontSize:7.5,bold:true,color:'4ade80',charSpacing:1.5});
      let ry=4.42;
      sec.rows.forEach(([n,d])=>{
        s.addText(n,{x:tcx,y:ry,w:1.7,h:0.2,fontSize:9.5,bold:true,color:W});
        s.addText(d,{x:tcx+1.7,y:ry,w:0.68,h:0.2,fontSize:9,color:W,transparency:60,align:'right'});
        s.addShape(prs.ShapeType.rect,{x:tcx,y:ry+0.2,w:2.38,h:0.006,fill:{color:'ffffff',transparency:88},line:{type:'none'}});
        ry+=0.255;
      });
      tcx+=2.55;
    });
  })();

  /* SLIDE 4 — ADMIN + TESTS + LIMITS */
  (()=>{
    const s=prs.addSlide();s.background={color:BG};bar(s);
    const lg=img('fthrlig.png');
    if(lg)s.addImage({data:lg,x:0,y:0,w:10,h:5.63,sizing:{type:'cover'}});
    s.addShape(prs.ShapeType.rect,{x:0,y:0,w:10,h:5.63,fill:{color:BG,transparency:4},line:{type:'none'}});
    s.addShape(prs.ShapeType.rect,{x:4.12,y:0.1,w:0.012,h:5.43,fill:{color:BDR},line:{type:'none'}});
    s.addShape(prs.ShapeType.rect,{x:7.3,y:0.1,w:0.012,h:5.43,fill:{color:BDR},line:{type:'none'}});

    /* COL A */
    s.addText('ADMIN CONSOLE',{x:0.38,y:0.56,w:3.55,h:0.2,fontSize:7.5,bold:true,color:G,charSpacing:2});
    s.addText([{text:'Full management, ',options:{color:TXT}},{text:'built in.',options:{color:G}}],{x:0.38,y:0.76,w:3.55,h:0.36,fontSize:18,bold:true});
    const rp=img('reports.webp'),bp=img('budgets.webp');
    if(rp){card(s,0.38,1.18,1.72,1.22,W,BDR);s.addImage({data:rp,x:0.39,y:1.19,w:1.7,h:1.2,sizing:{type:'cover',align:'left',valign:'top'}});}
    if(bp){card(s,2.2,1.18,1.72,1.22,W,BDR);s.addImage({data:bp,x:2.21,y:1.19,w:1.7,h:1.2,sizing:{type:'cover',align:'left',valign:'top'}});}
    const adms=[{n:'01',t:'Overview',d:'Platform stats and shortcuts'},{n:'02',t:'Users',d:'Create, suspend, reset, roles'},{n:'03',t:'Announcements',d:'Broadcast messages and tips'},{n:'04',t:'Support',d:'Real-time student chat'},{n:'05',t:'Statistics',d:'Active users, top categories'},{n:'06',t:'System',d:'Email health and backups'},{n:'07',t:'Categories',d:'Default category library'},{n:'NW',t:'New — This Build',d:'Create accounts and route guard',nw:true}];
    const aw=0.87,ah=0.58,agx=0.06,agy=0.05;
    adms.forEach((a,i)=>{const c=i%4,r=Math.floor(i/4),x=0.38+c*(aw+agx),y=2.54+r*(ah+agy);
      s.addShape(prs.ShapeType.roundRect,{x,y,w:aw,h:ah,fill:{color:a.nw?GL:W},line:{color:a.nw?GM:BDR,pt:1},rectRadius:0.07});
      s.addShape(prs.ShapeType.rect,{x,y,w:aw,h:0.02,fill:{color:G},line:{type:'none'}});
      s.addText(a.n,{x:x+0.06,y:y+0.05,w:0.4,h:0.14,fontSize:7.5,bold:true,color:G});
      s.addText(a.t,{x:x+0.06,y:y+0.2,w:aw-0.1,h:0.17,fontSize:10,bold:true,color:a.nw?GD:TXT});
      s.addText(a.d,{x:x+0.06,y:y+0.38,w:aw-0.1,h:0.14,fontSize:8,color:MUT});
    });

    /* COL B */
    s.addText('TEST RESULTS — 1 NOV 2026',{x:4.3,y:0.56,w:2.8,h:0.2,fontSize:7.5,bold:true,color:G,charSpacing:2});
    s.addText([{text:'Live, tested,\n',options:{color:TXT}},{text:'production-ready.',options:{color:G}}],{x:4.3,y:0.76,w:2.8,h:0.55,fontSize:16,bold:true,lineSpacingMultiple:1.2});
    s.addShape(prs.ShapeType.roundRect,{x:4.3,y:1.38,w:2.8,h:0.72,fill:{color:GL},line:{color:GM,pt:1},rectRadius:0.08});
    s.addText('FRONTEND',{x:4.44,y:1.42,w:2.55,h:0.16,fontSize:7,bold:true,color:G,charSpacing:1.5});
    s.addText('campuscointw7.vercel.app',{x:4.44,y:1.58,w:2.55,h:0.2,fontSize:11.5,bold:true,color:GD});
    s.addText('API',{x:4.44,y:1.83,w:2.55,h:0.14,fontSize:7,bold:true,color:G,charSpacing:1.5});
    s.addText('campuscoin-backend.vercel.app/api/v1',{x:4.44,y:1.98,w:2.55,h:0.14,fontSize:8.5,bold:true,color:GD});
    const tests=[['Registration and login',true],['17 student pages',true],['Transactions — full CRUD',true],['Budgets and savings goals',true],['Reports and all exports',true],['AI chat and insights',true],['CSV import',true],['Admin console',true],['Responsive 390px to 1440px',true],['PDF export',null]];
    tests.forEach(([n,p],i)=>{const y=2.22+i*0.3;
      s.addText(n,{x:4.3,y,w:2.28,h:0.24,fontSize:9.5,color:TXT});
      if(p===true)s.addText('Pass',{x:6.6,y,w:0.5,h:0.24,fontSize:9.5,bold:true,color:G,align:'right'});
      if(p===null)s.addText('Fixed',{x:6.55,y,w:0.55,h:0.24,fontSize:9,bold:true,color:GLD,align:'right'});
      s.addShape(prs.ShapeType.rect,{x:4.3,y:y+0.23,w:2.8,h:0.007,fill:{color:BDR},line:{type:'none'}});
    });

    /* COL C */
    s.addText('LIMITATIONS',{x:7.5,y:0.56,w:2.2,h:0.2,fontSize:7.5,bold:true,color:G,charSpacing:2});
    s.addText([{text:"Limitations & ",options:{color:TXT}},{text:"what we'd improve.",options:{color:G}}],{x:7.5,y:0.76,w:2.2,h:0.55,fontSize:14,bold:true,lineSpacingMultiple:1.2});
    const lims=[{t:'No native mobile app',d:'Web is responsive but native iOS/Android would improve on-the-go logging.',f:'Build with React Native and push notifications'},{t:'No offline mode',d:'Students without data cannot log expenses in the moment.',f:'Add service worker and IndexedDB sync — PWA'},{t:'Single-user only',d:'No shared budgets for housemates or groups splitting expenses.',f:'Introduce shared group budgets and expense splitting'},{t:'AI needs third-party APIs',d:'Groq and Gemini are external — degrades when both are down.',f:'Embed a lightweight on-device AI model'}];
    lims.forEach((l,i)=>{const y=1.44+i*1.04;
      s.addShape(prs.ShapeType.rect,{x:7.5,y,w:2.2,h:0.007,fill:{color:BDR},line:{type:'none'}});
      s.addShape(prs.ShapeType.roundRect,{x:7.5,y:y+0.08,w:0.26,h:0.26,fill:{color:'fef2f2'},line:{color:'fecaca',pt:1},rectRadius:0.06});
      s.addText('X',{x:7.5,y:y+0.08,w:0.26,h:0.26,fontSize:9,bold:true,color:RED,align:'center',valign:'middle'});
      s.addText(l.t,{x:7.84,y:y+0.08,w:1.82,h:0.2,fontSize:11,bold:true,color:TXT});
      s.addText(l.d,{x:7.84,y:y+0.3,w:1.82,h:0.3,fontSize:8.5,color:MUT,lineSpacingMultiple:1.2});
      s.addText(l.f,{x:7.84,y:y+0.63,w:1.82,h:0.18,fontSize:9,bold:true,color:G});
    });
    s.addShape(prs.ShapeType.rect,{x:7.5,y:1.44+lims.length*1.04,w:2.2,h:0.007,fill:{color:BDR},line:{type:'none'}});
  })();

  return await prs.write({outputType:'nodebuffer'});
}
