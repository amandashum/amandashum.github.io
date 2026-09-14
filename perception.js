/** Explore real offline detections, semantic labels, and depth through Blender/WebGL. */
import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/GLTFLoader.js';

const canvas = document.querySelector('#vision-canvas');
const viewport = document.querySelector('#scene-viewport');
const poster = document.querySelector('#scene-poster');
const status = document.querySelector('#render-status');
const controls = document.querySelector('#scene-ui');
const slider = document.querySelector('#separation');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const modeButtons = [...document.querySelectorAll('[data-view]')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const descriptions = {
  original:['The input.','A 1,085 × 1,500 photograph. One scene, many possible representations.'],
  objects:['What is in the scene?','Predicted object locations and confidence scores from RT-DETR.'],
  semantics:['What does each pixel belong to?','SegFormer labels road, vehicles, trees, buildings, water, and sky independently.'],
  depth:['How is the scene arranged?','Depth Anything V2 estimates relative inverse depth. Brighter means nearer.'],
  spatial:['From image space to 3D.','A Blender-built surface uses estimated depth to position image samples in space.'],
  pixels:['The colour information.','RGB samples become a lattice of points. Each sample retains its image coordinate.'],
};
const state = {mode:'spatial',filter:'all',strength:.85,currentStrength:.85,
  yaw:-.38,currentYaw:-.38,pitch:.10,currentPitch:.10,points:false,
  ready:false,visible:true,manual:false,frame:0,last:0,drag:null};
let renderer,scene,camera,model,photoPlane,pointCloud,data,depthGrid,classGrid;
let photoTexture,semanticTexture,depthTexture,pointMaterial;
const boxGroup = new THREE.Group();
const labels = [];
const pickRay = new THREE.Raycaster();
const pickPosition = new THREE.Vector2();
const projected = new THREE.Vector3();
const geometryGroup = new THREE.Group();

/** Constrain camera input and depth strength to the visual study's safe range. */
function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}

/** Retain an offline Blender preview when the browser cannot render the scene. */
function fallback(error){
  state.ready=false;
  cancelAnimationFrame(state.frame);
  state.frame=0;
  canvas.hidden=true;
  controls.hidden=true;
  poster.classList.remove('is-loaded');
  document.querySelector('#scene-labels').hidden=true;
  document.querySelector('#reset-view').hidden=true;
  status.textContent='Blender-rendered preview';
  document.querySelector('#scene-help').textContent='Interactive 3D unavailable. Showing the Blender render.';
  renderer?.dispose();
  if(error)console.warn('Scene preview fallback:',error.message);
}

/** Render only when visible input or geometry has changed. */
function invalidate(){
  if(state.ready&&state.visible&&!document.hidden&&!state.frame)state.frame=requestAnimationFrame(render);
}

/** Fit the scene inside a stable viewport, including narrow phones. */
function resize(){
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(!width||!height||!renderer)return;
  const aspect=width/height;
  camera.aspect=aspect;
  const halfHeight=Math.max(3.0,2.35/aspect);
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(halfHeight/8));
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setSize(width,height,false);
  invalidate();
}

/** Return the documented semantic display group for an unmodified model class. */
function groupOf(classId){
  return Object.keys(data.groups).find(name=>data.groups[name].includes(classId))||'other';
}

/** Construct confidence boxes from model outputs in original-image coordinates. */
function makeDetections(){
  data.detections.forEach((detection,index)=>{
    const [l,t,r,b]=detection.box;
    const points=[[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>new THREE.Vector3(
      (x/data.imageWidth-.5)*3.5,(.5-y/data.imageHeight)*data.surface.height,.018));
    const box=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({color:detection.label==='person'?0xf49da7:0x64d9ec}));
    boxGroup.add(box);
    const element=document.createElement('span');
    element.className='scene-label detection-label';
    element.textContent=`${detection.label} ${detection.score.toFixed(2)}`;
    document.querySelector('#scene-labels').append(element);
    labels.push({element,point:points[1],index});
  });
  geometryGroup.add(boxGroup);
}

/** Sample RGB values and real depth into a point cloud, preserving source UVs. */
function makePoints(){
  const gw=data.gridWidth,gh=data.gridHeight;
  const sampleCanvas=document.createElement('canvas');
  sampleCanvas.width=gw;sampleCanvas.height=gh;
  const context=sampleCanvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(photoTexture.image,0,0,gw,gh);
  const rgb=context.getImageData(0,0,gw,gh).data;
  const flat=[],spatial=[],colors=[],groups=[];
  const groupNames=['other','road','trees','vehicles','buildings','water','sky'];
  for(let row=0;row<gh;row++)for(let col=0;col<gw;col++){
    const i=row*gw+col,u=col/(gw-1),v=row/(gh-1);
    const x=(u-.5)*3.5,y=(.5-v)*data.surface.height;
    const z=(depthGrid[i]-.5)*3.6,factor=(8-z)/8;
    flat.push(x,y,0);spatial.push(x*factor,y*factor,z);
    const color=new THREE.Color().setRGB(rgb[i*4]/255,rgb[i*4+1]/255,rgb[i*4+2]/255,THREE.SRGBColorSpace);
    colors.push(color.r,color.g,color.b);
    groups.push(groupNames.indexOf(groupOf(classGrid[i])));
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(spatial,3));
  geometry.setAttribute('aFlat',new THREE.Float32BufferAttribute(flat,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('aGroup',new THREE.Float32BufferAttribute(groups,1));
  pointMaterial=new THREE.ShaderMaterial({
    vertexColors:true,transparent:true,depthWrite:true,
    uniforms:{uStrength:{value:.85},uSize:{value:2},uFilter:{value:-1}},
    vertexShader:`attribute vec3 aFlat; attribute float aGroup;
      uniform float uStrength; uniform float uSize; uniform float uFilter;
      varying vec3 vColor; varying float vAlpha;
      void main(){vColor=color; vAlpha=(uFilter<0.0||abs(aGroup-uFilter)<0.1)?1.0:0.08;
        vec3 p=mix(aFlat,position,uStrength);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;gl_PointSize=uSize*(8.0/-mv.z);}`,
    fragmentShader:`varying vec3 vColor; varying float vAlpha;
      void main(){if(length(gl_PointCoord-0.5)>0.48)discard;
        gl_FragColor=vec4(vColor,vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  pointCloud=new THREE.Points(geometry,pointMaterial);
  pointCloud.frustumCulled=false;
  geometryGroup.add(pointCloud);
}

/** Project detection labels with overlap suppression; all boxes remain visible. */
function updateLabels(){
  const occupied=[];
  labels.forEach(label=>{
    if(state.mode!=='objects'){label.element.style.opacity='0';return;}
    projected.copy(label.point);
    geometryGroup.localToWorld(projected);
    projected.project(camera);
    const x=(projected.x*.5+.5)*viewport.clientWidth;
    const y=(-projected.y*.5+.5)*viewport.clientHeight;
    const rect={x:clamp(x,4,viewport.clientWidth-95),y:clamp(y,28,viewport.clientHeight-55)};
    const overlaps=occupied.some(other=>Math.abs(other.x-rect.x)<100&&Math.abs(other.y-rect.y)<24);
    label.element.style.opacity=overlaps?'0':'1';
    if(!overlaps)occupied.push(rect);
    label.element.style.left=`${rect.x}px`;label.element.style.top=`${rect.y}px`;
  });
}

/** Morph the depth-derived meshes as one coherent scene, then sleep once settled. */
function render(time){
  state.frame=0;
  if(!state.ready||!state.visible||document.hidden)return;
  const dt=state.last?Math.min((time-state.last)/1000,.05):1/60;
  state.last=time;
  const a=reduced.matches?1:1-Math.exp(-10*dt);
  const spatial=state.mode==='spatial';
  const target=spatial?state.strength:0;
  state.currentStrength+=(target-state.currentStrength)*a;
  state.currentYaw+=(state.yaw-state.currentYaw)*a;
  state.currentPitch+=(state.pitch-state.currentPitch)*a;
  geometryGroup.rotation.set(state.currentPitch,state.currentYaw,0);
  model.visible=(spatial&&!state.points)||state.mode==='semantics';
  photoPlane.visible=['original','objects','depth'].includes(state.mode);
  photoPlane.material.map=state.mode==='depth'?depthTexture:photoTexture;
  boxGroup.visible=state.mode==='objects';
  pointCloud.visible=state.mode==='pixels'||(spatial&&state.points);
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=state.currentStrength;
    const selected=state.filter==='all'||mesh.name===state.filter||mesh.parent?.name===state.filter;
    mesh.material.opacity=selected?1:.10;
    mesh.material.transparent=!selected;
    mesh.material.depthWrite=selected;
    mesh.material.map=state.mode==='semantics'?model.userData.semantics:model.userData.photo;
    mesh.material.emissiveMap=mesh.material.map;
    mesh.material.emissiveIntensity=state.mode==='semantics'?.8:.35;
  });
  pointMaterial.uniforms.uStrength.value=state.mode==='pixels'?0:state.currentStrength;
  pointMaterial.uniforms.uSize.value=(state.mode==='pixels'?2.2:1.8)*renderer.getPixelRatio();
  pointMaterial.uniforms.uFilter.value=state.filter==='all'?-1:['other','road','trees','vehicles','buildings','water','sky'].indexOf(state.filter);
  geometryGroup.updateMatrixWorld(true);
  renderer.render(scene,camera);
  updateLabels();
  if(Math.abs(target-state.currentStrength)+Math.abs(state.yaw-state.currentYaw)+Math.abs(state.pitch-state.currentPitch)>.0005)invalidate();
}

/** Select a representation with text that describes the actual source of its data. */
function setMode(mode){
  if(!descriptions[mode])return;
  state.mode=mode;state.manual=true;state.filter='all';
  state.yaw=mode==='spatial'?-.38:0;state.pitch=mode==='spatial'?.10:0;
  modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===mode)));
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter==='all')));
  document.querySelector('#view-title').textContent=descriptions[mode][0];
  document.querySelector('#view-description').textContent=mode==='objects'
    ?`${data.detections.length} detections at confidence ≥ 0.40. RT-DETR predictions; small objects may be missed or misclassified.`
    :descriptions[mode][1];
  document.querySelector('#semantic-controls').hidden=!['semantics','spatial'].includes(mode);
  document.querySelector('#geometry-controls').hidden=mode!=='spatial';
  slider.closest('.separation-control').hidden=mode!=='spatial';
  document.querySelector('#depth-legend').hidden=mode!=='depth';
  document.querySelector('#scene-help').textContent=mode==='spatial'
    ?'Drag to orbit · Arrow keys also work':'Click a representation below to explore';
  if(reduced.matches&&mode==='spatial')document.querySelector('#scene-help').textContent='Drag or use arrow keys · Motion reduced';
  invalidate();
}

/** Isolate semantic categories without confusing class masks with object detections. */
function setFilter(filter){
  state.filter=filter;
  filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
  const names={all:'All semantic classes',road:'Road',trees:'Trees and plants',vehicles:'Vehicles'};
  document.querySelector('#view-description').textContent=filter==='all'?descriptions[state.mode][1]
    :`${names[filter]} highlighted from the predicted semantic labels. Other regions are dimmed; model errors remain visible.`;
  invalidate();
}

/** Restore the default depth reconstruction and camera orientation. */
function reset(){
  state.strength=.85;state.points=false;slider.value='85';
  document.querySelector('#separation-value').value='85%';
  document.querySelector('#point-toggle').setAttribute('aria-pressed','false');
  setMode('spatial');state.manual=false;
}

/** Adjust how far the true depth estimate morphs away from the image plane. */
function changeDepth(){
  state.manual=true;state.strength=Number(slider.value)/100;
  document.querySelector('#separation-value').value=`${slider.value}%`;invalidate();
}

/** Gently unfold the initial representation while preserving ordinary page scroll. */
function scroll(){
  if(!state.ready||state.manual||reduced.matches||state.mode!=='spatial')return;
  const top=document.querySelector('#home').getBoundingClientRect().top;
  state.strength=clamp(.85+Math.max(0,-top)/1400,.85,1);
  slider.value=String(Math.round(state.strength*100));
  document.querySelector('#separation-value').value=`${slider.value}%`;invalidate();
}

/** Begin a potential orbit gesture without preventing normal vertical scrolling. */
function down(event){
  if(event.button!==0)return;
  state.drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:state.yaw,pitch:state.pitch,moved:false};
  canvas.setPointerCapture(event.pointerId);
}

/** Orbit the reconstructed surface within the limits of single-view geometry. */
function move(event){
  const drag=state.drag;if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
  if(!['spatial','pixels'].includes(state.mode))return;
  state.yaw=clamp(drag.yaw+dx*.004,-.85,.75);
  state.pitch=clamp(drag.pitch+dy*.002,-.3,.4);invalidate();
}

/** Inspect the semantic class beneath a click using mesh UV coordinates. */
function up(event){
  const drag=state.drag;state.drag=null;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(!drag||drag.moved||!['semantics','spatial'].includes(state.mode)||state.points)return;
  const rect=canvas.getBoundingClientRect();
  pickPosition.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  pickRay.setFromCamera(pickPosition,camera);
  const hit=pickRay.intersectObject(model,true)[0];
  if(!hit?.uv)return;
  const col=clamp(Math.round(hit.uv.x*(data.gridWidth-1)),0,data.gridWidth-1);
  const row=clamp(Math.round((1-hit.uv.y)*(data.gridHeight-1)),0,data.gridHeight-1);
  const classId=classGrid[row*data.gridWidth+col];
  const category=data.classes.find(item=>item.id===classId);
  if(category)document.querySelector('#view-description').textContent=`Predicted class: ${category.name}. Image coordinate (${Math.round(hit.uv.x*data.imageWidth)}, ${Math.round((1-hit.uv.y)*data.imageHeight)}) px. SegFormer output.`;
}

/** Clear an incomplete drag when the browser takes over a gesture. */
function cancelDrag(){state.drag=null;}

/** Provide discrete keyboard orbit and reset controls. */
function key(event){
  const delta={ArrowLeft:[-.09,0],ArrowRight:[.09,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]};
  if(event.key==='Home'||event.key==='Escape'){event.preventDefault();reset();}
  else if(delta[event.key]&&['spatial','pixels'].includes(state.mode)){
    event.preventDefault();state.yaw=clamp(state.yaw+delta[event.key][0],-.85,.75);
    state.pitch=clamp(state.pitch+delta[event.key][1],-.3,.4);invalidate();
  }
}

/** Pause all frames while the tab is hidden, then repaint when it returns. */
function visibility(){cancelDrag();cancelAnimationFrame(state.frame);state.frame=0;state.last=0;invalidate();}

/** Update motion behaviour immediately when the OS preference changes. */
function motionChange(){
  if(state.mode==='spatial')document.querySelector('#scene-help').textContent=reduced.matches
    ?'Drag or use arrow keys · Motion reduced':'Drag to orbit · Arrow keys also work';
  invalidate();
}

/** Stop rendering when the scene scrolls off screen. */
function intersection(entries){
  state.visible=entries[0].isIntersecting;
  if(!state.visible){cancelAnimationFrame(state.frame);state.frame=0;state.last=0;}else invalidate();
}

/** Fetch local binary data with an explicit timeout and actionable failure. */
async function readAsset(path,type){
  const response=await fetch(path,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return type==='json'?response.json():response.arrayBuffer();
}

/** Load the actual model outputs and Blender surface, then enable interaction. */
async function initialize(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    scene=new THREE.Scene();scene.background=new THREE.Color(0x101416);
    camera=new THREE.PerspectiveCamera(40,1,.1,40);camera.position.set(0,0,8);
    scene.add(new THREE.HemisphereLight(0xe4f3f7,0x24333c,1.8));
    const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(-2,4,6);scene.add(light);
    scene.add(geometryGroup);
    const results=await Promise.all([
      readAsset('./assets/perception/analysis.json','json'),
      readAsset('./assets/perception/depth-grid.bin','binary'),
      readAsset('./assets/perception/class-grid.bin','binary'),
      new THREE.TextureLoader().loadAsync('./las-vegas.jpeg'),
      new THREE.TextureLoader().loadAsync('./assets/perception/semantics.webp'),
      new THREE.TextureLoader().loadAsync('./assets/perception/depth.webp'),
      new GLTFLoader().loadAsync('./assets/perception/scene.glb?v=2'),
    ]);
    [data]=results;depthGrid=new Float32Array(results[1]);classGrid=new Uint8Array(results[2]);
    [photoTexture,semanticTexture,depthTexture]=results.slice(3,6);
    for(const texture of [photoTexture,semanticTexture,depthTexture]){
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    }
    model=results[6].scene;
    // glTF UVs use a top-left image origin; replacement textures must match it.
    const replacementPhoto=photoTexture.clone();replacementPhoto.flipY=false;
    const replacementSemantics=semanticTexture.clone();replacementSemantics.flipY=false;
    model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      mesh.material=mesh.material.clone();mesh.material.side=THREE.DoubleSide;
      mesh.material.map=replacementPhoto;mesh.material.emissiveMap=replacementPhoto;
    });
    // The raster plane keeps standard UVs; the surface uses glTF texture orientation.
    photoPlane=new THREE.Mesh(new THREE.PlaneGeometry(3.5,data.surface.height),new THREE.MeshBasicMaterial({map:photoTexture}));
    geometryGroup.add(photoPlane,model);
    makeDetections();makePoints();
    // Save the surface-oriented textures separately from the source plane texture.
    model.userData.photo=replacementPhoto;model.userData.semantics=replacementSemantics;
    modeButtons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.view)));
    filterButtons.forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
    document.querySelector('#point-toggle').addEventListener('click',()=>{
      state.points=!state.points;document.querySelector('#point-toggle').setAttribute('aria-pressed',String(state.points));invalidate();
    });
    slider.addEventListener('input',changeDepth);
    document.querySelector('#reset-view').addEventListener('click',reset);
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelDrag);
    canvas.addEventListener('lostpointercapture',cancelDrag);canvas.addEventListener('keydown',key);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback(new Error('WebGL context lost; reload to retry.'));});
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',cancelDrag);
    window.addEventListener('scroll',scroll,{passive:true});reduced.addEventListener('change',motionChange);
    new ResizeObserver(resize).observe(viewport);new IntersectionObserver(intersection,{rootMargin:'40px'}).observe(viewport);
    state.ready=true;canvas.hidden=false;controls.hidden=false;poster.classList.add('is-loaded');
    document.querySelector('#reset-view').hidden=false;status.textContent='2D → 3D / interactive';
    setMode('spatial');state.manual=false;resize();invalidate();
  }catch(error){fallback(error);}
}

initialize();
