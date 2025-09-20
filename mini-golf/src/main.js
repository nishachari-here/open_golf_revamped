import './style.css'
import { setupCounter } from './counter.js'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { add } from 'three/src/nodes/TSL.js';

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
  totalScore: 0, // --- NEW: track total strokes across all levels ---
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
const friction = 0.985; // --- CHANGED: slightly less friction for smoother rolls ---
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

// --- NEW HUD OVERLAY (Hole + Par + Strokes) ---
const hudOverlay = document.createElement("div");
hudOverlay.id = "hudOverlay";
hudOverlay.style.position = "absolute";
hudOverlay.style.top = "20px";
hudOverlay.style.left = "50%";
hudOverlay.style.transform = "translateX(-50%)";
hudOverlay.style.fontSize = "20px";
hudOverlay.style.color = "white";
hudOverlay.style.padding = "10px 15px";
hudOverlay.style.borderRadius = "10px";
hudOverlay.style.background = "rgba(0,0,0,0.4)";
hudOverlay.style.display = "none";
document.body.appendChild(hudOverlay);

function updateHUD() {
  const par = gameState.par[gameState.currentHole - 1];
  hudOverlay.innerText = `Hole ${gameState.currentHole} | Par ${par} | Strokes ${gameState.strokes}`;
}

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
  updateHUD(); // --- simplified: only HUD now ---
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
  inGameMenuOverlay.style.display = "block";
  resultOverlay.style.display = "none";
  gameState.mode = "playing";
  gameState.currentHole = n;
  inHole = false;
  gameState.waitingForContinue = false;

  // reset strokes
  gameState.strokes = 0;
  updateStrokesOverlay();

  // --- NEW: show HUD ---
  hudOverlay.style.display = "block";
  updateHUD();

  if (n === 1) loadLevel1();
  if (n === 2) loadLevel2();
}

// reusable: add and track objects (safe: avoids duplicates)
function addToScene(obj) {
  if (!obj) return;
  // add to scene only if not already present
  if (!scene.children.includes(obj)) scene.add(obj);
  // track for cleanup (avoid duplicate entries)
  if (!gameState.levelObjects.includes(obj)) gameState.levelObjects.push(obj);
}

function clearLevel() {
  // Remove tracked objects from scene and clear the tracker
  gameState.levelObjects.forEach(o => {
    try { scene.remove(o); } catch (e) {}
  });
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

  // reset ball (ensure it's in the scene & tracked for cleanup)
  addToScene(golfBall);
  golfBall.position.set(0, 0.5, 20);
  ballVelocity.set(0, 0, 0);

  // show in-game menu option
  inGameMenuOverlay.style.display = 'block';

}

// You already have loadLevel2, keep it but also show the in-game menu
const arm1Width = 20;
const arm1Height = 40;
const arm2Width = 40;
const arm2Height = 20;

const lawnMaterial = new THREE.MeshStandardMaterial({
  color: '#A9D649',
  side: THREE.DoubleSide
});

// Create the first arm of the 'L'
const arm1Geometry = new THREE.PlaneGeometry(arm1Width, arm1Height);
const arm1 = new THREE.Mesh(arm1Geometry, lawnMaterial);
arm1.rotation.x = -Math.PI / 2;
arm1.position.set(0, 0, 0); // Adjust position to form the 'L'
arm1.receiveShadow = true;

// Create the second arm of the 'L'
const arm2Geometry = new THREE.PlaneGeometry(arm2Width, arm2Height);
const arm2 = new THREE.Mesh(arm2Geometry, lawnMaterial);
arm2.rotation.x = -Math.PI / 2;
arm2.position.set(-10, 0, -30); // Position relative to the first arm
arm2.receiveShadow = true;


const borderMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513 // Brown color for a brick-like look
});

const borderWidth = 1;
const borderHeight = 1;

const arm1RightBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, arm1Height+20);
const arm1RightBorder = new THREE.Mesh(arm1RightBorderGeometry, borderMaterial);
arm1RightBorder.position.set(arm1Width / 2 + borderWidth / 2, borderHeight / 2, -10);
arm1RightBorder.castShadow = true;

 inGameMenuOverlay.style.display = 'block';

const arm1LeftBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, arm1Height);
const arm1LeftBorder = new THREE.Mesh(arm1LeftBorderGeometry, borderMaterial);
arm1LeftBorder.position.set(-arm1Width / 2 - borderWidth / 2, borderHeight / 2, 0);
arm1LeftBorder.castShadow = true;

const bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(arm1Width + borderWidth * 2, borderHeight, borderWidth), borderMaterial);
  bottomBorder.position.set(0, borderHeight / 2, arm1Width / 2 + borderWidth / 2+10);
  
  const arm2LeftBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, arm2Height);
const arm2LeftBorder = new THREE.Mesh(arm2LeftBorderGeometry, borderMaterial);
arm2LeftBorder.position.set(-10 - arm2Width / 2 - borderWidth / 2, borderHeight / 2, -30);
arm2LeftBorder.castShadow = true;

const arm2BottomBorderGeometry = new THREE.BoxGeometry(20, borderHeight, borderWidth);
const arm2Bottom = new THREE.Mesh(arm2BottomBorderGeometry, borderMaterial);
arm2Bottom.position.set(-20, borderHeight / 2, -30 + arm2Height / 2 + borderWidth / 2);
arm2Bottom.castShadow = true;

const arm2TopBorderGeometry = new THREE.BoxGeometry(arm2Width, borderHeight, borderWidth);
const arm2Top = new THREE.Mesh(arm2TopBorderGeometry, borderMaterial);
arm2Top.position.set(-10, 0, -40);
arm2Top.castShadow = true;

 

const triangleLegLength = 20;
const triangleLegWidth = 1; // Same as your border width
const triangleLegHeight = 1; // Same as your border height

const triangleMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513 // Brown color
});

const hypotenuseLength = Math.sqrt(Math.pow(triangleLegLength, 2) + Math.pow(triangleLegLength, 2));

// Create the hypotenuse
const hypotenuseGeometry = new THREE.BoxGeometry(hypotenuseLength, triangleLegHeight, triangleLegWidth);
const hypotenuse = new THREE.Mesh(hypotenuseGeometry, triangleMaterial);

// Position and rotate the hypotenuse
hypotenuse.position.set(0, triangleLegHeight / 2, -30); // Position it at the center of the diagonal
hypotenuse.rotation.y = -Math.PI / 4; // Rotate it by -45 degrees
hypotenuse.castShadow = true;

function loadLevel2() {
  clearLevel();
  inHole = false;
  gameState.waitingForContinue = false;
  continueOverlay.style.display = 'none';
  addToScene(golfBall);
  golfBall.position.set(0, 0.5, 15);
  const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeDepth, 32);
  const holeMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });
  hole = new THREE.Mesh(holeGeometry, holeMaterial);
  hole.position.set(-25, -holeDepth / 2, -30);
  addToScene(hole);
  loader.load('./models/low_poly_golf_flag_animated.glb', (gltf) => {
    const flagModel = gltf.scene;
    flagModel.position.set(-30, 14.5, -30);
    flagModel.scale.set(7.5, 7.5, 7.5);
    addToScene(flagModel);
    addToScene(arm1);
    addToScene(arm2);
    addToScene(arm1RightBorder);
    addToScene(arm1LeftBorder);
    addToScene(bottomBorder);
    addToScene(arm2LeftBorder);
    addToScene(arm2Bottom);
    addToScene(arm2Top);
    addToScene(hypotenuse);
  });
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


// ---- COLLISION HELPERS (paste above animate) ----
function resolveBoxCollision(wall) {
  if (!wall) return;
  const ballRadius = 0.5;
  const ballBox = new THREE.Box3().setFromCenterAndSize(
    golfBall.position.clone(),
    new THREE.Vector3(ballRadius * 2, ballRadius * 2, ballRadius * 2)
  );
  const wallBox = new THREE.Box3().setFromObject(wall);

  if (!wallBox.intersectsBox(ballBox)) return;

  // Closest point on wall box to ball center
  const closest = new THREE.Vector3(
    Math.max(wallBox.min.x, Math.min(golfBall.position.x, wallBox.max.x)),
    Math.max(wallBox.min.y, Math.min(golfBall.position.y, wallBox.max.y)),
    Math.max(wallBox.min.z, Math.min(golfBall.position.z, wallBox.max.z))
  );

  // Direction from closest point to ball center
  const normal = new THREE.Vector3().subVectors(golfBall.position, closest);
  if (normal.lengthSq() === 0) {
    // fallback normal (rare)
    normal.set(0, 1, 0);
  } else {
    normal.normalize();
  }

  // penetration amount
  const distanceToClosest = golfBall.position.distanceTo(closest);
  const penetration = ballRadius - distanceToClosest;
  if (penetration > 0) {
    golfBall.position.addScaledVector(normal, penetration + 0.001); // push outside
    ballVelocity.reflect(normal).multiplyScalar(0.7); // bounce/dampen
  }
}

// Angled finite wall collision (good for the hypotenuse)
function resolveAngledCollision(wall) {
  if (!wall || !wall.geometry) return;
  const ballRadius = 0.5;
  // world-space normal: local +Z is face direction in your hypotenuse setup
  const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();

  // plane built from wall's world position and normal
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, wall.position);

  // signed distance from ball center to plane
  const signedDistance = plane.distanceToPoint(golfBall.position);

  // if ball is further away than radius -> no collision
  if (Math.abs(signedDistance) > ballRadius + 0.001) return;

  // Project ball center onto plane (closest point on infinite plane)
  const projected = golfBall.position.clone().addScaledVector(worldNormal, -signedDistance);

  // Convert that projected point into the wall's local space to check finite extents
  const projectedLocal = projected.clone();
  wall.worldToLocal(projectedLocal);

  // Determine wall half-extents from its geometry (BoxGeometry: width,height,depth)
  let halfX = 0.5, halfY = 0.5, halfZ = 0.5;
  try {
    const p = wall.geometry.parameters;
    // BoxGeometry uses width,height,depth
    halfX = (p.width || p.height || p.depth) / 2;
    halfY = (p.height || p.width || p.depth) / 2;
    halfZ = (p.depth || p.width || p.height) / 2;
  } catch (err) {
    // fallback if geometry parameters not available - use reasonable defaults
    halfX = (typeof hypotenuseLength !== 'undefined') ? hypotenuseLength / 2 : 10;
    halfY = (typeof triangleLegHeight !== 'undefined') ? triangleLegHeight / 2 : 0.5;
    halfZ = (typeof triangleLegWidth !== 'undefined') ? triangleLegWidth / 2 : 0.5;
  }

  // In the wall's local coordinates: x runs along the length, y vertical.
  // If the projected local point lies within the local X & local Y extents (+ballRadius margin) -> collision
  if (projectedLocal.x < -halfX - ballRadius || projectedLocal.x > halfX + ballRadius) return;
  if (projectedLocal.y < -halfY - ballRadius || projectedLocal.y > halfY + ballRadius) return;

  // At this point the ball is intersecting the finite plane (face) region of the wall.
  // Determine the proper outward normal (pointing from wall into the ball)
  const normalUsed = worldNormal.clone();
  if (signedDistance < 0) normalUsed.negate(); // flip if ball is on the opposite side

  // push ball outside along normal by penetration amount
  const penetration = ballRadius - Math.abs(signedDistance);
  if (penetration > 0) {
    golfBall.position.addScaledVector(normalUsed, penetration + 0.001);
    // reflect velocity and damp
    ballVelocity.reflect(normalUsed).multiplyScalar(0.75);
  }
}



// Animate loop
function animate() {
  requestAnimationFrame(animate);
  controls.target.copy(golfBall.position);
  controls.update();
  renderer.render(scene, camera);

  if (gameState.mode !== "playing") return;
  if (gameState.waitingForContinue) return;

  // --- NEW: velocity cap ---
  const maxSpeed = 1.2;
  if (ballVelocity.length() > maxSpeed) {
    ballVelocity.setLength(maxSpeed);
  }

  // Movement physics
  golfBall.position.add(ballVelocity);

// --- FIXED: only clamp if NOT inside hole area ---
if (!inHole) {
  if (hole) {
    const holePosXZ = new THREE.Vector3(hole.position.x, 0, hole.position.z);
    const ballPosXZ = new THREE.Vector3(golfBall.position.x, 0, golfBall.position.z);
    const distXZ = holePosXZ.distanceTo(ballPosXZ);

    if (distXZ < holeRadius) {
      // allow ball to fall into hole
      ballVelocity.y = -0.05; // slower fall for realism
    } else if (golfBall.position.y < 0.5) {
      // keep ball above course
      golfBall.position.y = 0.5;
      ballVelocity.y = 0;
    }
  } else if (golfBall.position.y < 0.5) {
    golfBall.position.y = 0.5;
    ballVelocity.y = 0;
  }
}

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

        // --- NEW: add strokes to total score ---
        gameState.totalScore += gameState.strokes;

        // Show result overlay
        const par = gameState.par[gameState.currentHole - 1];
        const resultText = getGolfResult(gameState.strokes, par);

        if (gameState.currentHole < gameState.totalHoles) {
          resultOverlay.innerText = `${resultText}\n(${gameState.strokes} strokes, Par ${par})\n\nPress SPACE to continue`;
        } else {
          resultOverlay.innerText = `🏆 Game Over!\n${resultText}\n\nTotal Score: ${gameState.totalScore}`;
        }
        resultOverlay.style.display = "block";

        // Set game state for continuation
        gameState.waitingForContinue = true;
        gameState.mode = "waitingForContinue";

        console.log("Ball in hole! Press SPACE to continue.");
      }
    }
  }

  // --- NEW: world bounds failsafe ---
  const playfieldLimit = 60;
  if (Math.abs(golfBall.position.x) > playfieldLimit ||
      Math.abs(golfBall.position.z) > playfieldLimit ||
      golfBall.position.y < -5) {
    console.warn("Ball escaped, resetting...");
    if (gameState.currentHole === 1) {
      golfBall.position.set(0, 0.5, 20);
    } else if (gameState.currentHole === 2) {
      golfBall.position.set(0, 0.5, 15);
    }
    ballVelocity.set(0, 0, 0);
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
    }
  }

  if (gameState.currentHole === 2) {
    // resolve rectangular borders (use the same function for each border)
    resolveBoxCollision(arm1RightBorder);
    resolveBoxCollision(arm1LeftBorder);
    resolveBoxCollision(bottomBorder);
    resolveBoxCollision(arm2LeftBorder);
    resolveBoxCollision(arm2Bottom);
    resolveBoxCollision(arm2Top);

    // resolve angled hypotenuse as a finite plane
    resolveAngledCollision(hypotenuse);
  }
  // --- NEW: friction and stop condition ---
  ballVelocity.multiplyScalar(friction);
  if (ballVelocity.length() < 0.002) ballVelocity.set(0, 0, 0);
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
