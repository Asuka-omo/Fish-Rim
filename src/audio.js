const FILES=['user-music','ambience','mechanical','ui','shutter','seam','voice-broadcast','system-pa'];
export class AudioDirector {
 constructor(signal){this.signal=signal;this.nodes=new Set();this.buffers=new Map();this.events=[];const raw=new URLSearchParams(location.search).get('volume'),v=raw===null?NaN:Number(raw);this.volume=Number.isFinite(v)?Math.max(0,Math.min(1,v)):.72;this.enabled=false;this.busVolume={MUSIC:.57,MECHANICAL:.93,AMBIENCE:.56,UI:.65,VOICE:.95};}
 async prepare(){this.ctx=window.FFW.audioContext;this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.limiter=this.ctx.createDynamicsCompressor();Object.assign(this.limiter.threshold,{value:-2});this.limiter.knee.value=4;this.limiter.ratio.value=12;this.limiter.attack.value=.004;this.limiter.release.value=.13;this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);this.capture=this.ctx.createMediaStreamDestination();this.limiter.connect(this.capture);this.buses={};for(const n of Object.keys(this.busVolume)){const g=this.ctx.createGain();g.gain.value=this.busVolume[n];g.connect(this.master);this.buses[n]=g;}
 await Promise.all(FILES.map(async n=>{const b=await this.ctx.decodeAudioData(window.FFW.audio[n].slice(0));if(!this.closed)this.buffers.set(n,b);}));
 this.ctx.resume().then(()=>{this.enabled=true;}).catch(()=>{});
 }
 async unlock(){if(this.closed)return;await this.ctx.resume();this.enabled=this.ctx.state==='running';}
 ramp(param,value,sec=.14){if(this.closed)return;const t=this.ctx.currentTime;param.cancelAndHoldAtTime(t);param.linearRampToValueAtTime(value,t+sec);}
 start(file,bus,{offset=0,delay=0,loop=false,gain=1,tag=file}={}){if(this.closed||this.ctx.state!=='running')return null;const buffer=this.buffers.get(file);if(!buffer||offset>=buffer.duration)return null;const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=buffer;s.loop=loop;g.gain.value=gain;s.connect(g);g.connect(this.buses[bus]);const node={s,g,tag,stopped:false};this.nodes.add(node);s.onended=()=>{this.nodes.delete(node);s.disconnect();g.disconnect();};s.start(this.ctx.currentTime+delay,Math.max(0,offset));this.events.push({type:'start',file,bus,offset,audio:this.ctx.currentTime,wall:performance.now()});return node;}
 stop(tag,fade=.10){for(const n of this.nodes){if(n.tag!==tag||n.stopped)continue;n.stopped=true;this.ramp(n.g.gain,0,fade);try{n.s.stop(this.ctx.currentTime+fade+.01);}catch{}}}
 ambient(){if(!this.ambience||this.ambience.stopped)this.ambience=this.start('ambience','AMBIENCE',{loop:true,tag:'room'});}
 follow(t,gates){this.stop('music',.025);this.stop('mech',.025);if(this.voicePaused)this.resumeVoice();this.scheduleCue('system-pa',18.4,t,gates.has('head'));this.timelineOffset=t;this.timelineAt=this.ctx.currentTime;const duck=this.voiceStarted&&this.ctx.currentTime<this.voiceEnd;this.ramp(this.buses.MUSIC.gain,this.busVolume.MUSIC*(duck?.30:1),.025);this.ramp(this.buses.MECHANICAL.gain,this.busVolume.MECHANICAL*(duck?.68:1),.018);const music=this.start('user-music','MUSIC',{offset:t,tag:'music'});if(music&&gates.has('head'))this.rideMusic(music.g.gain,t);this.start('mechanical','MECHANICAL',{offset:t,tag:'mech'});this.ambient();this.roomOnFilm(t);this.events.push({type:'follow',video:t,audio:this.ctx.currentTime});}
 // Ride the music source, leaving the operator's MUSIC fader independent.
 rideMusic(gain,sourceTime){
  const points=[[18.85,1],[19.15,.62],[36.0,.62],[36.60,1]];
  const now=this.ctx.currentTime;
  let previous=[0,1];
  for(const point of points){
   if(point[0]<=sourceTime){previous=point;continue;}
   if(previous[0]<=sourceTime){
    const progress=(sourceTime-previous[0])/(point[0]-previous[0]);
    gain.setValueAtTime(previous[1]+(point[1]-previous[1])*progress,now);
   }
   gain.linearRampToValueAtTime(point[1],now+point[0]-sourceTime);
   previous=point;
  }
 }
 // After the picture change, the room tone is already in the reference FX.
 roomOnFilm(t){const p=this.ambience?.g.gain;if(!p)return;const now=this.ctx.currentTime;
  p.cancelScheduledValues(now);p.setValueAtTime(Math.max(0,Math.min(1,(19.15-t)/.30)),now);
  if(t<18.85)p.setValueAtTime(1,now+18.85-t);if(t<19.15)p.linearRampToValueAtTime(0,now+19.15-t);}
 scheduleCue(file,at,time,authorized,bus='VOICE',gain=1){
  this.stop(file,.025);
  if(!authorized || time>=at+this.buffers.get(file).duration)return;
  this.start(file,bus,{gain,delay:Math.max(0,at-time),offset:Math.max(0,time-at),tag:file});
 }
 preHold(){if(this.preHolding)return;this.preHolding=true;this.ramp(this.buses.MUSIC.gain,0,.022);this.ramp(this.buses.MECHANICAL.gain,0,.022);}
 hold(t){this.preHolding=false;this.stop('system-pa',.025);this.stop('music',.02);this.stop('mech',.022);this.timelineOffset=t;this.ambient();if(this.ambience)this.ramp(this.ambience.g.gain,t>=19.15?.24:1,.20);this.events.push({type:'hold',video:t,audio:this.ctx.currentTime});}
 cue(n){const file=n==='shutter'?'shutter':n==='seam'?'seam':'ui';return this.start(file,n==='shutter'?'MECHANICAL':'UI',{tag:n});}
 voice(){if(this.voiceStarted)return;this.voiceStarted=true;this.voiceOffset=0;this.voiceAt=this.ctx.currentTime;this.ramp(this.buses.MUSIC.gain,this.busVolume.MUSIC*.30,.20);this.ramp(this.buses.MECHANICAL.gain,this.busVolume.MECHANICAL*.68,.18);this.start('voice-broadcast','VOICE',{tag:'voice'});this.voiceEnd=this.ctx.currentTime+this.buffers.get('voice-broadcast').duration;this.events.push({type:'voice',audio:this.ctx.currentTime,end:this.voiceEnd,text:'Fat Fish, ready to fight.'});}
 pauseVoice(){if(!this.voiceStarted||this.voicePaused||this.ctx.currentTime>=this.voiceEnd)return;this.voiceOffset=Math.min(this.buffers.get('voice-broadcast').duration,this.voiceOffset+this.ctx.currentTime-this.voiceAt);this.voicePaused=true;this.voiceEnd=Infinity;this.stop('voice',.035);this.events.push({type:'voice-hold',offset:this.voiceOffset,audio:this.ctx.currentTime});}
 resumeVoice(){if(!this.voicePaused)return;this.voicePaused=false;this.voiceAt=this.ctx.currentTime;const remaining=this.buffers.get('voice-broadcast').duration-this.voiceOffset;this.voiceEnd=this.ctx.currentTime+remaining;const node=this.start('voice-broadcast','VOICE',{offset:this.voiceOffset,tag:'voice',gain:0});if(node)this.ramp(node.g.gain,1,.025);this.events.push({type:'voice-resume',offset:this.voiceOffset,audio:this.ctx.currentTime,end:this.voiceEnd});}
 mute(on){this.muted=on;this.ramp(this.master.gain,on?0:this.volume,.10);}
 setVolume(bus,value){this.busVolume[bus]=Math.max(0,Math.min(1,value));this.ramp(this.buses[bus].gain,this.busVolume[bus],.12);}
 async dispose(){if(this.closed)return;for(const n of this.nodes){try{n.s.stop();}catch{}n.s.disconnect();n.g.disconnect();}this.nodes.clear();this.buffers.clear();for(const g of Object.values(this.buses??{}))g.disconnect();this.master?.disconnect();this.limiter?.disconnect();this.capture?.stream.getTracks().forEach(t=>t.stop());this.closed=true;if(this.ctx&&this.ctx.state!=='closed')await this.ctx.close();}
 get diagnostics(){return{state:this.ctx?.state,liveNodes:this.nodes.size,bufferBytes:[...this.buffers.values()].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0),events:this.events,voiceEnd:this.voiceEnd};}
}
