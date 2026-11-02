// PRC flag: 3:2 field, stars positioned on the standard30×20 construction grid.
export function drawChinaFlag(c,x,y,width=24){
 const scale=width/30;
 c.save();c.translate(x,y);c.scale(scale,scale);
 c.fillStyle='#de2910';c.fillRect(0,0,30,20);c.fillStyle='#ffde00';
 const star=(cx,cy,r,angle)=>{c.beginPath();for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,s=i%2?r*.381966:r;const px=cx+Math.cos(a)*s,py=cy+Math.sin(a)*s;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fill();};
 star(5,5,3,-Math.PI/2);
 for(const [sx,sy] of [[10,2],[12,4],[12,7],[10,9]])star(sx,sy,1,Math.atan2(5-sy,5-sx));
 c.restore();
}
