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
camera.position.set(0, 5, 10); 

//Light Setup
// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

// Add directional light to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5); // Position the light source
directionalLight.castShadow = true; // Enable shadows
scene.add(directionalLight);

const loader = new GLTFLoader();

//golf ball
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32); 
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // White color for the ball
  roughness: 0.4,
  metalness: 0.2
});
const golfBall = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(golfBall);


// Load the glb model
loader.load(
  './models/red_flag.glb', // The path to your file in the public directory
  (gltf) => {
    // This callback function runs when the model is loaded

    // Get the loaded scene from the gltf object
    const golfCourseModel = gltf.scene;

    // Optional: Adjust the model's position, rotation, or scale
    golfCourseModel.position.set(0, 0, 0); 
    
    // Optional: Enable shadows on the model
    golfCourseModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Add the model to your scene
    scene.add(golfCourseModel);

    console.log('Model loaded successfully!');
  },
  (xhr) => {
    // This callback function reports loading progress
    console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
  },
  (error) => {
    // This callback function handles errors
    console.error('An error happened', error);
  }
);

// The render loop
function animate() {
    requestAnimationFrame(animate);

    
    
    renderer.render(scene, camera);
}

// Start the animation loop
animate();


setupCounter(document.querySelector('#counter'))
