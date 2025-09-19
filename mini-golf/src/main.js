import './style.css'
import { setupCounter } from './counter.js'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// gameplay state
const gameState = {
  currentHole: 1,
  totalHoles: 2,
  strokes: 0,
  par: [3, 4],
  levelObjects: [],
  waitingForContinue: false
};

// canvas + renderer
const canvas = document.querySelector('#bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// camera + scene
const scene = new THREE.Scene();
const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
camera.position.set(0, 20, 40);
camera.lookAt(0, 0, 0);

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2;

// skybox
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  './bg/rainbow_lf.png',
  './bg/rainbow_rt.png',
  './bg/rainbow_up.png',
  './bg/rainbow_dn.png',
  './bg/rainbow_ft.png',
  './bg/rainbow_bk.png',
]);

const loader = new GLTFLoader();

// physics
let isDragging = false;
let dragStart = new THREE.Vector2();
let arrowHelper = null;
let ballVelocity = new THREE.Vector3(0, 0, 0);
const friction = 0.99;
let inHole = false;

// raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// overlays
const continueOverlay = document.createElement('div');
continueOverlay.style.position = 'absolute';
continueOverlay.style.top = '50%';
continueOverlay.style.left = '50%';
continueOverlay.style.transform = 'translate(-50%, -50%)';
continueOverlay.style.fontSize = '32px';
continueOverlay.style.color = 'white';
continueOverlay.style.display = 'none';
continueOverlay.innerText = 'Level cleared! Press SPACE to continue';
document.body.appendChild(continueOverlay);

// reusable: add and track objects
function addToScene(obj) {
  scene.add(obj);
  gameState.levelObjects.push(obj);
}
function clearLevel() {
  gameState.levelObjects.forEach(o => scene.remove(o));
  gameState.levelObjects = [];
}

// ball
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 });
const golfBall = new THREE.Mesh(ballGeometry, ballMaterial);
golfBall.castShadow = true;
scene.add(golfBall);

// hole + refs
let hole, holeRadius = 1.2, holeDepth = 1;
let lawnWidth = 20, lawnHeight = 60;

// LEVEL LOADING
function loadLevel1() {
  clearLevel();
  inHole = false;
  gameState.waitingForContinue = false;
  continueOverlay.style.display = 'none';

  // Green surface
  const planeGeometry = new THREE.PlaneGeometry(lawnWidth, lawnHeight);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: '#A9D649', side: THREE.DoubleSide });
  const greenSurface = new THREE.Mesh(planeGeometry, planeMaterial);
  greenSurface.rotation.x = -Math.PI / 2;
  greenSurface.receiveShadow = true;
  addToScene(greenSurface);

  // Hole
  const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
  const holeMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });
  hole = new THREE.Mesh(holeGeometry, holeMaterial);
  hole.position.set(0, -holeDepth / 2, -20);
  addToScene(hole);

  // Borders
  const borderWidth = 1, borderHeight = 1;
  const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const topBorder = new THREE.Mesh(new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth), borderMaterial);
  topBorder.position.set(0, borderHeight / 2, -lawnHeight / 2 - borderWidth / 2);
  addToScene(topBorder);
  const bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth), borderMaterial);
  bottomBorder.position.set(0, borderHeight / 2, lawnHeight / 2 + borderWidth / 2);
  addToScene(bottomBorder);
  const leftBorder = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight), borderMaterial);
  leftBorder.position.set(-lawnWidth / 2 - borderWidth / 2, borderHeight / 2, 0);
  addToScene(leftBorder);
  const rightBorder = new THREE.Mesh(new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight), borderMaterial);
  rightBorder.position.set(lawnWidth / 2 + borderWidth / 2, borderHeight / 2, 0);
  addToScene(rightBorder);

  // Flag
  loader.load('./models/low_poly_golf_flag_animated.glb', (gltf) => {
    const flagModel = gltf.scene;
    flagModel.position.set(-2.5, 14.5, -21.5);
    flagModel.scale.set(7.5, 7.5, 7.5);
    addToScene(flagModel);
  });

  // reset ball
  golfBall.position.set(0, 0.5, 20);
}

function loadLevel2() {
  clearLevel();
  inHole = false;
  gameState.waitingForContinue = false;
  continueOverlay.style.display = 'none';

  // placeholder cubes
  for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
    );
    cube.position.set((Math.random() - 0.5) * 30, 1, (Math.random() - 0.5) * 30);
    addToScene(cube);
  }

  golfBall.position.set(0, 0.5, 0);
}

// MOUSE CONTROLS (your original logic)

// Mouse down
window.addEventListener('mousedown', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(golfBall);

  if (intersects.length > 0) {
    isDragging = true;
    dragStart.set(event.clientX, event.clientY);
    controls.enabled = false;
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

  // invert Y so pulling back = forward
  const dir = new THREE.Vector3()
    .addScaledVector(camDir, dragVector.y)
    .addScaledVector(camRight, dragVector.x)
    .normalize();

  if (arrowHelper) scene.remove(arrowHelper);
  const power = dragVector.length() * 0.005;
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

  const power = dragVector.length() * 0.005;
  ballVelocity.copy(dir.multiplyScalar(power));
  gameState.strokes++;
  console.log(`Stroke ${gameState.strokes}`);

  if (arrowHelper) {
    scene.remove(arrowHelper);
    arrowHelper = null;
  }
  controls.enabled = true;
});

// Animate
function animate() {
  requestAnimationFrame(animate);

  controls.target.copy(golfBall.position);
  controls.update();
  renderer.render(scene, camera);

  if (gameState.waitingForContinue) return;
  if (inHole) {
    gameState.waitingForContinue = true;
    continueOverlay.style.display = 'block';
    return;
  }

  golfBall.position.add(ballVelocity);

  // hole detection
  if (hole && !inHole) {
    const holePos3D = new THREE.Vector3(hole.position.x, 0, hole.position.z);
    const ballPos3D = new THREE.Vector3(golfBall.position.x, 0, golfBall.position.z);

    const distXZ = holePos3D.distanceTo(ballPos3D);

    if (distXZ < holeRadius * 0.8 && ballVelocity.length() < 0.05) {
      // snap into hole
      inHole = true;
      ballVelocity.set(0, 0, 0);

      // animate sinking
      const sinkInterval = setInterval(() => {
        golfBall.position.y -= 0.05;
        if (golfBall.position.y <= -holeDepth) {
          golfBall.position.y = -holeDepth;
          clearInterval(sinkInterval);

          // show overlay
          gameState.waitingForContinue = true;
          continueOverlay.style.display = 'block';
          console.log("Ball in hole! Press SPACE to continue.");
        }
      }, 16);
    }
  }


  // walls bounce
  const ballRadius = 0.5;
  const fieldHalfWidth = lawnWidth / 2;
  const fieldHalfHeight = lawnHeight / 2;
  if (golfBall.position.x > fieldHalfWidth - ballRadius) {
    golfBall.position.x = fieldHalfWidth - ballRadius;
    ballVelocity.x *= -0.7;
  }
  if (golfBall.position.x < -fieldHalfWidth + ballRadius) {
    golfBall.position.x = -fieldHalfWidth + ballRadius;
    ballVelocity.x *= -0.7;
  }
  if (golfBall.position.z > fieldHalfHeight - ballRadius) {
    golfBall.position.z = fieldHalfHeight - ballRadius;
    ballVelocity.z *= -0.7;
  }
  if (golfBall.position.z < -fieldHalfHeight + ballRadius) {
    golfBall.position.z = -fieldHalfHeight + ballRadius;
    ballVelocity.z *= -0.7;
  }

  // friction
  ballVelocity.multiplyScalar(friction);
  if (ballVelocity.length() < 0.001) ballVelocity.set(0, 0, 0);
}
animate();

// continue key
window.addEventListener('keydown', (e) => {
  if (!gameState.waitingForContinue) return;
  if (e.code === 'Space') {
    gameState.currentHole++;
    if (gameState.currentHole === 2) {
      loadLevel2();
    }
  }
});

// start game
loadLevel1();
setupCounter(document.querySelector('#counter'))
