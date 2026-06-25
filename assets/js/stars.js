// assets/js/stars.js - Improved Milky Way Starfield (Compatible with your setup)
let THREE = window.THREE;

function loadStars(divId, jsonUrl) {
    fetch(jsonUrl)
        .then(response => response.json())
        .then(config => {
            init(config);
        })
        .catch(err => {
            console.warn("Failed to load stars config, using defaults", err);
            init({
                stars: {
                    number: { value: 1200, radius: 1.8 },
                    color: { value: "#ffffff" },
                    size: { default: 0.005, variation: 0.004 },
                    opacity: { value: 0.85, transparent: true, depthWrite: false },
                    twinklingSpeed: 0.002,
                    camera: { position: [0, 0, 1.3] }
                }
            });
        });

    function init(config) {
        const container = document.getElementById(divId);
        if (!container) return;

        // Clear any old canvas
        container.innerHTML = '';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true 
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Deep space background
        const bg = new THREE.Mesh(
            new THREE.SphereGeometry(800, 64, 64),
            new THREE.MeshBasicMaterial({ 
                color: 0x0a001f, 
                side: THREE.BackSide 
            })
        );
        scene.add(bg);

        // Star glow texture
        const starTexture = new THREE.TextureLoader().load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
        );

        const numStars = config.stars.number.value || 1200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(numStars * 3);
        const colors = new Float32Array(numStars * 3);
        const sizes = new Float32Array(numStars);

        generateMilkyWayStars(positions, colors, sizes, numStars, config.stars.number.radius || 1.8);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: config.stars.size.default || 0.005,
            map: starTexture,
            transparent: true,
            opacity: config.stars.opacity.value || 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        camera.position.z = config.stars.camera.position?.[2] || 1.3;

        let time = 0;

        function animate() {
            requestAnimationFrame(animate);
            time += 0.016;

            const posArray = points.geometry.attributes.position.array;
            const sizeArray = points.geometry.attributes.size.array;

            for (let i = 0; i < numStars; i++) {
                // Realistic twinkling
                const phase = i * 0.75 + time * (config.stars.twinklingSpeed || 1.5);
                sizeArray[i] = (config.stars.size.default || 0.005) + 
                              Math.sin(phase) * (config.stars.size.variation || 0.004) * 1.2;

                // Gentle galactic rotation
                const idx = i * 3;
                const x = posArray[idx];
                const z = posArray[idx + 2];
                const rotSpeed = 0.00009;
                posArray[idx]     = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
                posArray[idx + 2] = x * Math.sin(rotSpeed) + z * Math.cos(rotSpeed);
            }

            points.geometry.attributes.size.needsUpdate = true;
            points.geometry.attributes.position.needsUpdate = true;

            // Very subtle camera drift
            camera.position.x = Math.sin(time * 0.07) * 0.035;
            camera.position.y = Math.cos(time * 0.05) * 0.02;

            renderer.render(scene, camera);
        }

        animate();

        // Responsive
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}

function generateMilkyWayStars(positions, colors, sizes, count, radius) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2 * 4.2;
        const r = radius * Math.pow(Math.random(), 0.63);
        const spiral = Math.sin(angle * 3.1) * (radius * 0.19);

        positions[i * 3]     = Math.cos(angle) * (r + spiral);
        positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.48;
        positions[i * 3 + 2] = Math.sin(angle) * (r + spiral);

        // Star color temperature variation
        const warmth = Math.random();
        colors[i * 3]     = 0.96 + warmth * 0.04;
        colors[i * 3 + 1] = 0.89 + warmth * 0.11;
        colors[i * 3 + 2] = 1.0;

        sizes[i] = 0.7 + Math.random() * 2.3;
    }
}

// Auto initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadStars('stars-js', 'assets/json/stars.json'));
} else {
    loadStars('stars-js', 'assets/json/stars.json');
}
