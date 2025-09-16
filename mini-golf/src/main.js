import './style.css'
import { setupCounter } from './counter.js'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';



// canvas element
const canvas = document.querySelector('#bg');
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true // Optional: Improves visual quality
});

// Set the renderer size
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );

// Camera and scene setup
const scene = new THREE.Scene();
const fov = 75; // Field of view
const aspect = window.innerWidth / window.innerHeight; // Aspect ratio
const near = 0.1; // Near clipping plane
const far = 1000; // Far clipping plane
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 0, 0); 

//Light Setup
// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

// Add directional light to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5); // Position the light source
directionalLight.castShadow = true; // Enable shadows
scene.add(directionalLight);

// Instantiate OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Optional: Customize controls (remove these lines for default behavior)
controls.enableDamping = true; // Provides a smooth, flywheel-like effect
controls.dampingFactor = 0.05;
// controls.screenSpacePanning = false; // Prevents panning if you only want orbit/zoom
controls.maxPolarAngle = Math.PI / 2; // Prevents camera from going below the ground

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

// Create a large plane to represent the green surface
const planeGeometry = new THREE.PlaneGeometry(20, 60); 
const planeMaterial = new THREE.MeshStandardMaterial({
  color: '#A9D649', // A green color (hex code for dark green)
  side: THREE.DoubleSide // Makes the plane visible from both top and bottom
});
const greenSurface = new THREE.Mesh(planeGeometry, planeMaterial);
greenSurface.rotation.x = -Math.PI / 2;
greenSurface.receiveShadow = true;
scene.add(greenSurface);

// Define the geometry for the hole
const holeRadius = 0.75; // Slightly larger than the ball radius
const holeHeight = 0.5; // Depth of the hole
const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeHeight, 32); 
const holeMaterial = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a, // A dark grey or black color
  side: THREE.DoubleSide // Makes the hole visible from both top and bottom
});
const hole = new THREE.Mesh(holeGeometry, holeMaterial);
hole.position.set(0, -holeHeight / 2, -20); 
scene.add(hole);

// Load the glb model
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

//golf ball
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32); 
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // White color for the ball
  roughness: 0.4,
  metalness: 0.2
});
const golfBall = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(golfBall);
golfBall.position.set(0, 0.5, 20); // Position the ball above the plane

// An array of your model paths
const modelPaths = [
  //'./models/golf_ball.glb',
  './models/low_poly_golf_flag_animated.glb',
  //'./models/hole.glb',
];


// Border properties
const lawnWidth = 20;
const lawnHeight = 60;
const borderWidth = 1; // Thickness of the border
const borderHeight = 1; // Height of the border

// Create a material for the borders
const borderMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B4513 // Brown color for a rustic look
});

// Create the four border meshes
// Top Border (along Z-axis)
const topBorderGeometry = new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth);
const topBorder = new THREE.Mesh(topBorderGeometry, borderMaterial);
topBorder.position.set(0, borderHeight / 2, -lawnHeight / 2 - borderWidth / 2);
topBorder.castShadow = true;
scene.add(topBorder);

// Bottom Border (along Z-axis)
const bottomBorderGeometry = new THREE.BoxGeometry(lawnWidth + borderWidth * 2, borderHeight, borderWidth);
const bottomBorder = new THREE.Mesh(bottomBorderGeometry, borderMaterial);
bottomBorder.position.set(0, borderHeight / 2, lawnHeight / 2 + borderWidth / 2);
bottomBorder.castShadow = true;
scene.add(bottomBorder);

// Left Border (along X-axis)
const leftBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight);
const leftBorder = new THREE.Mesh(leftBorderGeometry, borderMaterial);
leftBorder.position.set(-lawnWidth / 2 - borderWidth / 2, borderHeight / 2, 0);
leftBorder.castShadow = true;
scene.add(leftBorder);

// Right Border (along X-axis)
const rightBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, lawnHeight);
const rightBorder = new THREE.Mesh(rightBorderGeometry, borderMaterial);
rightBorder.position.set(lawnWidth / 2 + borderWidth / 2, borderHeight / 2, 0);
rightBorder.castShadow = true;
scene.add(rightBorder);


Promise.all(modelPaths.map(path => loadModel(path)))
  .then(models => {
    //const golfball = models[0].scene;
    const flagModel = models[0].scene;
    //const holeModel = models[2].scene;
    

   
    
    // Get the center of the bounding box

   // holeModel.position.set(0, 0,-20); 
    //golfball.position.set(0, 0, 20);
    flagModel.position.set(-2.5, 14.5, -21.5); 
    

    //golfball.scale.set(0.02, 0.02, 0.02);
    flagModel.scale.set(7.5,7.5,7.5);
    
    
    
    
    scene.add(flagModel);
    //scene.add(holeModel);
    //scene.add(golfball);

  });

// The render loop
function animate() {
    requestAnimationFrame(animate);

    // This line is crucial for OrbitControls to work
    controls.target.set(0, 0, -20); // Point the camera to the center of the golf course
    controls.update()

    // Get the real-time position of the camera
    const cameraPosition = camera.position;
    
    // Log the x, y, and z coordinates
    console.log(`Camera Position: x=${cameraPosition.x.toFixed(2)}, y=${cameraPosition.y.toFixed(2)}, z=${cameraPosition.z.toFixed(2)}`);

    renderer.render(scene, camera);
}


// Start the animation loop
animate();


setupCounter(document.querySelector('#counter'))
