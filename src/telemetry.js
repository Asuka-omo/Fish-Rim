import {GATES,DOCK} from './timeline.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function jitter(t,k){const f=t*19+k*67,a=Math.floor(f),mix=f-a;const hash=n=>{const s=Math.sin(n*127.1+k*91.7)*43758.5453;return(s-Math.floor(s))*2-1;};return hash(a)*(1-mix)+hash(a+1)*mix;}
// Each point is [source-video seconds, normalized machinery intensity].
const loadCurve = [
 [0,.06],[4.6,.10],[9.18,.32],[13.3,.72],[14.83,.30],[15.25,.12],
 [15.48,.72],[15.95,.97],[16.18,.48],[16.48,.91],[16.95,.78],[17.35,.44],
 [18.4,.68],[19.6,.22],[23.4,.16],[28.1,.1],[28.47,.95],[29.75,.66],
 [30.15,.28],[31.5,.27],[32.2,.79],[34.3,.94],[36.5,.81],[37.75,.32],[38.8,.20],[41.67,.07]
];
export function filmLoad(t) {
 const end=loadCurve.findIndex(([at])=>at>t);
 if(end<0)return loadCurve.at(-1)[1];
 if(!end)return loadCurve[0][1];
 const [a,lo]=loadCurve[end-1],[b,hi]=loadCurve[end];
 const p=(t-a)/(b-a);
 return lo+(hi-lo)*p*p*(3-2*p);
}
export function spectrumBand(bin, t, load) {
 const ridge=Math.abs(Math.sin(bin*.19-t*(1.6+load)))**5;
 const transient=Math.abs(Math.sin(bin*2.3+t*7))**8;
 return Math.min(.99,.025+load*(.16+.52*ridge+.47*transient));
}
export function metrics(t,mode,wall){const wait=mode.startsWith('WAIT')||mode.startsWith('TYPE')||mode==='PAUSED'||mode==='BAY CLEARANCE';let drive=0,hyd=0,door=0,traction=0,power=t>=DOCK.core?42:8;
 if(!wait){if(t>=5.8&&t<14.83){drive=64*(1-Math.max(0,t-12)/4);hyd=35;power=56;}else if(t>GATES.head&&t<DOCK.locked){hyd=70*Math.sin(Math.PI*(t-GATES.head)/(DOCK.locked-GATES.head));drive=20;power=58;}else if(t>=DOCK.locked&&t<19.6){power=t>=17.3?84:25;hyd=18;}else if(t>=1228/60&&t<28.04){traction=52;power=63;drive=19;}else if(t>=1688/60&&t<30.3){door=82;power=70;hyd=32;}else if(t>=30.3&&t<35.2){traction=67;power=74;drive=24;}}
 const activity=(drive+door+traction+hyd)/160,n=k=>jitter(wall,k),beat=Math.sin(wall*1.9);
 const energy=wait?.075:filmLoad(t), phase=wait?wall:t, swing=.23+.77*energy;
 return{energy,signalTime:phase,core:power,hyd:12+hyd*.28,motor:drive+traction*.5+door*.48,door,traction,activity,
  cpu:clamp(43+activity*16+Math.sin(wall*1.1)*5+n(1)*8,16,94),mem:62+Math.sin(wall*.12)*1.1+n(2)*.8,gpu:clamp(29+activity*20+Math.sin(wall*.9)*4+n(3)*7,12,90),net:clamp(23+Math.sin(wall*1.3)*9+n(4)*14+activity*13,4,88),temp:61+Math.sin(wall*.22)*.9+activity*2+n(5)*.4,pwr:1.42+activity*.17+Math.sin(wall*.6)*.04+n(6)*.06,
  imu:.002+swing*(n(7)*.005+Math.sin(phase*2.4)*.003),
  gyro:Math.sin(phase*4)*.028*swing,
  acc:.002+swing*(n(9)*.015+Math.sin(phase*8)*.007),
  mag:(Math.sin(phase*3.8)>.12?.007:-.004)*swing,
  baro:1013.2+.63*Math.sin(phase*2.2)*swing,
  lidar:.243+(Math.sin(phase*4.4)>0?.028:-.02)*swing,signal:97+Math.sin(wall*.7)*1.2+n(13)*.8,latency:12+Math.sin(wall*.9)*2+n(14)*2};}
export class Telemetry{constructor(){this.hist=Array.from({length:6},()=>Array(150).fill(0));this.loads=Array.from({length:6},()=>Array(60).fill(0));this.frames=0;this.next=0;this.readout=0;}update(t,mode,wall){this.current=metrics(t,mode,wall);if(wall>=this.next){const v=this.current;[v.imu,v.gyro,v.acc,v.mag,v.baro,v.lidar].forEach((x,i)=>{this.hist[i].push(x);this.hist[i].shift();});[v.cpu,v.mem,v.gpu,v.net,v.temp,v.pwr].forEach((x,i)=>{this.loads[i].push(x);this.loads[i].shift();});this.next=wall+.05;this.frames++;}if(wall>=this.readout){this.values={...this.current};this.readout=wall+.25;}}}
