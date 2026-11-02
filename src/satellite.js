import * as T from '../vendor/three/three.module.js';
/** Small real3D model, orthographic perspective, transparent render. */
export class Satellite{
 constructor(){this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(256,256);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;this.canvas=this.renderer.domElement;this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1.7,1.7,1.7,-1.7,.1,30);this.camera.position.set(2.8,3,6);this.camera.lookAt(0,0,0);this.group=new T.Group();this.group.rotation.z=.69;this.scene.add(this.group);
 const silver=new T.MeshStandardMaterial({color:0xcedbe1,metalness:.55,roughness:.3}),white=new T.MeshStandardMaterial({color:0xe7edef,metalness:.28,roughness:.38}),dark=new T.MeshStandardMaterial({color:0x293b46,metalness:.75,roughness:.34}),glass=new T.MeshStandardMaterial({color:0x31596e,metalness:.16,roughness:.55});
 const box=(x,y,z,w,h,d,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);this.group.add(m);return m;};
 box(0,0,0,.72,.68,.61,silver);box(0,0,.316,.64,.59,.035,white);box(0,.36,0,.64,.04,.54,white);box(0,-.37,.02,.6,.07,.52,dark);
 for(const side of [-1,1]){box(side*.48,0,0,.38,.055,.055,silver);box(side*1.17,0,0,1.12,.73,.065,dark);box(side*1.17,0,.038,1.085,.69,.016,silver);for(let j=0;j<5;j++)for(let k=0;k<3;k++)box(side*1.17-.425+j*.212,-.222+k*.222,.054,.2,.207,.012,glass);}
 const stem=new T.Mesh(new T.CylinderGeometry(.017,.017,.49,10),silver);stem.position.set(0,.45,.13);stem.rotation.x=.22;this.group.add(stem);const dish=new T.Mesh(new T.ConeGeometry(.16,.07,24,1,true),white);dish.position.set(0,.72,.17);dish.rotation.x=-Math.PI*.52;this.group.add(dish);
 this.scene.add(new T.HemisphereLight(0xc8e7ff,0x263642,1.8));const key=new T.DirectionalLight(0xffffff,3);key.position.set(-4,6,8);this.scene.add(key);const rim=new T.DirectionalLight(0x83c5e4,1);rim.position.set(4,-1,-3);this.scene.add(rim);this.next=0;
 }
 render(time){if(time<this.next)return;this.next=time+1/24;this.group.rotation.y=.06*Math.sin(time*.38);this.group.rotation.x=.08;this.renderer.render(this.scene,this.camera);}
 dispose(){this.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});this.renderer.renderLists.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.canvas.width=this.canvas.height=1;}
}
