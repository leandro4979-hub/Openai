import {createCombatArena,canOccupy} from './world/arena.mjs';
import {renderWalls,hasLineOfSight} from './world/raycaster.mjs';
import {createEnemy,updateEnemy,damageEnemy,EnemyState} from './world/enemy-ai.mjs';
import {PerformanceGovernor} from './world/performance.mjs';
import {createWeaponState,tickWeapon,tryFire,startReload,finishReload,damageAtDistance,createHitMarker} from './game/combat.js';
import {CombatPresentation} from './game/presentation.js';

const $=s=>document.querySelector(s);
const canvas=$('#view');
const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
const arena=createCombatArena();
const isTouch=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window;
if(isTouch)document.body.classList.add('touch-mode');

const audio=new (window.AudioContext||window.webkitAudioContext)();
const presentation=new CombatPresentation({audioContext:audio});
const governor=new PerformanceGovernor({sampleSize:75,targetMs:isTouch?18.5:16.67});

const makePlayer=()=>({...arena.playerSpawn,health:100});
const makeEnemies=()=>arena.enemySpawns.map((s,i)=>createEnemy(s,i,[s,{x:Math.max(1.5,s.x-2),z:s.z}]));

let player=makePlayer();
let weapon=createWeaponState();
let enemies=makeEnemies();
let keys={};
let firing=false;
let active=false;
let phase='briefing';
let noise=null;
let last=performance.now();
let frames=[];
let recoil=0;
let present={muzzleFlash:0,hitMarker:null};
let feedbackTimer=0;
let touchMove={x:0,y:0};
let touchSprint=false;
let stickPointer=null;
let lookPointer=null;
let lookLast={x:0,y:0};
let quality=governor.settings();

function size(){
  const cap=isTouch?1.25:1.5;
  const d=Math.min(devicePixelRatio||1,cap);
  canvas.width=Math.max(1,Math.floor(innerWidth*d));
  canvas.height=Math.max(1,Math.floor(innerHeight*d));
}
addEventListener('resize',size,{passive:true});
size();

function resetMission(){
  player=makePlayer();
  weapon=createWeaponState();
  enemies=makeEnemies();
  noise=null;
  recoil=0;
  firing=false;
  keys={};
  touchMove={x:0,y:0};
  touchSprint=false;
  $('#banner').textContent='';
  $('#feedback').textContent='';
  $('#feedback').className='feedback';
  $('#stick-nub').style.transform='translate(-50%,-50%)';
  updateHud();
}

function menuFor(kind){
  const configs={
    briefing:{kicker:'NEXUS TACTICAL SYSTEMS',title:'BLACKSITE<br>RELAY',copy:'A focused, single-player browser FPS encounter. Clear three reactive guards, then reach the amber extraction beacon. Headshots deal increased damage.',button:'DEPLOY TO BLACKSITE'},
    paused:{kicker:'TACTICAL PAUSE',title:'MISSION<br>PAUSED',copy:'The encounter is frozen. Resume when ready; current armor, ammunition, enemy state, and objective progress are preserved.',button:'RESUME MISSION'},
    won:{kicker:'OPERATION COMPLETE',title:'RELAY<br>SECURED',copy:'All relay guards are down and extraction is confirmed. Run the encounter again from a clean state.',button:'RUN AGAIN'},
    dead:{kicker:'MISSION FAILED',title:'OPERATOR<br>DOWN',copy:'Armor was depleted. Redeploying resets the player, weapon, enemies, objective, and extraction state cleanly.',button:'REDEPLOY'}
  };
  const c=configs[kind]||configs.briefing;
  $('#menu-kicker').textContent=c.kicker;
  $('#menu-title').innerHTML=c.title;
  $('#menu-copy').textContent=c.copy;
  $('#deploy').textContent=c.button;
  $('#menu').classList.remove('hidden');
}

function startOrResume(){
  if(phase==='won'||phase==='dead'||phase==='briefing')resetMission();
  phase='running';
  active=true;
  firing=false;
  $('#menu').classList.add('hidden');
  $('#banner').textContent='';
  audio.resume();
  if(!isTouch&&document.pointerLockElement!==canvas)canvas.requestPointerLock();
  updateHud();
}
$('#deploy').addEventListener('click',startOrResume);

function pauseMission(){
  if(phase!=='running')return;
  active=false;
  firing=false;
  phase='paused';
  menuFor('paused');
  updateHud();
}

addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR'&&active)weapon=startReload(weapon)});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{firing=false;touchSprint=false});

if(!isTouch){
  canvas.addEventListener('mousedown',()=>{
    if(!active)return;
    firing=true;
    if(document.pointerLockElement!==canvas)canvas.requestPointerLock();
    audio.resume();
  });
  addEventListener('mouseup',()=>firing=false);
  addEventListener('mousemove',e=>{
    if(active&&document.pointerLockElement===canvas){
      player.yaw+=e.movementX*.0021;
      recoil=Math.max(-.1,Math.min(.1,recoil+e.movementY*.0017));
    }
  });
  document.addEventListener('pointerlockchange',()=>{if(active&&phase==='running'&&document.pointerLockElement!==canvas)pauseMission()});
}

function endPointer(e,el){try{if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId)}catch{}}

if(isTouch){
  const stick=$('#stick'),nub=$('#stick-nub'),fire=$('#fire'),reload=$('#reload'),sprint=$('#sprint');
  const updateStick=e=>{
    const r=stick.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const max=42,d=Math.hypot(dx,dy)||1;
    if(d>max){dx=dx/d*max;dy=dy/d*max}
    touchMove.x=dx/max;touchMove.y=-dy/max;
    nub.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  const clearStick=e=>{
    if(stickPointer!==e.pointerId)return;
    stickPointer=null;touchMove={x:0,y:0};nub.style.transform='translate(-50%,-50%)';endPointer(e,stick);
  };
  stick.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e)});
  stick.addEventListener('pointermove',e=>{if(stickPointer===e.pointerId)updateStick(e)});
  stick.addEventListener('pointerup',clearStick);stick.addEventListener('pointercancel',clearStick);

  canvas.addEventListener('pointerdown',e=>{
    if(!active||e.pointerType==='mouse'||lookPointer!==null)return;
    lookPointer=e.pointerId;lookLast={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);audio.resume();
  });
  canvas.addEventListener('pointermove',e=>{
    if(lookPointer!==e.pointerId)return;
    const dx=e.clientX-lookLast.x,dy=e.clientY-lookLast.y;lookLast={x:e.clientX,y:e.clientY};
    player.yaw+=dx*.0062;recoil=Math.max(-.12,Math.min(.12,recoil+dy*.0045));
  });
  const clearLook=e=>{if(lookPointer!==e.pointerId)return;lookPointer=null;endPointer(e,canvas)};
  canvas.addEventListener('pointerup',clearLook);canvas.addEventListener('pointercancel',clearLook);

  const stopFire=e=>{if(e)endPointer(e,fire);firing=false;fire.classList.remove('active')};
  fire.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();firing=true;fire.classList.add('active');fire.setPointerCapture(e.pointerId);audio.resume()});
  fire.addEventListener('pointerup',stopFire);fire.addEventListener('pointercancel',stopFire);
  reload.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();weapon=startReload(weapon);audio.resume()});
  const stopSprint=e=>{if(e)endPointer(e,sprint);touchSprint=false;sprint.classList.remove('active')};
  sprint.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();touchSprint=true;sprint.classList.add('active');sprint.setPointerCapture(e.pointerId)});
  sprint.addEventListener('pointerup',stopSprint);sprint.addEventListener('pointercancel',stopSprint);
}

function flashFeedback(text,type=''){
  const el=$('#feedback');el.textContent=text;el.className=`feedback on ${type}`.trim();feedbackTimer=type==='kill'?.6:.35;
}
function showHit(lethal,head){
  const cross=$('#cross');cross.classList.add('hit');if(lethal)cross.classList.add('lethal');
  setTimeout(()=>cross.classList.remove('hit','lethal'),lethal?150:100);
  flashFeedback(lethal?'HOSTILE DOWN':head?'HEADSHOT':'HIT',lethal?'kill':head?'head':'');
}

function shoot(){
  const out=tryFire(weapon,17);weapon=out.state;
  if(!out.event){if(weapon.ammo===0&&weapon.reload===0)weapon=startReload(weapon);return}
  presentation.onShot(out.event);player.yaw+=out.event.yaw*2;recoil-=out.event.pitch*2;noise={x:player.x,z:player.z,radius:10,age:0};
  let best=null;
  for(const e of enemies){
    if(e.state===EnemyState.DEAD)continue;
    const dx=e.x-player.x,dz=e.z-player.z,d=Math.hypot(dx,dz),target=Math.atan2(dz,dx);
    const a=Math.abs(Math.atan2(Math.sin(target-player.yaw),Math.cos(target-player.yaw)));
    if(a<.055&&hasLineOfSight(arena,player,e)&&(!best||d<best.d))best={e,d,head:a<.018};
  }
  if(best){
    const lethal=damageEnemy(best.e,damageAtDistance('viper',best.d,best.head?'head':'body'));
    presentation.onHit(createHitMarker(best.head?'head':'body',lethal));showHit(lethal,best.head);
  }
}

function failMission(){
  if(phase!=='running')return;
  phase='dead';active=false;firing=false;$('#banner').textContent='SIGNAL LOST · OPERATOR DOWN';
  if(document.pointerLockElement===canvas)document.exitPointerLock();menuFor('dead');updateHud();
}
function winMission(){
  if(phase!=='running')return;
  phase='won';active=false;firing=false;$('#banner').textContent='MISSION COMPLETE · RELAY SECURED';$('#objective').textContent='EXTRACTION COMPLETE';
  if(document.pointerLockElement===canvas)document.exitPointerLock();menuFor('won');updateHud();
}

function updateHud(){
  const alive=enemies.filter(e=>e.state!==EnemyState.DEAD).length;
  $('#enemies').textContent=`${alive} HOSTILE${alive===1?'':'S'}`;
  $('#ammo').textContent=weapon.ammo;$('#reserve').textContent=`/ ${weapon.reserve}${weapon.reload?' · RELOADING':''}`;
  $('#hp').textContent=Math.ceil(player.health);$('#hpbar').style.width=Math.max(0,player.health)+'%';$('#health').classList.toggle('critical',player.health<=30);
  if(phase==='won')$('#objective').textContent='EXTRACTION COMPLETE';else $('#objective').textContent=alive?'ELIMINATE RELAY GUARDS':'REACH EXTRACTION BEACON';
  if(!active)$('#prompt').textContent='';
  else if(!alive){const d=Math.max(0,Math.hypot(player.x-arena.extraction.x,player.z-arena.extraction.z)-arena.extraction.radius);$('#prompt').textContent=`EXTRACTION · ${d.toFixed(1)}M`}
  else if(isTouch)$('#prompt').textContent='';else $('#prompt').textContent='ESC TO PAUSE';
}

function update(dt){
  weapon=tickWeapon(weapon,dt);if(weapon.reload===0)weapon=finishReload(weapon);if(firing)shoot();if(noise)noise.age+=dt;recoil*=Math.exp(-8*dt);
  if(feedbackTimer>0){feedbackTimer-=dt;if(feedbackTimer<=0)$('#feedback').classList.remove('on')}
  let f=(keys.KeyW?1:0)-(keys.KeyS?1:0)+touchMove.y,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+touchMove.x;
  f=Math.max(-1,Math.min(1,f));s=Math.max(-1,Math.min(1,s));
  const len=Math.max(1,Math.hypot(f,s)),spd=(keys.ShiftLeft||touchSprint)?7.3:5.4;
  const dx=(Math.cos(player.yaw)*f+Math.cos(player.yaw+Math.PI/2)*s)/len*spd*dt,dz=(Math.sin(player.yaw)*f+Math.sin(player.yaw+Math.PI/2)*s)/len*spd*dt;
  if(canOccupy(arena,player.x+dx,player.z))player.x+=dx;if(canOccupy(arena,player.x,player.z+dz))player.z+=dz;
  for(const e of enemies){for(const ev of updateEnemy(e,{player,arena,noise},dt)){if(Math.random()<ev.hitChance){player.health=Math.max(0,player.health-ev.damage);$('#damage').classList.add('on');setTimeout(()=>$('#damage').classList.remove('on'),90)}}}
  if(player.health<=0){failMission();return}
  const alive=enemies.filter(e=>e.state!==EnemyState.DEAD).length;
  if(!alive&&Math.hypot(player.x-arena.extraction.x,player.z-arena.extraction.z)<arena.extraction.radius){winMission();return}
  updateHud();
}

function render(){
  const w=canvas.width,h=canvas.height,g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#193240');g.addColorStop(.5,'#819096');g.addColorStop(.501,'#1a2020');g.addColorStop(1,'#080b0b');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const maxColumns=isTouch?720:900,columns=Math.max(260,Math.floor(Math.min(w,maxColumns)*quality.rayScale));
  renderWalls(ctx,arena,{x:player.x,z:player.z,yaw:player.yaw+recoil},{columns,fov:1.05});
  const allDead=enemies.every(e=>e.state===EnemyState.DEAD);
  const sprites=[...enemies.filter(e=>e.state!==EnemyState.DEAD).map(e=>({...e,kind:'enemy'})),...(allDead?[{...arena.extraction,kind:'extract'}]:[])];
  sprites.sort((a,b)=>Math.hypot(b.x-player.x,b.z-player.z)-Math.hypot(a.x-player.x,a.z-player.z));
  for(const e of sprites){
    const dx=e.x-player.x,dz=e.z-player.z,d=Math.hypot(dx,dz),a=Math.atan2(Math.sin(Math.atan2(dz,dx)-player.yaw-recoil),Math.cos(Math.atan2(dz,dx)-player.yaw-recoil));
    if(Math.abs(a)>.62||!hasLineOfSight(arena,player,e))continue;
    const x=w/2+a/1.05*w,sz=Math.min(h*.75,h/d),y=h/2;ctx.save();ctx.shadowBlur=quality.shadows?(e.kind==='extract'?28:8):0;ctx.shadowColor=e.kind==='extract'?'#ffb21c':'#ff304c';
    if(e.kind==='extract'){
      const pulse=.72+Math.sin(performance.now()*.006)*.18;ctx.fillStyle=`rgba(255,178,28,${pulse})`;ctx.fillRect(x-sz*.18,y-sz*.46,sz*.36,sz*.82);ctx.fillStyle='#fff4';ctx.fillRect(x-sz*.12,y-sz*.38,sz*.24,sz*.08);ctx.strokeStyle='#ffcf66';ctx.lineWidth=Math.max(1,sz*.012);ctx.beginPath();ctx.arc(x,y+sz*.28,sz*.28,0,Math.PI*2);ctx.stroke();
    }else{
      ctx.fillStyle=e.state===EnemyState.ENGAGE?'#141719':'#101416';ctx.fillRect(x-sz*.18,y-sz*.46,sz*.36,sz*.82);ctx.fillStyle=e.state===EnemyState.ENGAGE?'#ff4058':'#a9b2b4';ctx.fillRect(x-sz*.12,y-sz*.38,sz*.24,sz*.08);
      if(e.health<100){ctx.fillStyle='#000b';ctx.fillRect(x-sz*.18,y-sz*.54,sz*.36,Math.max(3,sz*.025));ctx.fillStyle='#ff475d';ctx.fillRect(x-sz*.18,y-sz*.54,sz*.36*(e.health/100),Math.max(3,sz*.025))}
    }
    ctx.restore();
  }
  ctx.save();ctx.translate(w*.72,h*.82);ctx.rotate(-.13+recoil*.5);ctx.fillStyle='#151b1d';ctx.fillRect(-30,-20,w*.3,h*.15);ctx.fillStyle='#bd8a28';ctx.fillRect(5,-14,w*.17,8);
  if(present.muzzleFlash>.08){ctx.fillStyle=`rgba(255,197,75,${Math.min(.95,present.muzzleFlash)})`;ctx.beginPath();ctx.moveTo(w*.17,-12);ctx.lineTo(w*.21,-26);ctx.lineTo(w*.205,0);ctx.closePath();ctx.fill()}
  ctx.restore();
}

function loop(t){
  const frameMs=Math.min(50,t-last),dt=Math.min(.05,frameMs/1000);last=t;quality=governor.sample(frameMs,t);if(active)update(dt);present=presentation.update(dt);render();
  frames.push(1000/Math.max(frameMs,1));if(frames.length>30)frames.shift();const fps=Math.round(frames.reduce((a,b)=>a+b,0)/Math.max(frames.length,1));$('#fps').textContent=`${fps} FPS`;requestAnimationFrame(loop);
}

menuFor('briefing');updateHud();requestAnimationFrame(loop);
