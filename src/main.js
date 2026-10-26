import './style.css';
import {TAU,mainRing,resample,transform,evaluate} from './math.js';
const $=s=>document.querySelector(s);
$('#app').innerHTML=`<header><a class="brand" href="./"><span class="brand-icon">◎</span> BORDER / ORBIT</a><span class="edition">AN INTERACTIVE FOURIER ATLAS <span>№ 001</span></span></header>
<main><section class="intro"><div><p class="eyebrow">GEOGRAPHY, IN FREQUENCY SPACE</p><h1>A world drawn<br>by <em>circles.</em></h1></div><p class="lede">Every coastline is a rhythm.<br>Watch rotating vectors reconstruct the<br>outline of a country, one orbit at a time.</p></section>
<section class="studio"><aside><div class="panel-heading"><span class="eyebrow">THE INSTRUMENT</span><span class="dot"></span></div>
<label for="country">01 <span>Choose a country</span></label><select id="country" disabled><option>Loading atlas…</option></select><p class="hint" id="region">Largest connected outer region · no inland holes</p>
<label for="mode">02 <span>Fourier representation</span></label><select id="mode"><option value="complex">Complex plane · z(t) = x(t) + iy(t)</option><option value="separate">Separate series · x(t) and y(t)</option></select>
<label for="count">03 <span>Epicycles <output id="count-value">64</output></span></label><input id="count" type="range" min="1" max="256" value="64"><div class="range-labels"><span>ABSTRACT</span><span>DETAILED</span></div><p class="hint" id="budget">64 rotating vectors, largest amplitudes first</p>
<label for="speed">04 <span>Drawing speed <output id="speed-value">1×</output></span></label><input id="speed" type="range" min="0.25" max="3" step="0.25" value="1">
<label for="direction">05 <span>Playback direction</span></label><select id="direction"><option value="1">Forward</option><option value="-1">Reverse</option></select>
<div class="toggles"><label><input id="circles" type="checkbox" checked> Show epicycles</label><label><input id="guide" type="checkbox" checked> Reference outline</label><label><input id="glow" type="checkbox" checked> Highlight the drawing tip</label></div>
<div class="actions"><button id="play" disabled>Ⅱ Pause</button><button id="reset" disabled aria-label="Restart drawing">↺ Restart</button></div>
</aside><div class="drawing"><div class="canvas-heading"><span><span class="dot"></span> <span id="state">LOADING ATLAS</span></span><span id="mode-label">COMPLEX SERIES</span></div><canvas aria-label="Animated country outline drawn by Fourier epicycles" role="img"></canvas><div class="canvas-footer"><span id="country-name">—</span><span id="progress">0% OF CYCLE</span></div><div id="error" role="alert" hidden></div></div></section>
<section class="notes"><div><span class="eyebrow">01 / THE IDEA</span><h2>From a border to a wave.</h2><p>Sample an outline at equal distances. A discrete Fourier transform turns those points into rotating vectors. Add their tips together, and the border appears again.</p></div><div><span class="eyebrow">02 / THE CIRCLES</span><h2>Small orbits. Fine details.</h2><p>Each epicycle has an amplitude (radius), frequency (rotation rate), and phase (starting angle). The largest amplitudes are drawn first. More circles recover finer details.</p></div><div><span class="eyebrow">03 / TWO WAYS TO DRAW</span><h2>One plane, or two axes.</h2><p>The complex mode draws a single vector chain. Separate mode uses one chain for x and one for y; their crosshair locates the drawing tip. The circle count applies to each chain.</p></div></section></main>
<footer><span>BORDER / ORBIT <span class="muted">· A little mathematics, a whole world.</span></span><span>Map data: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · 1:50m · Public domain</span></footer>`;
const canvas=$('canvas'),ctx=canvas.getContext('2d');
let countries=[],points=[],complex=[],xs=[],ys=[],t=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,history=[],completed=[],width=0,height=0,scale=1,origin=[0,0];
const val=id=>$(id).value;
function reset(){t=0;history=[];completed=[];last=0;}
function choose(){const feature=countries.find(f=>f.properties.id===val('#country'));points=resample(mainRing(feature.geometry));complex=transform(points);xs=transform(points.map(p=>[p[0],0]));ys=transform(points.map(p=>[p[1],0]));$('#country-name').textContent=feature.properties.name;reset();}
function terms(){const n=+val('#count');return {c:complex.slice(0,n),x:xs.slice(0,n),y:ys.slice(0,n)};}
function pointAt(u,tr){return val('#mode')==='complex'?evaluate(tr.c,u):[evaluate(tr.x,u)[0],evaluate(tr.y,u)[0]];}
function layout(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);const separate=val('#mode')==='separate';scale=Math.min(width*(separate?.23:.34),height*(separate?.25:.34));origin=[width*(separate?.61:.5),height*(separate?.61:.52)];}
const screen=p=>[origin[0]+p[0]*scale,origin[1]+p[1]*scale];
function path(points,color,lineWidth=1){if(!points.length)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
function chain(tr,u,start,rotation=0){let p=start.slice();for(const c of tr){const angle=TAU*c.frequency*u+rotation,dx=(c.re*Math.cos(angle)-c.im*Math.sin(angle))*scale,dy=(c.re*Math.sin(angle)+c.im*Math.cos(angle))*scale;const q=[p[0]+dx,p[1]+dy];if($('#circles').checked){ctx.beginPath();ctx.arc(...p,c.amplitude*scale,0,TAU);ctx.strokeStyle='rgba(155,191,179,.19)';ctx.lineWidth=.8;ctx.stroke();path([p,q],'rgba(175,211,198,.55)',.8);}p=q;}return p;}
function render(now){if(!last)last=now;const dt=Math.min((now-last)/1000,.05);last=now;const tr=terms();if(points.length && playing){const old=t;t+=dt*+val('#speed')/24;const steps=Math.max(1,Math.ceil((t-old)*1024));for(let i=1;i<=steps;i++){const u=old+(t-old)*i/steps;history.push({p:pointAt(u*+val('#direction'),tr),time:u});}if(t>=1){completed=history.map(h=>h.p);completed.push(completed[0]);t=0;history=[];}}
ctx.clearRect(0,0,width,height);ctx.fillStyle='#101c1b';ctx.fillRect(0,0,width,height);
ctx.fillStyle='rgba(161,193,181,.12)';for(let x=20;x<width;x+=28)for(let y=20;y<height;y+=28)ctx.fillRect(x,y,1,1);
if(points.length){if($('#guide').checked)path([...points,points[0]].map(screen),'rgba(146,174,163,.19)',1);
const u=t*+val('#direction');let end;
if(val('#mode')==='complex')end=chain(tr.c,u,origin);else {const a=chain(tr.x,u,[origin[0],height*.16]);const b=chain(tr.y,u,[width*.14,origin[1]],Math.PI/2);end=[a[0],b[1]];ctx.setLineDash([3,5]);path([a,end,b],'rgba(232,195,123,.55)',1);ctx.setLineDash([]);}
path(completed.map(screen),'#84b8a4',2);
path(history.map(h=>screen(h.p)),'#84b8a4',2);
if($('#glow').checked){for(let i=Math.max(1,history.length-150);i<history.length;i++){const age=t-history[i].time;if(age>.055)continue;path([screen(history[i-1].p),screen(history[i].p)],`rgba(255,218,151,${Math.max(0,1-age/.055)})`,2.6);}ctx.shadowBlur=14;ctx.shadowColor='#f2cc8b';}
ctx.beginPath();ctx.arc(...end,3.5,0,TAU);ctx.fillStyle='#f2cc8b';ctx.fill();ctx.shadowBlur=0;
}
$('#progress').textContent=`${Math.floor(t*100)}% OF CYCLE`;requestAnimationFrame(render);}
$('#country').addEventListener('change',choose);
for(const id of ['#count','#mode','#direction'])$(id).addEventListener('input',()=>{reset();layout();$('#count-value').textContent=val('#count');$('#budget').textContent=`${val('#count')} rotating vectors${val('#mode')==='separate'?' per axis':''}, largest amplitudes first`;$('#mode-label').textContent=val('#mode')==='complex'?'COMPLEX SERIES':'SEPARATE X / Y SERIES';});
$('#speed').addEventListener('input',()=>$('#speed-value').textContent=`${val('#speed')}×`);
$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=playing?'Ⅱ Pause':'▶ Play';$('#state').textContent=playing?'DRAWING THE WORLD':'PAUSED';});$('#reset').addEventListener('click',reset);
new ResizeObserver(layout).observe(canvas);requestAnimationFrame(render);
async function loadAtlas(){try {const response=await fetch(`${import.meta.env.BASE_URL}data/countries.geojson`);if(!response.ok)throw Error(`Atlas request failed (${response.status})`);const data=await response.json();countries=data.features.sort((a,b)=>a.properties.name.localeCompare(b.properties.name));$('#country').replaceChildren(...countries.map(f=>new Option(f.properties.name,f.properties.id)));$('#country').value='FIN';choose();$('#country').disabled=false;$('#play').disabled=false;$('#reset').disabled=false;$('#state').textContent=playing?'DRAWING THE WORLD':'PAUSED';$('#play').textContent=playing?'Ⅱ Pause':'▶ Play';}catch(error){$('#error').hidden=false;$('#error').textContent=`Could not load the atlas. Reload to try again. ${error.message}`;$('#state').textContent='ATLAS UNAVAILABLE';}

}
loadAtlas();
