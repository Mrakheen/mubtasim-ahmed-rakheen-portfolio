// assets/js/stars.js - Safe version for your site
(function() {
    'use strict';

    // Wait for Three.js global to be available
    function waitForThree(callback) {
        if (typeof window.THREE !== 'undefined') {
            callback(window.THREE);
        } else {
            setTimeout(() => waitForThree(callback), 100);
        }
    }

    waitForThree(function(THREE) {
        loadStars('stars-js', 'assets/json/stars.json');
    });

    function loadStars(divId, jsonUrl) {
        fetch(jsonUrl)
            .then(response => response.json())
            .then(config => {
                initStarfield(config);
            })
            .catch(() => {
                // Default config if JSON fails
                initStarfield({
                    stars: {
                        number: { value: 1100, radius: 1.8 },
                        size: { default: 0.005, variation: 0.0035 },
                        opacity: { value: 0.82, transparent: true, depthWrite: false },
                        twinklingSpeed: 0.0015,
                        camera: { position: [0, 0, 1.25] }
                    }
                });
            });

        function initStarfield(config) {
            const container = document.getElementById(divId);
            if (!container) return;

            // Prevent multiple canvases
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

            // Background
            scene.add(new THREE.Mesh(
                new THREE.SphereGeometry(900, 60, 60),
                new THREE.MeshBasicMaterial({
                    color: 0x0a001f,
                    side: THREE.BackSide
                })
            ));

            // Star texture
            const textureLoader = new THREE.TextureLoader();
            const starTexture = textureLoader.load(
                'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
            );

            const numStars = config.stars.number.value || 1100;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(numStars * 3);
            const colors = new Float32Array(numStars * 3);
            const sizes = new Float32Array(numStars);

            generateMilkyWay(positions, colors, sizes, numStars, config.stars.number.radius || 1.8);

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            const material = new THREE.PointsMaterial({
                size: config.stars.size.default || 0.005,
                map: starTexture,
                transparent: true,
                opacity: config.stars.opacity.value || 0.82,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                vertexColors: true,
                sizeAttenuation: true
            });

            const points = new THREE.Points(geometry, material);
            scene.add(points);

            camera.position.z = 1.25;

            let time = 0;

            function animate() {
                requestAnimationFrame(animate);
                time += 0.016;

                const pos = points.geometry.attributes.position.array;
                const sizeAttr = points.geometry.attributes.size.array;

                for (let i = 0; i < numStars; i++) {
                    // Twinkling
                    const phase = i * 0.72 + time * (config.stars.twinklingSpeed || 1.6);
                    sizeAttr[i] = (config.stars.size.default || 0.005) + Math.sin(phase) * (config.stars.size.variation || 0.0035);

                    // Gentle rotation
                    const idx = i * 3;
                    const x = pos[idx];
                    const z = pos[idx + 2];
                    const rot = 0.000085;
                    pos[idx]   = x * Math.cos(rot) - z * Math.sin(rot);
                    pos[idx+2] = x * Math.sin(rot) + z * Math.cos(rot);
                }

                points.geometry.attributes.size.needsUpdate = true;
                points.geometry.attributes.position.needsUpdate = true;

                camera.position.x = Math.sin(time * 0.065) * 0.03;
                camera.position.y = Math.cos(time * 0.048) * 0.02;
                camera.lookAt(0, 0, 0);

                renderer.render(scene, camera);
            }

            animate();

            // Resize handler
            function handleResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
            window.addEventListener('resize', handleResize);
        }
    }

    function generateMilkyWay(positions, colors, sizes, count, radius) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2 * 4;
            const r = radius * Math.pow(Math.random(), 0.65);
            const spiral = Math.sin(angle * 3) * radius * 0.2;

            positions[i*3]   = Math.cos(angle) * (r + spiral);
            positions[i*3+1] = (Math.random() - 0.5) * radius * 0.5;
            positions[i*3+2] = Math.sin(angle) * (r + spiral);

            const warmth = Math.random();
            colors[i*3]   = 0.95 + warmth * 0.05;
            colors[i*3+1] = 0.88 + warmth * 0.12;
            colors[i*3+2] = 1.0;

            sizes[i] = 0.8 + Math.random() * 2.0;
        }
    }
})();
