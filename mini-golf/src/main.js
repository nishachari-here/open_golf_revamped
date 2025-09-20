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
  }}

  // friction
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
