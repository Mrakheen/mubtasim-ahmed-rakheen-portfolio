// assets/js/stars.js - Fixed Milky Way Starfield
let THREE;

async function initThree() {
    // Try to use imported Three.js first, fallback to global
    if (typeof window.THREE !== 'undefined') {
        THREE = window.THREE;
    } else {
        try {
            const module = await import('three');
            THREE = module.default || module;
        } catch (e) {
            console.error("Three.js not loaded", e);
            return;
        }
    }
    startStarfield();
}

function startStarfield() {
    const container = document.getElementById('stars-js');
    if (!container) {
        console.error("stars-js container not found");
        return;
    }

    // Clear any previous content
    container.innerHTML = '';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        preserveDrawingBuffer: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Make sure container is behind everything
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '-1';
    container.style.pointerEvents = 'none';

    // Deep space background
    const bg = new THREE.Mesh(
        new THREE.SphereGeometry(900, 64, 64),
        new THREE.MeshBasicMaterial({ 
            color: 0x0a001f, 
            side: THREE.BackSide 
        })
    );
    scene.add(bg);

    // Star texture
    const starTexture = new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
    );

    const numStars = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);
    const sizes = new Float32Array(numStars);

    generateMilkyWayStars(positions, colors, sizes, numStars, 1.8);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.005,
        map: starTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.set(0, 0, 1.2);

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        const posArray = points.geometry.attributes.position.array;
        const sizeArray = points.geometry.attributes.size.array;

        for (let i = 0; i < numStars; i++) {
            const phase = i * 0.7 + time * 1.8;
            sizeArray[i] = 0.005 + Math.sin(phase) * 0.003 * (0.7 + Math.random() * 0.6);

            // Gentle rotation
            const idx = i * 3;
            const x = posArray[idx];
            const z = posArray[idx + 2];
            const rot = 0.00008;
            posArray[idx]     = x * Math.cos(rot) - z * Math.sin(rot);
            posArray[idx + 2] = x * Math.sin(rot) + z * Math.cos(rot);
        }

        points.geometry.attributes.size.needsUpdate = true;
        points.geometry.attributes.position.needsUpdate = true;

        camera.position.x = Math.sin(time * 0.07) * 0.03;
        camera.position.y = Math.cos(time * 0.05) * 0.02;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function generateMilkyWayStars(positions, colors, sizes, count, radius) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2 * 3.8;
        const r = radius * Math.pow(Math.random(), 0.62);
        const spiral = Math.sin(angle * 3) * (radius * 0.2);

        positions[i * 3]     = Math.cos(angle) * (r + spiral);
        positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.45;
        positions[i * 3 + 2] = Math.sin(angle) * (r + spiral);

        const warmth = Math.random();
        colors[i * 3]     = 0.96 + warmth * 0.04;
        colors[i * 3 + 1] = 0.9 + warmth * 0.1;
        colors[i * 3 + 2] = 1.0;

        sizes[i] = 0.7 + Math.random() * 2.1;
    }
}

// Start after everything is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThree);
} else {
    initThree();
}
