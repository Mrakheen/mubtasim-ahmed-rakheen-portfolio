// assets/js/stars.js
let THREE;

async function initStarfield() {
    // Use global THREE from your HTML script
    if (typeof window.THREE === 'undefined') {
        console.error("Three.js not loaded");
        return;
    }
    THREE = window.THREE;

    const container = document.getElementById('stars-js');
    if (!container) {
        console.error("#stars-js not found");
        return;
    }

    container.innerHTML = ''; // Clear previous

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Deep space
    scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(900, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x0a001f, side: THREE.BackSide })
    ));

    // Star texture
    const texture = new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
    );

    const numStars = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);
    const sizes = new Float32Array(numStars);

    generateMilkyWayStars(positions, colors, sizes, numStars, 1.9);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.006,
        map: texture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.z = 1.3;

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        const pos = points.geometry.attributes.position.array;
        const size = points.geometry.attributes.size.array;

        for (let i = 0; i < numStars; i++) {
            // Twinkling
            size[i] = 0.006 + Math.sin(i * 0.8 + time * 2.2) * 0.0035;

            // Slow rotation
            const idx = i * 3;
            const x = pos[idx];
            const z = pos[idx + 2];
            const rot = 0.0001;
            pos[idx]     = x * Math.cos(rot) - z * Math.sin(rot);
            pos[idx + 2] = x * Math.sin(rot) + z * Math.cos(rot);
        }

        points.geometry.attributes.size.needsUpdate = true;
        points.geometry.attributes.position.needsUpdate = true;

        // Gentle camera movement
        camera.position.x = Math.sin(time * 0.06) * 0.04;
        camera.position.y = Math.cos(time * 0.045) * 0.025;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function generateMilkyWayStars(positions, colors, sizes, count, radius) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2 * 4;
        const r = radius * Math.pow(Math.random(), 0.6);
        const spiral = Math.sin(angle * 3.2) * (radius * 0.22);

        positions[i*3]   = Math.cos(angle) * (r + spiral);
        positions[i*3+1] = (Math.random() - 0.5) * radius * 0.5;
        positions[i*3+2] = Math.sin(angle) * (r + spiral);

        const w = Math.random();
        colors[i*3]   = 0.95 + w * 0.05;
        colors[i*3+1] = 0.88 + w * 0.12;
        colors[i*3+2] = 1.0;

        sizes[i] = 0.8 + Math.random() * 2.2;
    }
}

// Auto start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarfield);
} else {
    initStarfield();
}
