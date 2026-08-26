/* Independent Phase 5.15A raster oracle. No AE/C++ dependencies. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, 'output', 'Phase515AAnimatedNestedTransforms');
const out = path.join(root, 'Phase515A_FullIndependentAnalysis.txt');
const times = [0, 0.5, 1], cases = 'ABCDEFGHIJKL'.split('');
const lerp = (a,b,t) => Array.isArray(a) ? a.map((v,i)=>v+(b[i]-v)*t) : a+(b-a)*t;
const KEY_TIMES = [0, 0.5, 1];
function sampleKeyframes(values, requestedTime) {
  for (let i=0;i<KEY_TIMES.length;i++) {
    if (requestedTime === KEY_TIMES[i]) return values[i];
  }
  for (let i=0;i<KEY_TIMES.length-1;i++) {
    const a=KEY_TIMES[i], b=KEY_TIMES[i+1];
    if (requestedTime > a && requestedTime < b) return lerp(values[i], values[i+1], (requestedTime-a)/(b-a));
  }
  throw new Error(`Unsupported requested time ${requestedTime}`);
}
function temporalSource(c,t) {
  return (c==='K'||c==='L') ? 'EXPRESSION' : (KEY_TIMES.indexOf(t)>=0 ? 'EXPLICIT_KEYFRAME' : 'LINEAR_INTERPOLATION');
}
function M(a=1,b=0,c=0,d=1,tx=0,ty=0){return {a,b,c,d,tx,ty};}
function mul(p,q){return M(p.a*q.a+p.c*q.b,p.b*q.a+p.d*q.b,p.a*q.c+p.c*q.d,p.b*q.c+p.d*q.d,p.a*q.tx+p.c*q.ty+p.tx,p.b*q.tx+p.d*q.ty+p.ty);}
function xf(v){let [pos,scale,rot,anchor]=v, r=rot*Math.PI/180,co=Math.cos(r),si=Math.sin(r),sx=scale[0]/100,sy=scale[1]/100;
 return M(co*sx,si*sx,-si*sy,co*sy,pos[0]-(co*sx*anchor[0]-si*sy*anchor[1]),pos[1]-(si*sx*anchor[0]+co*sy*anchor[1]));}
function vals(c,t){const id=[[0,0],[100,100],0,[0,0]], layer=[[960,540],[100,100],0,[960,540]];
 if(c==='A')return [ [sampleKeyframes([[0,0],[80,-40],[160,20]],t),[100,100],0,[0,0]],id,layer ];
 if(c==='B')return [id,[sampleKeyframes([[0,0],[-80,40],[-160,20]],t),[100,100],0,[0,0]],layer];
 if(c==='C')return [[[0,0],[100,100],sampleKeyframes([0,25,50],t),[0,0]],id,layer];
 if(c==='D')return [id,[[0,0],[100,100],sampleKeyframes([0,-20,-40],t),[0,0]],layer];
 if(c==='E')return [[[0,0],sampleKeyframes([[100,100],[125,85],[150,70]],t),0,[0,0]],id,layer];
 if(c==='F')return [id,[[0,0],sampleKeyframes([[100,100],[90,120],[80,140]],t),0,[0,0]],layer];
 if(c==='G')return [[[0,0],[100,100],0,sampleKeyframes([[0,0],[40,20],[80,40]],t)],id,layer];
 if(c==='H')return [id,[[0,0],[100,100],0,sampleKeyframes([[0,0],[-30,25],[-60,50]],t)],layer];
 if(c==='I')return [[sampleKeyframes([[0,0],[60,-30],[120,0]],t),[100,100],sampleKeyframes([0,15,30],t),[0,0]],[sampleKeyframes([[0,0],[-40,20],[-80,40]],t),[100,100],sampleKeyframes([0,-10,-20],t),[0,0]],layer];
 if(c==='J')return [[sampleKeyframes([[0,0],[40,-20],[80,0]],t),sampleKeyframes([[100,100],[120,90],[140,80]],t),0,[0,0]],[[0,0],[100,100],sampleKeyframes([0,20,40],t),[0,0]],[sampleKeyframes([[960,540],[1040,500],[1120,460]],t),sampleKeyframes([[100,100],[110,95],[120,90]],t),sampleKeyframes([0,10,20],t),[960,540]]];
 if(c==='K')return [[[60*t,-30*t],[100,100],0,[0,0]],id,layer];
 return [[[50*t,0],[100,100],0,[0,0]],[[0,-40*t],[100,100],0,[0,0]],layer];
}
function matrix(c,t){let v=vals(c,t);return mul(xf(v[2]),mul(xf(v[1]),xf(v[0])));}
function png(file){let b=fs.readFileSync(file),o=8,w=0,h=0,ids=[];while(o<b.length){let n=b.readUInt32BE(o),t=b.toString('ascii',o+4,o+8),d=b.subarray(o+8,o+8+n);o+=n+12;if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);}if(t==='IDAT')ids.push(d);if(t==='IEND')break;}let raw=zlib.inflateSync(Buffer.concat(ids)),stride=w*4,prev=Buffer.alloc(stride),row=Buffer.alloc(stride),minx=w,miny=h,maxx=-1,maxy=-1,count=0,sx=0,sy=0,off=0;for(let y=0;y<h;y++){let f=raw[off++];for(let i=0;i<stride;i++){let v=raw[off++],a=i>=4?row[i-4]:0,bb=prev[i],c=i>=4?prev[i-4]:0;if(f===1)v+=a;else if(f===2)v+=bb;else if(f===3)v+=Math.floor((a+bb)/2);else if(f===4){let p=a+bb-c,pa=Math.abs(p-a),pb=Math.abs(p-bb),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?bb:c;}row[i]=v&255;}for(let x=0;x<w;x++){let al=row[x*4+3];if(al){count++;sx+=x+0.5;sy+=y+0.5;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}}let q=prev;prev=row;row=q;}return {w,h,bbox:count?{l:minx,t:miny,r:maxx+1,b:maxy+1}:null,count,center:count?[sx/count,sy/count]:null};}
function oracle(m){let inv=1/(m.a*m.d-m.b*m.c), corners=[[-250,-150],[250,-150],[250,150],[-250,150]], pts=corners.map(p=>[m.a*p[0]+m.c*p[1]+m.tx,m.b*p[0]+m.d*p[1]+m.ty]);let xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),geo={l:Math.min(...xs),t:Math.min(...ys),r:Math.max(...xs),b:Math.max(...ys)};let l=Math.max(0,Math.floor(geo.l)),t=Math.max(0,Math.floor(geo.t)),r=Math.min(1920,Math.ceil(geo.r)),bb=Math.min(1080,Math.ceil(geo.b)),minx=1920,miny=1080,maxx=-1,maxy=-1,count=0,sx=0,sy=0;for(let y=t;y<bb;y++)for(let x=l;x<r;x++){let px=x+.5-m.tx,py=y+.5-m.ty,lx=(m.d*px-m.c*py)*inv,ly=(-m.b*px+m.a*py)*inv;if(lx>=-250&&lx<=250&&ly>=-150&&ly<=150){count++;sx+=x+.5;sy+=y+.5;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}}return {geo,visible:count?{l:minx,t:miny,r:maxx+1,b:maxy+1}:null,count,center:count?[sx/count,sy/count]:null};}
function sbox(x){return x?`(${x.l},${x.t})-(${x.r},${x.b})`:'NONE';}
let lines=['PHASE 5.15A-VI FULL INDEPENDENT TEMPORAL GEOMETRY ANALYSIS','PIXEL_CENTER_CONVENTION=(x+0.5,y+0.5)','ORDER=Layer*Outer*Inner*Rectangle','STOP_ON_FIRST_INDEPENDENT_FAILURE=true','SOURCE_EFFECTIVE=UNVERIFIED','FILE_LENGTH_REPORTING=UNRELIABLE_INFORMATIONAL_ONLY'];let first='NONE',frames=0;
outer: for(const c of cases){for(const t of times){let m=matrix(c,t),e=oracle(m),f=path.join(root,`Case${c}_T${String(t).replace('.','p')}.png`),o=png(f),delta=o.bbox&&e.visible?`(${o.bbox.l-e.visible.l},${o.bbox.t-e.visible.t},${o.bbox.r-e.visible.r},${o.bbox.b-e.visible.b})`:'UNAVAILABLE';let pass=!!(o.bbox&&e.visible&&delta==='(0,0,0,0)'&&o.count===e.count);lines.push(`CASE=${c} TIME=T${t} TEMPORAL_SOURCE=${temporalSource(c,t)} EVALUATED_VALUE=${JSON.stringify(vals(c,t))} GEOMETRIC_AABB=${sbox({l:e.geo.l,t:e.geo.t,r:e.geo.r,b:e.geo.b})} EXPECTED_VISIBLE_RASTER_AABB=${sbox(e.visible)} OBSERVED_ALPHA_AABB=${sbox(o.bbox)} EDGE_DELTA=${delta} EXPECTED_CENTER=${e.center?e.center.map(v=>v.toFixed(3)).join(','):'NONE'} OBSERVED_CENTER=${o.center?o.center.map(v=>v.toFixed(3)).join(','):'NONE'} EXPECTED_OPAQUE=${e.count} OBSERVED_OPAQUE=${o.count} PNG_SHA256=${require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex')} STATUS=${pass?'PASS':'FAIL'}`);frames++;if(!pass&&first==='NONE'){first=`${c}@T${t}`;break outer;}}}
lines.push(`CASES_DEFINED=${cases.length}`,`FRAMES_ANALYZED=${frames}`,`FIRST_FAILURE=${first}`,`STATUS=${first==='NONE'?'PASS_INDEPENDENT_VISUAL_TEMPORAL':'FAIL_INDEPENDENT_VISUAL_TEMPORAL'}`);fs.writeFileSync(out,lines.join('\n')+'\n');console.log(out);
