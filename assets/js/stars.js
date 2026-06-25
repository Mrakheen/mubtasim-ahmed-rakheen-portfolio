// assets/js/stars.js - Realistic Milky Way Starfield
import * as THREE from 'three';

export function loadStars(divId, jsonUrl = 'assets/json/stars.json') {
    fetch(jsonUrl)
        .then(response => response.json())
        .then(userConfig => {
            const config = {
                stars: {
                    number: { value: 800, distribution: "galaxy", radius: 1.5 },
                    color: { value: "#ffffff" },
                    size: { default: 0.004, variation: 0.004 },
                    opacity: { value: 0.75, transparent: true, depthWrite: false },
                    twinklingSpeed: 0.0012,
                    camera: { position: [0, 0, 1] }
                }
            };

            // Merge user config
            if (userConfig?.stars) {
                Object.assign(config.stars, userConfig.stars);
                if (userConfig.stars.number) Object.assign(config.stars.number, userConfig.stars.number);
                if (userConfig.stars.size) Object.assign(config.stars.size, userConfig.stars.size);
                if (userConfig.stars.opacity) Object.assign(config.stars.opacity, userConfig.stars.opacity);
            }

            init(config);
        })
        .catch(err => {
            console.warn("Could not load stars.json, using defaults", err);
            init({
                stars: {
                    number: { value: 800, distribution: "galaxy", radius: 1.5 },
                    size: { default: 0.004, variation: 0.004 },
                    opacity: { value: 0.75, transparent: true, depthWrite: false },
                    twinklingSpeed: 0.0012,
                    camera: { position: [0, 0, 1] }
                }
            });
        });
}

function init(config) {
    const container = document.getElementById('stars-js');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Deep space background
    const bg = new THREE.Mesh(
        new THREE.SphereGeometry(500, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x0a001f, side: THREE.BackSide })
    );
    scene.add(bg);

    // Glow texture
    const starTexture = new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
    );

    const numStars = config.stars.number.value;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);
    const sizes = new Float32Array(numStars);

    if (config.stars.number.distribution === "sphere") {
        randomInSphere(positions, config.stars.number.radius);
    } else {
        generateMilkyWayStars(positions, colors, sizes, numStars, config.stars.number.radius);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: config.stars.size.default,
        map: starTexture,
        transparent: true,
        opacity: config.stars.opacity.value,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Camera
    const camPos = config.stars.camera.position;
    camera.position.set(camPos[0] || 0, camPos[1] || 0, camPos[2] || 1);

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        const posArray = points.geometry.attributes.position.array;
        const sizeArray = points.geometry.attributes.size.array;

        for (let i = 0; i < numStars; i++) {
            // Twinkling
            const phase = i * 0.8 + time * (config.stars.twinklingSpeed || 1);
            sizeArray[i] = config.stars.size.default +
                          Math.sin(phase) * config.stars.size.variation * (0.6 + Math.random() * 0.7);

            // Gentle galactic rotation
            if (config.stars.number.distribution !== "sphere") {
                const idx = i * 3;
                const x = posArray[idx];
                const z = posArray[idx + 2];
                const rot = 0.00012;
                posArray[idx]     = x * Math.cos(rot) - z * Math.sin(rot);
                posArray[idx + 2] = x * Math.sin(rot) + z * Math.cos(rot);
            }
        }

        points.geometry.attributes.size.needsUpdate = true;
        points.geometry.attributes.position.needsUpdate = true;

        // Subtle camera drift
        camera.position.x = Math.sin(time * 0.08) * 0.025;
        camera.position.y = Math.cos(time * 0.06) * 0.018;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
}

// Helper functions
function randomInSphere(positions, radius) {
    for (let i = 0; i < positions.length; i += 3) {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.random();
        positions[i]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);
    }
}

function generateMilkyWayStars(positions, colors, sizes, count, radius) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2 * 3.5;
        const r = radius * Math.pow(Math.random(), 0.65);
        const spiral = Math.sin(angle * 2.8) * (radius * 0.18);

        positions[i * 3]     = Math.cos(angle) * (r + spiral);
        positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.55;
        positions[i * 3 + 2] = Math.sin(angle) * (r + spiral);

        const warmth = Math.random();
        colors[i * 3]     = 0.95 + warmth * 0.05;
        colors[i * 3 + 1] = 0.88 + warmth * 0.12;
        colors[i * 3 + 2] = 1.0;

        sizes[i] = 0.6 + Math.random() * 1.9;
    }
}

// Auto-start when script loads
loadStars('stars-js', 'assets/json/stars.json');
