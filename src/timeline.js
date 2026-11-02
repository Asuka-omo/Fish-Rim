export const GATES=Object.freeze({head:915/60,launch:1686/60});
export const DOCK=Object.freeze({guide:15.48,seat:15.95,pin:16.48,unload:16.70,locked:16.95,relay:17.30,core:18.40});
export const CUES=[
 [0.3,'hoist','EXEC','Hoist transport active'],[9.25,'descent','EXEC','Head module approaching'],
 [DOCK.guide,'guide','EXEC','Docking guides taking load'],[DOCK.seat,'contact','EXEC','Neck seat taking load'],
 [DOCK.pin,'interlock','EXEC','Main latch engaging'],[DOCK.unload,'unload','EXEC','Hydraulic load transferring'],
 [DOCK.locked,'secured','OK','HEAD LOCKED'],[DOCK.core,'core','OK','CORE ONLINE'],
 [1208/60,'seat-platform','EXEC','Carrier suspension taking load'],[1228/60,'inbound','EXEC','Conveyor moving unit to bay'],[28.04,'arrived','OK','Carrier at sealed bay'],
 [1688/60,'unlock','EXEC','Bay locks releasing'],[1688/60,'door','EXEC','Bay doors opening'],[30.30,'carrier','EXEC','Carrier advancing'],[37.75,'deployed','OK','Unit deployed'],[38.8,'voice','VOICE','Fat Fish, ready to fight.']
];
