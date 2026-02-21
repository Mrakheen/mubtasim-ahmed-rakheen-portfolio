import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.onload = () => loadModel();

function loadModel() {
  const loader = new GLTFLoader();
  
  loader.load('avatar.glb',
    (gltf) => {
      setupScene(gltf);
      document.getElementById('avatar-loading').style.display = 'none';
    }, 
    (xhr) => {
      if (xhr.total) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        document.getElementById('avatar-loading').innerText = `LOADING... ${percent}%`;
      }
    }, 
    (error) => {
      console.log(error);
    }
  );
}

function setupScene(gltf) {
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    const container = document.getElementById('avatar-container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight);
    camera.position.set(0.2, 0.5, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 3;
    controls.minPolarAngle = 1.4;
    controls.maxPolarAngle = 1.4;
    controls.target = new THREE.Vector3(0, 0.75, 0);
    controls.update();

    // Scene setup
    const scene = new THREE.Scene();

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // White light, intensity set to 1.5 (moderate increase)
    scene.add(ambientLight);

    const spotlight = new THREE.SpotLight(0xffffff, 20, 8, 1);
    spotlight.penumbra = 0.5;
    spotlight.position.set(0, 4, 2);
    spotlight.castShadow = true;
    scene.add(spotlight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(1, 1, 2);
    keyLight.lookAt(new THREE.Vector3());
    scene.add(keyLight);

    // Load avatar
    const avatar = gltf.scene;
    avatar.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(avatar);

    // Create pedestal
    const groundGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 64);
    const groundMaterial = new THREE.MeshStandardMaterial();
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;
    groundMesh.position.y -= 0.05;
    scene.add(groundMesh);

    // Load animations
    avatar.scale.set(1.05, 1.02, 1.05);
    const mixer = new THREE.AnimationMixer(avatar);
    const clips = gltf.animations;
    const standing_greetingClip = THREE.AnimationClip.findByName(clips, 'standing_greeting');
    const saluteClip = THREE.AnimationClip.findByName(clips, 'salute');
    const stumbleClip = THREE.AnimationClip.findByName(clips, 'stumble');
    const standing_greetingAction = mixer.clipAction(standing_greetingClip);
    const saluteAction = mixer.clipAction(saluteClip);
    const stumbleAction = mixer.clipAction(stumbleClip);


    let isStumbling = false;
    const raycaster = new THREE.Raycaster();
    container.addEventListener('mousedown', (ev) => {
      const coords = {
        x: (ev.offsetX / container.clientWidth) * 2 - 1,
        y: -(ev.offsetY / container.clientHeight) * 2 + 1
      };

      raycaster.setFromCamera(coords, camera);
      const intersections = raycaster.intersectObject(avatar);
  
      if (intersections.length > 0) {
        if (isStumbling) return;

        isStumbling = true;
        stumbleAction.reset();
        stumbleAction.play();
        standing_greetingAction.crossFadeTo(stumbleAction, 0.3);

        setTimeout(() => {
          standing_greetingAction.reset();
          standing_greetingAction.play();
          stumbleAction.crossFadeTo(standing_greetingAction, 1);
          setTimeout(() => isStumbling = false, 1000);
        }, 4000)
      }
    });

    let isStumbling2 = false;
    const raycaster2 = new THREE.Raycaster();
    container.addEventListener('mousemove', (ev) => {
      const coords = {
        x: (ev.offsetX / container.clientWidth) * 2 - 1,
        y: -(ev.offsetY / container.clientHeight) * 2 + 1
      };
    
      raycaster2.setFromCamera(coords, camera);
      const intersections = raycaster2.intersectObject(avatar);
    
      if (intersections.length > 0) {
        if (isStumbling2) return;
    
        isStumbling2 = true;
        saluteAction.reset();
        saluteAction.play();
        standing_greetingAction.crossFadeTo(saluteAction, 0.3);
    
        setTimeout(() => {
          standing_greetingAction.reset();
          standing_greetingAction.play();
          saluteAction.crossFadeTo(standing_greetingAction, 1);
          setTimeout(() => isStumbling2 = false, 1000);
        }, 4000);
      }
    });

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      mixer.update(clock.getDelta());
      renderer.render(scene, camera);
    }

    animate();
    standing_greetingAction.play();
}















