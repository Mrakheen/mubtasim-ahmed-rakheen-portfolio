// stars.js - Realistic Milky Way Starfield
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';

export function loadStars(divId, jsonUrl = 'assets/json/stars.json') {
    fetch(jsonUrl)
        .then(response => response.json())
        .then(userConfig => {
            const config = {
                stars: {
                    number: { value: 360, distribution: "sphere", radius: 1.5 },
                    color: { value: "#ffffff" },
                    size: { default: 0.004, variation: 0.004 },
                    opacity: { value: 0.7, transparent: true, depthWrite: false },
                    twinklingSpeed: 0.001,
                    camera: { position: [0, 0, 1] }
                }
            };

            // Deep merge user config
            if (userConfig?.stars) {
                config.stars = { ...config.stars, ...userConfig.stars };
                if (userConfig.stars.number) {
                    config.stars.number = { ...config.stars.number, ...userConfig.stars.number };
                }
                if (userConfig.stars.size) {
                    config.stars.size = { ...config.stars.size, ...userConfig.stars.size };
                }
                if (userConfig.stars.opacity) {
                    config.stars.opacity = { ...config.stars.opacity, ...userConfig.stars.opacity };
                }
            }

            init(config);
        })
        .catch(err => {
            console.warn("Failed to load stars config, using defaults", err);
            init({
                stars: {
                    number: { value: 360, distribution: "sphere", radius: 1.5 },
                    size: { default: 0.004, variation: 0.004 },
                    opacity: { value: 0.7, transparent: true, depthWrite: false },
                    twinklingSpeed: 0.001,
                    camera: { position: [0, 0, 1] }
                }
            });
        });

    function init(config) {
        const container = document.getElementById(divId);
        if (!container) {
            console.error(`Container with id "${divId}" not found`);
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Deep space background
        const bg = new THREE.Mesh(
            new THREE.SphereGeometry(500, 64, 64),
            new THREE.MeshBasicMaterial({ color: 0x0a001f, side: THREE.BackSide })
        );
        scene.add(bg);

        // Star sprite texture for realistic glow
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
            transparent: config.stars.opacity.transparent,
            opacity: config.stars.opacity.value,
            depthWrite: config.stars.opacity.depthWrite,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Camera setup
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
                              Math.sin(phase) * config.stars.size.variation *
                              (0.6 + Math.random() * 0.7);

                // Gentle rotation for Milky Way mode
                if (config.stars.number.distribution !== "sphere") {
                    const idx = i * 3;
                    const x = posArray[idx];
                    const z = posArray[idx + 2];
                    const rotSpeed = 0.00015;
                    posArray[idx]     = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
                    posArray[idx + 2] = x * Math.sin(rotSpeed) + z * Math.cos(rotSpeed);
                }
            }

            points.geometry.attributes.size.needsUpdate = true;
            points.geometry.attributes.position.needsUpdate = true;

            // Subtle camera movement
            camera.position.x = Math.sin(time * 0.1) * 0.03;
            camera.position.y = Math.cos(time * 0.08) * 0.02;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }

        animate();

        // Resize handler
        const resizeHandler = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', resizeHandler);
    }
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
        positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.6;
        positions[i * 3 + 2] = Math.sin(angle) * (r + spiral);

        const warmth = Math.random();
        colors[i * 3]     = 0.95 + warmth * 0.05;
        colors[i * 3 + 1] = 0.9 + warmth * 0.1;
        colors[i * 3 + 2] = 1.0;

        sizes[i] = 0.6 + Math.random() * 1.8;
    }
}
