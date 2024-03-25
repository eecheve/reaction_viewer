import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ircImages from './public/json/eb01.json' assert { type: 'json' }

//** Reference vectors and scalars */
const distanceFromOrigin = 10;
const cameraOffset = 2;
const viewportSize = 0.5;
const origin = new THREE.Vector3(0,0,0);
const forward = new THREE.Vector3(1,0,0);
const right = new THREE.Vector3(0,1,0);
const up = new THREE.Vector3(0,0,1);

//** Reference materials */
const forwardMat = new THREE.LineBasicMaterial({color: 0x58f941});
const rightMat = new THREE.LineBasicMaterial({color: 0xef2770});
const upMat = new THREE.LineBasicMaterial({color: 0x273cef});

//** possible image paths */
const frontGS = "/public/templates/front_gs.png";
const frontTS = "/public/templates/front_ts.png";
const frontPR = "/public/templates/front_pr.png";
const rightGS = "/public/templates/right_gs.png";
const rightTS = "/public/templates/right_ts.png";
const rightPR = "/public/templates/right_pr.png";
const leftGS = "/public/templates/left_gs.png";
const leftTS = "/public/templates/left_ts.png";
const leftPR = "/public/templates/left_pr.png";
const upGS = "/public/templates/up_gs.png";
const upTS = "/public/templates/up_ts.png";
const upPR = "/public/templates/up_pr.png";
const backGS = "/public/templates/back_gs.png";
const backTS = "/public/templates/back_ts.png";
const backPR = "/public/templates/back_pr.png";
const downGS = "/public/templates/down_gs.png";
const downTS = "/public/templates/down_ts.png";
const downPR = "/public/templates/down_pr.png";

//** Default image paths */
var gsImage = "/public/templates/right_gs.png";
var tsImage = "/public/templates/right_ts.png";
var prImage = "/public/templates/right_pr.png";


//** Properties & Constants */
const fieldOfView = 45, near=1, far=1000;
const glbLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const raycaster = new THREE.Raycaster();
const cameraDirection = new THREE.Vector3();

//** HTML elements */
const slider = document.getElementById("AnimationSlider");
const viewportImage = document.getElementById("ViewportImage");
const aboutSim = document.getElementById("about_sim");
const viewportGif = document.getElementById("ViewportGif");
const currentlySeeingText = document.getElementById("currentlySeeingText");
const buttonTextEmphasis = document.getElementById("buttonTextEmphasis");
const button2D = document.getElementById("2d_button");
const buttonIRC = document.getElementById("irc_button");
const buttonAbout = document.getElementById("about_button");

//** Button text descriptions */
const button2DText = "The 2D representation to the right changes both when you rotate the 3D model, and when moving back and forth between the ground state, the transition state, and the product.";
const buttonIRCText = "The geometry changes for the 3D model as the intrinsic reaction coordinate progresses.";
const buttonAboutText = "The brief description about the level of theory implemented in the calculation that led to the 3D model seen here.";

let helperCubesArray = [];
let mixer, animationLength; //animation properties
let scene, camera, renderer, controls; //scene properties

var aspectRatio = window.innerWidth/window.innerHeight; //render properties

function init(){
  //** Scene */
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x212a20 );
  scene.add( new THREE.AmbientLight( 0xaaaaaa ) );
  
  //** Camera */
  camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, near, far);
  camera.position.set(0,0,distanceFromOrigin-cameraOffset);
  scene.add(camera);

  //** Lights */
  const light = new THREE.SpotLight( 0xffffff, 10000 );
  light.position.set( 0, 25, 50 );
  light.angle = Math.PI / 9;
  light.castShadow = true;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 10;
  light.shadow.mapSize.width = 256;
  light.shadow.mapSize.height = 256;
  camera.add(light); //the light is a child of the camera to be able to follow it.

  //** Renderer */
  renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth*viewportSize, window.innerHeight*viewportSize);
  document.getElementById('webgl').appendChild(renderer.domElement);
 
  //** Controls */
  controls = new OrbitControls(camera, renderer.domElement);
 
  //** UI */
  changeButtonColors(button2D, buttonAbout, buttonIRC);
  aboutSim.style.display = 'none';
  viewportGif.style.display = 'none';
    
  //** Events */
  document.addEventListener('click', onClick);
  button2D.addEventListener('click', view2DClick);
  buttonAbout.addEventListener('click', aboutClick);
  buttonIRC.addEventListener('click', ircClick);

  //** Reference objects */
  addReferenceLines(); //<-- uncomment this line to debug directions
  addReferenceCubes(); //cubes necessary for raycast detection logic
  makeHelperCubesInvisible(); //<-- uncomment this line during production
    
  //** Loading GLB Object */
  loadFBXObject('EB01', 'public/imports/EB01.fbx', new THREE.Vector3(), new THREE.Euler(), 0.01);
}

slider.oninput = function() {
  var percentage = this.value/100; //getting value from slider
  mixer.setTime(animationLength*percentage); //updating animation time
  sliderLogic(this.value);
}

function sliderLogic(sliderValue){
  if(sliderValue <= 33){
    if(viewportImage.src == gsImage){
      return;
    }
    else{
      viewportImage.src = gsImage;
      currentlySeeingText.textContent = "ground state";
    }
  }
  else if(sliderValue > 33 && sliderValue <=66){
    if(viewportImage.src == tsImage){
      return;
    }
    else{
      viewportImage.src = tsImage;
      currentlySeeingText.textContent = "transition state";
    }
  }
  else{
    if(viewportImage.src == prImage){
      return;
    }
    else{
      viewportImage.src = prImage;
      currentlySeeingText.textContent = "product";
    }
  }
}

function addCube(name, position, material){
  const cubeGeom = new THREE.BoxGeometry(1,1,1);
  const cube = new THREE.Mesh(cubeGeom, material);
  cube.position.copy(position);
  cube.name = name;
  cube.scale.setScalar(distanceFromOrigin);
  scene.add(cube);
  return cube;
}

function updateViewerPerspective() {
  camera.getWorldDirection(cameraDirection);
  raycaster.set(camera.position, cameraDirection);
  const intersects = raycaster.intersectObjects(helperCubesArray);

  if (intersects.length > 0) {
    const intersectedCube = intersects[0].object; // Closest intersected object
    switch(intersectedCube.name) {
      case 'frontCube':
        console.log("front cube");
        updateImageSet(frontGS, frontTS, frontPR);
        sliderLogic(slider.value);
        break;
      case 'rightCube':
        console.log("right cube");
        updateImageSet(rightGS, rightTS, rightPR);
        sliderLogic(slider.value);
        break;
      case 'upCube':
        console.log("up cube");
        updateImageSet(upGS, upTS, upPR);
        sliderLogic(slider.value);
        break;
      case 'backCube':
        console.log("back cube");
        updateImageSet(backGS, backTS, backPR);
        sliderLogic(slider.value);
        break;
      case 'leftCube':
        console.log("left cube");
        updateImageSet(leftGS, leftTS, leftPR);
        sliderLogic(slider.value);
        break;
      case 'downCube':
        console.log("up cube");
        updateImageSet(downGS, downTS, downPR);
        sliderLogic(slider.value);
        break;
    }
  }
}

function updateImageSet(newGSPath, newTSPath, newPRPath){
  if(gsImage == newGSPath){
    return;
  }
  else{
    gsImage = newGSPath;
    tsImage = newTSPath;
    prImage = newPRPath;
  }
}

function update() {
	renderer.render(scene, camera);
  controls.update(); //to drag and drop the camera to see the object
  updateViewerPerspective();
  requestAnimationFrame(update); //function pauses everytime user goes to another tab
}

function addReferenceLines(){
  const fPoints = [];
  const rPoints = [];
  const uPoints = [];

  fPoints.push(origin);
  rPoints.push(origin);
  uPoints.push(origin);

  fPoints.push(forward);
  rPoints.push(right);
  uPoints.push(up);  

  const fGeom = new THREE.BufferGeometry().setFromPoints(fPoints);
  const rGeom = new THREE.BufferGeometry().setFromPoints(rPoints);
  const uGeom = new THREE.BufferGeometry().setFromPoints(uPoints);

  const fLine = new THREE.Line(fGeom, forwardMat);
  const rLine = new THREE.Line(rGeom, rightMat);
  const uLine = new THREE.Line(uGeom, upMat);

  scene.add(fLine);
  scene.add(rLine);
  scene.add(uLine);
}

function addReferenceCubes(){
  helperCubesArray.push(addCube("frontCube", forward.clone().multiplyScalar(distanceFromOrigin), forwardMat));
  helperCubesArray.push(addCube("rightCube", right.clone().multiplyScalar(distanceFromOrigin), rightMat));
  helperCubesArray.push(addCube("upCube", up.clone().multiplyScalar(distanceFromOrigin), upMat));
  helperCubesArray.push(addCube("downCube", up.clone().multiplyScalar(distanceFromOrigin*-1), upMat));
  helperCubesArray.push(addCube("leftCube", right.clone().multiplyScalar(distanceFromOrigin*-1), rightMat));
  helperCubesArray.push(addCube("backCube", forward.clone().multiplyScalar(distanceFromOrigin*-1), forwardMat));
}

function makeHelperCubesInvisible(){
  // for (var cube in helperCubesArray){
  //   cube.visible = false;
  // } //<---- how to do this in javascript!?
  helperCubesArray[0].visible = false;
  helperCubesArray[1].visible = false;
  helperCubesArray[2].visible = false;
  helperCubesArray[3].visible = false;
  helperCubesArray[4].visible = false;
  helperCubesArray[5].visible = false;
}

function onClick(event){
  console.log('clicked');
  for (const i in ircImages){
    const obj = ircImages[i];
    console.log(obj.name);
  }
}

function changeButtonColors(bOn, bOff1, bOff2){
  bOn.style.backgroundColor = '#75e87fff';
  bOff1.style.background = "#ddddddff";
  bOff2.style.background = "#ddddddff";
}

function view2DClick(){
  changeButtonColors(button2D, buttonAbout, buttonIRC);
  controls.reset();
  slider.value = 50;
  viewportImage.style.display = 'inline';
  aboutSim.style.display = 'none';
  viewportGif.style.display = 'none';
  buttonTextEmphasis.textContent = button2DText;
}
function aboutClick(){
  changeButtonColors(buttonAbout, button2D, buttonIRC);
  controls.reset();
  slider.value = 50;
  viewportImage.style.display = 'none';
  aboutSim.style.display = 'inline';
  viewportGif.style.display = 'none';
  buttonTextEmphasis.textContent = buttonAboutText;
}
function ircClick(){
  changeButtonColors(buttonIRC, button2D, buttonAbout);
  controls.reset();
  slider.value = 50;
  viewportImage.style.display = 'none';
  aboutSim.style.display = 'none';
  viewportGif.style.display = 'inline';
  buttonTextEmphasis.textContent = buttonIRCText;
}

function loadGLBObject(objectName, objectPath, globalPosition, globalRotation, relativeScale){
  glbLoader.load(
    objectPath,
    function(gltf){
      const model = gltf.scene;
      model.name = objectName;
      model.position.set(globalPosition.x, globalPosition.y, globalPosition.z); //copy does not work
      model.rotation.set(globalRotation.x, globalRotation.y, globalRotation.z); //copy does not work
      model.scale.setScalar(relativeScale);
      scene.add(model);

      if(gltf.animations.length >0){
        mixer = new THREE.AnimationMixer(model);
        animationLength = gltf.animations[0].duration;
        mixer.clipAction(gltf.animations[0]).play();
      }
    },
    function(xhr){
      console.log((xhr.loaded/xhr.total*100) + '% loaded');
    },
    function(error){
      console.log('There was an error loading the file');
    }
  );
}

function loadFBXObject(objectName, objectPath, globalPosition, globalRotation, relativeScale){
  fbxLoader.load(
    objectPath,
    (object) => {
      object.name = objectName;
      object.position.set(globalPosition.x, globalPosition.y, globalPosition.z);
      object.rotation.set(globalRotation.x, globalRotation.y, globalRotation.z);
      object.scale.setScalar(relativeScale);
      scene.add(object)

      if(object.animations.length > 0){
        console.log("while loading fbx, animation found");
        mixer = new THREE.AnimationMixer(object);
        animationLength = object.animations[0].duration;
        mixer.clipAction(object.animations[0]).play();
      }
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
      console.log(error)
    }
  )
}

if ( WebGL.isWebGLAvailable() ) {
	init();
  update();
} else {
	const warning = WebGL.getWebGLErrorMessage();
	document.getElementById('container').appendChild( warning );
}