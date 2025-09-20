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
  waitingForContinue: false,
  unlockedLevels: 1,
  mode: "title", // "title", "levelSelect", "playing", "waitingForContinue"
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

<<<<<<< Updated upstream
// physics
=======
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

// Level 2 Borders (L-shaped)
const planeGeometry2 = new THREE.PlaneGeometry2(20,40);
const greenSurface2 = new THREE.Mesh(planeGeometry2, planeMaterial);
greenSurface2.rotation.x = -Math.PI / 2;
greenSurface2.receiveShadow = true;
greenSurface2.position.set(0,40,-20);
const rightLGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, 40);
const rightL2 = new THREE.Mesh(rightLGeometry, borderMaterial);
rightL2.position.set(lawnWidth / 2 + borderWidth / 2, borderHeight / 2, -10);
rightL2.castShadow = true;
const topLGeometry = new THREE.BoxGeometry(60 + borderWidth * 2, borderHeight, borderWidth);
const topL2 = new THREE.Mesh(topLGeometry, borderMaterial);
topL2.position.set(0, borderHeight / 2, -lawnHeight / 2 - borderWidth / 2);
topL2.castShadow = true;
const rightLXGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, 20);
const rightLX2 = new THREE.Mesh(rightLXGeometry, borderMaterial);
rightLX2.position.set(, borderHeight / 2, 0);
rightL2.castShadow = true;





// Level transition handler
function handelLevelTransition() 
{
  gameState.currentHole=2
  scene.remove(topBorder,  rightBorder, hole);
  scene.add(greenSurface2, rightL2, topL2);
  golfBall.position.set(10, 0.5, 20);
  hole.position.set(-20, -holeDepth, -40);
  scene.add(hole);
  inHole = false;
}

// Physics variables
>>>>>>> Stashed changes
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
function makeOverlay(id, html) {
  const div = document.createElement('div');
  div.id = id;
  div.style.position = 'absolute';
  div.style.top = '50%';
  div.style.left = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  div.style.fontSize = '28px';
  div.style.color = 'white';
  div.style.textAlign = 'center';
  div.style.display = 'none';
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

const titleOverlay = makeOverlay("titleOverlay", `
  <h1>Mini Golf 3D</h1>
  <button id="playBtn">Play</button>
  <button id="levelSelectBtn">Level Select</button>
`);

const levelSelectOverlay = makeOverlay("levelSelectOverlay", "<h2>Select Level</h2>");

const continueOverlay = makeOverlay("continueOverlay", "Level cleared! Press SPACE to continue");

// New: in-game menu overlay (during play), to allow going back to main menu
const inGameMenuOverlay = document.createElement("div");
inGameMenuOverlay.id = "inGameMenuOverlay";
inGameMenuOverlay.style.position = "absolute";
inGameMenuOverlay.style.top = "20px";   // top margin
inGameMenuOverlay.style.left = "20px";  // left margin
inGameMenuOverlay.style.display = "none";
document.body.appendChild(inGameMenuOverlay);

const backBtn = document.createElement("button");
backBtn.id = "backToMenuBtn";
backBtn.innerText = "⏴ Main Menu";
backBtn.style.padding = "8px 14px";
backBtn.style.fontSize = "16px";
backBtn.style.border = "none";
backBtn.style.borderRadius = "6px";
backBtn.style.background = "#222";
backBtn.style.color = "#fff";
backBtn.style.cursor = "pointer";
backBtn.style.opacity = "0.8";
backBtn.onmouseenter = () => (backBtn.style.opacity = "1");
backBtn.onmouseleave = () => (backBtn.style.opacity = "0.8");
backBtn.onclick = () => {
  showTitle();
};
inGameMenuOverlay.appendChild(backBtn);

// --- NEW RESULT OVERLAY ---
const resultOverlay = document.createElement("div");
resultOverlay.id = "resultOverlay";
resultOverlay.style.position = "absolute";
resultOverlay.style.top = "50%";
resultOverlay.style.left = "50%";
resultOverlay.style.transform = "translate(-50%, -50%)";
resultOverlay.style.fontSize = "36px";
resultOverlay.style.color = "white";
resultOverlay.style.textAlign = "center";
resultOverlay.style.display = "none";
resultOverlay.style.padding = "20px 40px";
resultOverlay.style.borderRadius = "12px";
resultOverlay.style.background = "rgba(0, 0, 0, 0.6)";
document.body.appendChild(resultOverlay);

// --- NEW STROKES OVERLAY ---
const strokesOverlay = document.createElement("div");
strokesOverlay.id = "strokesOverlay";
strokesOverlay.style.position = "absolute";
strokesOverlay.style.top = "20px";
strokesOverlay.style.right = "20px";
strokesOverlay.style.fontSize = "20px";
strokesOverlay.style.color = "white";
strokesOverlay.style.padding = "10px 15px";
strokesOverlay.style.borderRadius = "10px";
strokesOverlay.style.background = "rgba(0,0,0,0.4)";
strokesOverlay.style.display = "none";
document.body.appendChild(strokesOverlay);

// --- POWER BAR WITH SMOOTH ANIMATION ---
const powerBarContainer = document.createElement("div");
powerBarContainer.style.position = "absolute";
powerBarContainer.style.width = "20px";
powerBarContainer.style.height = "150px";
powerBarContainer.style.background = "rgba(0,0,0,0.3)"; // translucent
powerBarContainer.style.borderRadius = "10px";
powerBarContainer.style.display = "none"; // only during drag
document.body.appendChild(powerBarContainer);

const powerBarFill = document.createElement("div");
powerBarFill.style.width = "100%";
powerBarFill.style.height = "0%";
powerBarFill.style.background = "limegreen";
powerBarFill.style.borderRadius = "10px";
powerBarFill.style.position = "absolute";
powerBarFill.style.bottom = "0";
powerBarContainer.appendChild(powerBarFill);

// Smooth animation vars
let targetPower = 0;
let displayedPower = 0;

function updatePowerBar() {
  displayedPower += (targetPower - displayedPower) * 0.1; 
  powerBarFill.style.height = `${Math.min(displayedPower*100, 100)}%`;
  if (isDragging) requestAnimationFrame(updatePowerBar);
}

// helper to get golf term
function getGolfResult(strokes, par) {
  const diff = strokes - par;
  if (strokes === 1) return "Hole-in-One!";
  if (diff <= -2) return "Eagle!";
  if (diff === -1) return "Birdie!";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double Bogey";
  return `${diff} Over Par`;
}

// update strokes overlay
function updateStrokesOverlay() {
  strokesOverlay.innerText = `Strokes: ${gameState.strokes}`;
}

// update level select buttons
function updateLevelSelect() {
  levelSelectOverlay.innerHTML = "<h2>Select Level</h2>";
  for (let i = 1; i <= gameState.totalHoles; i++) {
    const btn = document.createElement("button");
    btn.innerText = `Level ${i}`;
    btn.disabled = i > gameState.unlockedLevels;
    btn.style.margin = "10px";
    btn.onclick = () => {
      startLevel(i);
    };
    levelSelectOverlay.appendChild(document.createElement("br"));
    levelSelectOverlay.appendChild(btn);
  }
  const backBtn = document.createElement("button");
  backBtn.innerText = "Back";
  backBtn.onclick = showTitle;
  levelSelectOverlay.appendChild(document.createElement("br"));
  levelSelectOverlay.appendChild(backBtn);
}

// show/hide methods
function showTitle() {
  gameState.mode = "title";
  titleOverlay.style.display = "block";
  levelSelectOverlay.style.display = "none";
  continueOverlay.style.display = "none";
  inGameMenuOverlay.style.display = "none";
  resultOverlay.style.display = "none";
  strokesOverlay.style.display = "none";
}

function showLevelSelect() {
  gameState.mode = "levelSelect";
  updateLevelSelect();
  titleOverlay.style.display = "none";
  levelSelectOverlay.style.display = "block";
  continueOverlay.style.display = "none";
  inGameMenuOverlay.style.display = "none";
  resultOverlay.style.display = "none";
  strokesOverlay.style.display = "none";
}

function startLevel(n) {
  titleOverlay.style.display = "none";
  levelSelectOverlay.style.display = "none";
  continueOverlay.style.display = "none";
  inGameMenuOverlay.style.display = "none";
  resultOverlay.style.display = "none";
  gameState.mode = "playing";
  gameState.currentHole = n;
  inHole = false;
  gameState.waitingForContinue = false;

  // reset strokes
  gameState.strokes = 0;
  strokesOverlay.style.display = "block";
  updateStrokesOverlay();

  if (n === 1) loadLevel1();
  if (n === 2) loadLevel2();
}

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

  // show in-game menu option
  inGameMenuOverlay.style.display = 'block';
}

// You already have loadLevel2, keep it but also show the in-game menu
function loadLevel2() {
  clearLevel();
  inHole = false;
  gameState.waitingForContinue = false;
  continueOverlay.style.display = 'none';

  for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
    );
    cube.position.set((Math.random() - 0.5) * 30, 1, (Math.random() - 0.5) * 30);
    addToScene(cube);
  }
  golfBall.position.set(0, 0.5, 0);

  inGameMenuOverlay.style.display = 'block';
}

// MOUSE CONTROLS (same as before)
window.addEventListener('mousedown', (event) => {
  if (gameState.mode !== "playing") return;
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

window.addEventListener('mousemove', (event) => {
  if (gameState.mode !== "playing" || !isDragging) return;

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
  targetPower = power; // update target for smooth animation

  if (arrowHelper) scene.remove(arrowHelper);
  const arrowLength = Math.min(power * 5, 10);
  const arrowThickness = 0.1 + Math.min(power * 0.5, 0.5); // dynamically scale thickness
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  arrowHelper = new THREE.ArrowHelper(dir, golfBall.position, arrowLength, 0xff0000, arrowThickness*4, arrowThickness*2);
  scene.add(arrowHelper);

  // Show power bar and position next to ball
  powerBarContainer.style.display = "block";
  const screenPos = golfBall.position.clone().project(camera);
  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth + 30; // offset right
  const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight - powerBarContainer.offsetHeight/2;
  powerBarContainer.style.left = `${x}px`;
  powerBarContainer.style.top = `${y}px`;

  requestAnimationFrame(updatePowerBar);
});

window.addEventListener('mouseup', (event) => {
  if (gameState.mode !== "playing" || !isDragging) return;
  isDragging = false;

  // hide power bar
  powerBarContainer.style.display = "none";
  displayedPower = 0;
  targetPower = 0;

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
  updateStrokesOverlay();
  if (arrowHelper) {
    scene.remove(arrowHelper);
    arrowHelper = null;
  }
  controls.enabled = true;
});

// Animate loop
function animate() {
  requestAnimationFrame(animate);
  controls.target.copy(golfBall.position);
  controls.update();
  renderer.render(scene, camera);

  if (gameState.mode !== "playing") return;
  if (gameState.waitingForContinue) return;

  // Movement physics
  golfBall.position.add(ballVelocity);

  // Hole detection & finish logic
  if (hole && !inHole) {
    const holePosXZ = new THREE.Vector3(hole.position.x, 0, hole.position.z);
    const ballPosXZ = new THREE.Vector3(golfBall.position.x, 0, golfBall.position.z);
    const distXZ = holePosXZ.distanceTo(ballPosXZ);

<<<<<<< Updated upstream
    if (distXZ < holeRadius) { // Ball is over the hole
      // Start falling into hole
      ballVelocity.y = -0.2;

      if (golfBall.position.y > -holeDepth) {
        // Keep falling
        golfBall.position.y += ballVelocity.y;
      } else {
        // Ball has reached bottom
        golfBall.position.y = -holeDepth;
        ballVelocity.set(0, 0, 0);
        inHole = true;

        // Unlock next level if applicable
        if (gameState.currentHole < gameState.totalHoles) {
          gameState.unlockedLevels = Math.max(
            gameState.unlockedLevels,
            gameState.currentHole + 1
          );
        }

        // Show result overlay
        const par = gameState.par[gameState.currentHole - 1];
        const resultText = getGolfResult(gameState.strokes, par);
        resultOverlay.innerText = `${resultText}\n(${gameState.strokes} strokes, Par ${par})\n\nPress SPACE to continue`;
        resultOverlay.style.display = "block";

        // Set game state for continuation
        gameState.waitingForContinue = true;
        gameState.mode = "waitingForContinue";

        console.log("Ball in hole! Press SPACE to continue.");
      }
=======
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
      handelLevelTransition();
>>>>>>> Stashed changes
    }
  }


 if(gameState.currentHole === 1){
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
<<<<<<< Updated upstream
  }}

  // friction
=======
  }
  if (gameState.currentHole === 2) 
  {
  // Get the dimensions of arm1
      const arm1Width = arm1.geometry.parameters.width;
      const arm1Height = arm1.geometry.parameters.depth; // Note: PlaneGeometry's height is BoxGeometry's depth

      // Get the dimensions of arm2
      const arm2Width = arm2.geometry.parameters.width;
      const arm2Height = arm2.geometry.parameters.depth;

      const ballRadius = golfBall.geometry.parameters.radius;

      // Collision for the first arm of the L
      // Check the x-axis
      if (golfBall.position.x > arm1Width / 2 - ballRadius || golfBall.position.x < -arm1Width / 2 + ballRadius) {
        // Check if the ball is within the arm's z-bounds
        if (golfBall.position.z < arm1.position.z + arm1Height / 2 - ballRadius && golfBall.position.z > arm1.position.z - arm1Height / 2 + ballRadius) {
          golfBall.position.x = golfBall.position.x > 0 ? arm1Width / 2 - ballRadius : -arm1Width / 2 + ballRadius;
          ballVelocity.x *= -0.7;
        }
      }

      // Check the z-axis for the first arm of the L
      if (golfBall.position.z > arm1.position.z + arm1Height / 2 - ballRadius || golfBall.position.z < arm1.position.z - arm1Height / 2 + ballRadius) {
        // Check if the ball is within the arm's x-bounds
        if (golfBall.position.x < arm1Width / 2 - ballRadius && golfBall.position.x > -arm1Width / 2 + ballRadius) {
          golfBall.position.z = golfBall.position.z > arm1.position.z ? arm1.position.z + arm1Height / 2 - ballRadius : arm1.position.z - arm1Height / 2 + ballRadius;
          ballVelocity.z *= -0.7;
        
    }
  }
  
  // You would need to add similar logic for arm2 here.
  }
  // Friction
>>>>>>> Stashed changes
  ballVelocity.multiplyScalar(friction);
  if (ballVelocity.length() < 0.001) ballVelocity.set(0, 0, 0);
}

animate();

// continue key
window.addEventListener('keydown', (e) => {
  if (gameState.mode === "waitingForContinue" && e.code === 'Space') {
    resultOverlay.style.display = "none";
    gameState.currentHole++;
    if (gameState.currentHole <= gameState.totalHoles) {
      startLevel(gameState.currentHole);
    } else {
      showTitle();
    }
  }
});

// init
document.getElementById("playBtn").onclick = () => {
  startLevel(1);
};
document.getElementById("levelSelectBtn").onclick = showLevelSelect;
showTitle();
