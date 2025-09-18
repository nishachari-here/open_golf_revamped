import './style.css'
import { setupCounter } from './counter.js'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// canvas element
const canvas = document.querySelector('#bg');
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});

// Set the renderer size
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Camera and scene setup
const scene = new THREE.Scene();
const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 20, 40);
camera.lookAt(0, 0, 0);

//Light Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2;

//skybox
const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader.load([
  './bg/rainbow_lf.png',
  './bg/rainbow_rt.png',
  './bg/rainbow_up.png',
  './bg/rainbow_dn.png',
  './bg/rainbow_ft.png',
  './bg/rainbow_bk.png',
]);
scene.background = skyboxTexture;

const loader = new GLTFLoader();

// Green surface
const planeGeometry = new THREE.PlaneGeometry(20, 60);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: '#A9D649',
  side: THREE.DoubleSide
});
const greenSurface = new THREE.Mesh(planeGeometry, planeMaterial);
greenSurface.rotation.x = -Math.PI / 2;
greenSurface.receiveShadow = true;
scene.add(greenSurface);

// Hole (bigger + deeper)
const holeRadius = 1.2;
const holeDepth = 1;
const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
const holeMaterial = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a,
  side: THREE.DoubleSide
});
const hole = new THREE.Mesh(holeGeometry, holeMaterial);
hole.position.set(0, -holeDepth / 2, -20);
scene.add(hole);

// Load GLTF model
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

// Golf ball
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.4,
  metalness: 0.2
});
const golfBall = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(golfBall);
golfBall.position.set(0, 0.5, 20);
golfBall.castShadow = true;

// Models
const modelPaths = [
  './models/low_poly_golf_flag_animated.glb',
];

// Borders
const lawnWidth = 20;
const lawnHeight = 60;
const borderWidth = 1;
const borderHeight = 1;

const borderMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513
});

// Top Border
const topBorderGeometry = new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth);
const topBorder = new THREE.Mesh(topBorderGeometry, borderMaterial);
topBorder.position.set(0, borderHeight / 2, -lawnHeight / 2 - borderWidth / 2);
topBorder.castShadow = true;
scene.add(topBorder);

// Bottom Border
const bottomBorderGeometry = new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth);
const bottomBorder = new THREE.Mesh(bottomBorderGeometry, borderMaterial);
bottomBorder.position.set(0, borderHeight / 2, lawnHeight / 2 + borderWidth / 2);
bottomBorder.castShadow = true;
scene.add(bottomBorder);

// Left Border
const leftBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight);
const leftBorder = new THREE.Mesh(leftBorderGeometry, borderMaterial);
leftBorder.position.set(-lawnWidth / 2 - borderWidth / 2, borderHeight / 2, 0);
leftBorder.castShadow = true;
scene.add(leftBorder);

// Right Border
const rightBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight);
const rightBorder = new THREE.Mesh(rightBorderGeometry, borderMaterial);
rightBorder.position.set(lawnWidth / 2 + borderWidth / 2, borderHeight / 2, 0);
rightBorder.castShadow = true;
scene.add(rightBorder);

// Physics variables
let isDragging = false;
let dragStart = new THREE.Vector2();
let arrowHelper = null;
let ballVelocity = new THREE.Vector3(0, 0, 0);
const friction = 0.99;
let inHole = false;

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Mouse down
window.addEventListener('mousedown', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(golfBall);

  if (intersects.length > 0) {
    isDragging = true;
    dragStart.set(event.clientX, event.clientY);

    controls.enabled = false; // freeze camera while aiming

    if (arrowHelper) {
      scene.remove(arrowHelper);
      arrowHelper = null;
    }
  }
});

// Mouse move
window.addEventListener('mousemove', (event) => {
  if (!isDragging) return;

  const dragEnd = new THREE.Vector2(event.clientX, event.clientY);
  const dragVector = new THREE.Vector2().subVectors(dragEnd, dragStart);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();

  const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize();

  // Pull back = forward (invert Y only)
  const dir = new THREE.Vector3()
    .addScaledVector(camDir, dragVector.y)
    .addScaledVector(camRight, dragVector.x)
    .normalize();

  if (arrowHelper) scene.remove(arrowHelper);

  const power = dragVector.length() * 0.005; // reduced power
  arrowHelper = new THREE.ArrowHelper(dir, golfBall.position, power * 5, 0xff0000, 2, 2);
  scene.add(arrowHelper);
});

// Mouse up
window.addEventListener('mouseup', (event) => {
  if (!isDragging) return;
  isDragging = false;

  const dragEnd = new THREE.Vector2(event.clientX, event.clientY);
  const dragVector = new THREE.Vector2().subVectors(dragEnd, dragStart);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();

  const camRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize();

  const dir = new THREE.Vector3()
    .addScaledVector(camDir, dragVector.y)
    .addScaledVector(camRight, dragVector.x)
    .normalize();

  const power = dragVector.length() * 0.005; // reduced power
  ballVelocity.copy(dir.multiplyScalar(power));

  if (arrowHelper) {
    scene.remove(arrowHelper);
    arrowHelper = null;
  }

  controls.enabled = true; // re-enable camera after shot
});

// Load models
Promise.all(modelPaths.map(path => loadModel(path)))
  .then(models => {
    const flagModel = models[0].scene;
    flagModel.position.set(-2.5, 14.5, -21.5);
    flagModel.scale.set(7.5, 7.5, 7.5);
    scene.add(flagModel);
  });

// Animate
function animate() {
  requestAnimationFrame(animate);

  controls.target.copy(golfBall.position);
  controls.update();
  renderer.render(scene, camera);

  if (inHole) return;

  golfBall.position.add(ballVelocity);

  // Hole detection
  const holePos = new THREE.Vector2(hole.position.x, hole.position.z);
  const ballPos = new THREE.Vector2(golfBall.position.x, golfBall.position.z);

  if (ballPos.distanceTo(holePos) < holeRadius * 0.6) {
    if (golfBall.position.y > -holeDepth) {
      golfBall.position.lerp(
        new THREE.Vector3(hole.position.x, -holeDepth, hole.position.z),
        0.1 // controls sinking speed
      );
    } else {
      inHole = true;
      ballVelocity.set(0, 0, 0);
      golfBall.position.set(hole.position.x, -holeDepth, hole.position.z);
      console.log("Ball in hole! 🏌️‍♂️");
    }
  }

  // Bounce with walls
  const fieldHalfWidth = lawnWidth / 2;
  const fieldHalfHeight = lawnHeight / 2;

  if (golfBall.position.x > fieldHalfWidth) {
    golfBall.position.x = fieldHalfWidth;
    ballVelocity.x *= -0.7;
  }
  if (golfBall.position.x < -fieldHalfWidth) {
    golfBall.position.x = -fieldHalfWidth;
    ballVelocity.x *= -0.7;
  }
  if (golfBall.position.z > fieldHalfHeight) {
    golfBall.position.z = fieldHalfHeight;
    ballVelocity.z *= -0.7;
  }
  if (golfBall.position.z < -fieldHalfHeight) {
    golfBall.position.z = -fieldHalfHeight;
    ballVelocity.z *= -0.7;
  }

  // Friction
  ballVelocity.multiplyScalar(friction);
  if (ballVelocity.length() < 0.001) {
    ballVelocity.set(0, 0, 0);
  }
}

// Start loop
animate();

setupCounter(document.querySelector('#counter'))
