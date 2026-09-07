export const W=13,H=9,ENTRY={x:0,z:4},EXIT={x:12,z:4};
export const TOWERS={
 thorn:{name:'Thorn',cost:35,damage:10,range:3.2,rate:.65,color:'#d8b773',desc:'Fast shots at one enemy.',effect:'Fires a needle at one enemy at a time. Can hit ground and flying enemies.',tip:'A good first tower. Place it beside a long stretch of your maze.',symbol:'↗'},
 sap:{name:'Sap well',cost:50,damage:3,range:2.6,rate:.9,color:'#81bdb0',desc:'Slows enemies so other towers get more shots.',effect:'Each hit slows an enemy by 52% for 2.2 seconds and deals a little damage.',tip:'Pair it with Thorn or Sunstone to keep enemies in range longer.',symbol:'◉'},
 bloom:{name:'Bloom',cost:75,damage:16,range:3.1,rate:1.7,color:'#da9985',desc:'Pollen bursts damage groups of enemies.',effect:'Each burst damages the target and enemies within 1.35 squares of it.',tip:'Place it at a bend where enemies bunch together.',symbol:'✳'},
 prism:{name:'Sunstone',cost:100,damage:27,range:4.3,rate:1.15,color:'#b4a5d3',desc:'Long-range shots that ignore armor.' ,effect:'Deals full damage to armored enemies. Has the longest base range of any tower.',tip:'Use it against beetles and bosses, or to cover flying enemies.',symbol:'◇'},
 hedge:{name:'Hedge',cost:8,damage:0,range:0,rate:1,color:'#86a76c',desc:'A cheap maze wall. Does not attack.',effect:'Blocks a square to redirect ground enemies. Flying enemies pass over it. Cannot be upgraded.',tip:'Build longer routes past your towers, while leaving an exit open.',symbol:'▦'}
};
export const MATERIALS = [
 {id:'wood',name:'Wood',buy:25,unlock:0,upgrade:35,yield:3,symbol:'♧'},
 {id:'rock',name:'Rock',buy:45,unlock:80,upgrade:55,yield:3,symbol:'⬟'},
 {id:'iron',name:'Iron',buy:70,unlock:160,upgrade:80,yield:2,symbol:'▰'},
 {id:'diamond',name:'Diamond',buy:100,unlock:300,upgrade:120,yield:1,symbol:'◇'}
];
export const STAGES=[
 ['First roots','A few curious visitors. Give them the scenic route.','Grubs'],['A stirring below','Runners arrive. A longer maze buys precious time.','Runners'],['Shell season','Armored beetles. Sunstone cuts through their shells.','Armor'],['On the breeze','Moths fly over your maze. Cover the direct route.','Flying'],['The long evening','Larger groups. Bloom towers thrive in a crowd.','Swarms'],['Old growth','An ancient guardian leads the final wave.','Boss'],['Restless soil','Quick feet and thick shells arrive together.','Mixed'],['Night garden','More moths take to the sky. Keep the heart covered.','Air raid'],['The wild tide','Dense, relentless waves test your entire garden.','Surge'],['Heart of the wild','One last stand. Protect the home you have grown.','Finale']
];
export function path(towers,start=ENTRY){
 const blocked=new Set(towers.map(t=>`${t.x},${t.z}`)),key=p=>`${p.x},${p.z}`;
 if(blocked.has(key(start)))return null;
 const q=[start],prev=new Map([[key(start),null]]);
 for(let i=0;i<q.length;i++){const p=q[i];if(p.x===EXIT.x&&p.z===EXIT.z){const out=[];let k=key(p);while(k){const [x,z]=k.split(',').map(Number);out.unshift({x,z});k=prev.get(k)}return out}
 for(const [dx,dz] of [[1,0],[0,1],[0,-1],[-1,0]]){const n={x:p.x+dx,z:p.z+dz},k=key(n);if(n.x<0||n.x>=W||n.z<0||n.z>=H||blocked.has(k)||prev.has(k))continue;prev.set(k,key(p));q.push(n)}}return null;
}
export class Game{
 constructor(data){
 // Migrate the old garden without discarding an existing expedition.
 if(data?.version===1){data={...data,version:2,wood:data.leaves||0,rock:data.ore||0,iron:0,diamond:0,unlockedPlots:1,farms:[null,null,null,null],coins:data.coins+(data.farms||[]).reduce((n,f)=>n+(f?45+30*f.level*(f.level-1):0),0)};delete data.leaves;delete data.ore;}
 Object.assign(this,{version:2,coins:200,wood:0,rock:0,iron:0,diamond:0,lives:20,stage:0,wave:0,towers:[],enemies:[],unlockedPlots:1,farms:[null,null,null,null],active:false,queue:[],spawn:0,nextId:1,kills:0,won:false,lost:false,time:0},data);this.events=[];
 }

 emit(type,data={}){this.events.push({type,...data})}
 place(type,x,z){if(this.lost||this.won)return 'This expedition has ended.';if(!TOWERS[type]||!Number.isInteger(x)||!Number.isInteger(z)||x<0||x>=W||z<0||z>=H)return 'Choose a square on the meadow.';
 if((x===0||x===12)&&z===4)return 'Keep the entrance and garden gate open.';
 if(this.towers.some(t=>t.x===x&&t.z===z))return 'Select this tower to tend it.';
 if(this.coins<TOWERS[type].cost)return 'You need more coins.';
 if(this.enemies.some(e=>!e.flying&&((Math.round(e.x)===x&&Math.round(e.z)===z)||(e.target?.x===x&&e.target?.z===z))))return 'A creature is using that square.';
 const t={id:this.nextId++,type,x,z,level:1,branch:null,cool:0,spent:TOWERS[type].cost};const trial=[...this.towers,t];
 if(!path(trial)||this.enemies.some(e=>!e.flying&&!path(trial,e.target||{x:Math.round(e.x),z:Math.round(e.z)})))return 'Leave a path through your maze.';
 this.coins-=t.spent;this.towers.push(t);this.emit('build',{id:t.id});return null;}
 stats(t){const d=TOWERS[t.type];return {damage:d.damage*(1+(t.level-1)*.75)*(t.branch==='power'?1.45:1),range:d.range+(t.level-1)*.25+(t.branch==='reach'?1.1:0),rate:d.rate/(1+(t.level-1)*.12)}}
 upgradeCost(t){return {coins:Math.round(TOWERS[t.type].cost*.7*t.level),wood:5*t.level,rock:t.level>=2?4:0,iron:t.level>=2&&['bloom','prism'].includes(t.type)?3:0,diamond:t.level>=2&&t.type==='prism'?1:0}}
 upgrade(id,branch='power'){const t=this.towers.find(t=>t.id===id);if(!t||t.type==='hedge'||t.level>=3)return 'This piece is fully grown.';const c=this.upgradeCost(t);if(Object.entries(c).some(([k,n])=>this[k]<n))return 'You need more money or materials for this upgrade.';for(const[k,n]of Object.entries(c))this[k]-=n;t.spent+=c.coins;t.level++;if(t.level===2)t.branch=branch==='reach'?'reach':'power';this.emit('build',{id});return null}

 sell(id){const t=this.towers.find(t=>t.id===id);if(!t)return;this.coins+=Math.floor(t.spent*.7);this.towers=this.towers.filter(t=>t.id!==id)}
 unlockPlot(i){
 if(this.lost||this.won)return 'This expedition has ended.';
 if(!Number.isInteger(i)||i<1||i>=MATERIALS.length)return 'Unknown plot.';
 if(i<this.unlockedPlots)return 'This plot is already unlocked.';
 if(i!==this.unlockedPlots||!this.farms[i-1])return 'Buy the previous resource first.';
 const cost=MATERIALS[i].unlock;if(this.coins<cost)return 'You need more coins.';
 this.coins-=cost;this.unlockedPlots++;return null;
 }
 farmCost(i){const f=this.farms[i],m=MATERIALS[i];return f?m.upgrade*f.level:m.buy}
 farm(i){
 if(this.lost||this.won)return 'This expedition has ended.';
 if(!Number.isInteger(i)||i<0||i>=MATERIALS.length)return 'Unknown plot.';
 if(i>=this.unlockedPlots)return 'Unlock this plot first.';
 const f=this.farms[i];if(f?.level>=3)return 'This plot is fully upgraded.';
 const cost=this.farmCost(i);if(this.coins<cost)return 'You need more coins.';
 this.coins-=cost;if(f)f.level++;else this.farms[i]={type:MATERIALS[i].id,level:1,progress:0};return null;
 }

 start(){if(this.active||this.won||this.lost)return false;this.active=true;this.wave++;this.spawn=0;const n=7+this.stage*2+this.wave*2;
 for(let i=0;i<n;i++){let kind='grub';if(this.stage>=1&&i%4===2)kind='runner';if(this.stage>=2&&i%5===3)kind='armor';if(this.stage>=3&&i%6===4)kind='moth';if(this.stage>=7&&i%3===1)kind='moth';if((this.stage===5||this.stage===9)&&this.wave===3&&i===n-1)kind='boss';this.queue.push(kind)}return true}
 enemy(kind){const s=this.stage,scale=Math.pow(1.43,s)*(1+.13*(this.wave-1));const hp=({grub:24,runner:18,armor:52,moth:25,boss:450}[kind])*scale;return {id:this.nextId++,kind,x:0,z:4,hp,maxHp:hp,speed:({grub:1.05,runner:1.85,armor:.76,moth:1.05,boss:.55}[kind])*(1+s*.025),flying:kind==='moth',slow:0,target:null}}
 tick(dt){if(this.lost||this.won)return;this.time+=dt;
 for(let i=0;i<this.farms.length;i++){const f=this.farms[i];if(!f)continue;f.progress+=dt;while(f.progress>=10){f.progress-=10;this[f.type]+=MATERIALS[i].yield*f.level;}}

 if(!this.active)return;
 this.spawn-=dt;if(this.queue.length&&this.spawn<=0){this.enemies.push(this.enemy(this.queue.shift()));this.spawn=Math.max(.35,.95-this.stage*.045)}
 for(const e of this.enemies){e.slow=Math.max(0,e.slow-dt);let move=dt*e.speed*(e.slow>0?.48:1);while(move>0){if(!e.target){if(e.x>=12&&Math.abs(e.z-4)<.01){e.escaped=true;this.lives-=e.kind==='boss'?5:1;this.emit('leak');break}e.target=e.flying?{...EXIT}:path(this.towers,{x:Math.round(e.x),z:Math.round(e.z)})?.[1];if(!e.target)break}const dx=e.target.x-e.x,dz=e.target.z-e.z,d=Math.hypot(dx,dz);if(d<=move){e.x=e.target.x;e.z=e.target.z;e.target=null;move-=d}else{e.x+=dx/d*move;e.z+=dz/d*move;move=0}}}
 this.enemies=this.enemies.filter(e=>!e.escaped);
 for(const t of this.towers){if(t.type==='hedge')continue;t.cool-=dt;if(t.cool>0)continue;const st=this.stats(t);const candidates=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-t.x,e.z-t.z)<=st.range);const e=candidates.sort((a,b)=>(Math.hypot(12-a.x,4-a.z)-Math.hypot(12-b.x,4-b.z)))[0];if(!e)continue;t.cool=st.rate;this.emit('shot',{tower:t.id,x:e.x,z:e.z,towerType:t.type});const targets=t.type==='bloom'?this.enemies.filter(o=>Math.hypot(o.x-e.x,o.z-e.z)<1.35):[e];for(const hit of targets){hit.hp-=st.damage*(hit.kind==='armor'&&t.type!=='prism'?.55:1);if(t.type==='sap')hit.slow=2.2}}
 for(const e of this.enemies){if(e.hp<=0){this.coins+=e.kind==='boss'?55:4;this.kills++;this.emit('kill',{x:e.x,z:e.z,kind:e.kind})}}this.enemies=this.enemies.filter(e=>e.hp>0);
 if(this.lives<=0){this.lives=0;this.lost=true;this.active=false;this.emit('lost');return}
 if(!this.queue.length&&!this.enemies.length){this.active=false;this.coins+=18+this.stage*4;this.emit('wave');if(this.wave===3){this.coins+=45+this.stage*10;this.lives=Math.min(20,this.lives+2);this.stage++;this.wave=0;if(this.stage===10){this.won=true;this.emit('won')}else this.emit('stage')}}
 }
 serialize(){const {events,...data}=this;return JSON.stringify(data)}
}
