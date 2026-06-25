function loadStars(divId, jsonUrl = null) {
            // Default config for Milky Way look
            const config = jsonUrl ? {} : {
                stars: {
                    number: { value: 15000, radius: 150 },
                    size: { default: 0.8, variation: 2.2 },
                    color: { value: 0xffffff },
                    opacity: { value: 0.95, transparent: true, depthWrite: false },
                    twinklingSpeed: 1.8
                },
                camera: { position: [0, 0, 80] }
            };

            if (jsonUrl) {
                fetch(jsonUrl).then(r => r.json()).then(c => init(c));
            } else {
                init(config);
            }

            function init(config) {
                const container = document.getElementById(divId);
                const width = container.clientWidth;
                const height = container.clientHeight;

                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ 
                    alpha: true, 
                    antialias: true 
                });
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                container.appendChild(renderer.domElement);

                // === MILKY WAY BACKGROUND (subtle nebula) ===
                const bgGeometry = new THREE.SphereGeometry(500, 64, 64);
                const bgMaterial = new THREE.MeshBasicMaterial({
                    color: 0x0a001f,
                    side: THREE.BackSide
                });
                const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
                scene.add(bgSphere);

                // Load a star texture (sprite) for realistic glow
                const starTexture = new THREE.TextureLoader().load(
                    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
                );

                // === MAIN STAR FIELD (dense galactic plane) ===
                const geometry = new THREE.BufferGeometry();
                const numStars = config.stars.number.value;
                const positions = new Float32Array(numStars * 3);
                const colors = new Float32Array(numStars * 3);
                const sizes = new Float32Array(numStars);

                // Generate realistic Milky Way distribution
                generateMilkyWayStars(positions, colors, sizes, numStars, config.stars.number.radius);

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

                // Extra faint distant layer for depth
                const distantGeometry = new THREE.BufferGeometry();
                const numDistant = Math.floor(numStars * 0.6);
                const dPositions = new Float32Array(numDistant * 3);
                const dColors = new Float32Array(numDistant * 3);
                const dSizes = new Float32Array(numDistant);

                for (let i = 0; i < numDistant * 3; i += 3) {
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const r = config.stars.number.radius * (0.6 + Math.random() * 0.8);
                    
                    dPositions[i]     = r * Math.sin(phi) * Math.cos(theta);
                    dPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.12; // flatter
                    dPositions[i + 2] = r * Math.cos(phi);
                    
                    const brightness = 0.3 + Math.random() * 0.4;
                    dColors[i] = brightness;
                    dColors[i+1] = brightness * (0.9 + Math.random() * 0.2);
                    dColors[i+2] = brightness * (0.85 + Math.random() * 0.3);
                    dSizes[i/3] = 0.4 + Math.random() * 1.1;
                }
                distantGeometry.setAttribute('position', new THREE.BufferAttribute(dPositions, 3));
                distantGeometry.setAttribute('color', new THREE.BufferAttribute(dColors, 3));
                distantGeometry.setAttribute('size', new THREE.BufferAttribute(dSizes, 1));

                const distantPoints = new THREE.Points(distantGeometry, material.clone());
                distantPoints.material.size = 0.6;
                scene.add(distantPoints);

                camera.position.set(0, 8, config.stars.camera.position[2] || 80);

                let time = 0;
                function animate() {
                    requestAnimationFrame(animate);
                    time += 0.008;

                    const posAttr = points.geometry.attributes.position;
                    const sizeAttr = points.geometry.attributes.size;
                    const positionsArray = posAttr.array;
                    const sizesArray = sizeAttr.array;

                    for (let i = 0; i < numStars; i++) {
                        const idx = i * 3 + 1;
                        
                        // Very gentle rotation around galactic axis + slow drift
                        const x = positionsArray[i * 3];
                        const z = positionsArray[i * 3 + 2];
                        positionsArray[i * 3] = x * Math.cos(0.00008) - z * Math.sin(0.00008);
                        positionsArray[i * 3 + 2] = x * Math.sin(0.00008) + z * Math.cos(0.00008);

                        // Subtle twinkling with per-star phase
                        const phase = i * 0.017 + time;
                        sizesArray[i] = config.stars.size.default + 
                                       Math.sin(phase * config.stars.twinklingSpeed) * 
                                       config.stars.size.variation * 
                                       (0.4 + Math.random() * 0.6);
                    }

                    posAttr.needsUpdate = true;
                    sizeAttr.needsUpdate = true;

                    // Very slow camera movement for parallax feel
                    camera.position.x = Math.sin(time * 0.07) * 4;
                    camera.position.y = 6 + Math.cos(time * 0.05) * 3;
                    camera.lookAt(0, 0, 0);

                    renderer.render(scene, camera);
                }
                animate();

                // Resize handler
                window.addEventListener('resize', () => {
                    const w = container.clientWidth;
                    const h = container.clientHeight;
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                    renderer.setSize(w, h);
                });
            }
        }

        // Generate stars concentrated in a galactic disk with some spiral perturbation
        function generateMilkyWayStars(positions, colors, sizes, count, radius) {
            let i = 0;
            while (i < count) {
                const arm = Math.random() * 4 | 0; // 4 spiral arms
                const angle = (i / count) * Math.PI * 2 * 3 + arm * (Math.PI / 2); // multiple rotations
                
                const r = radius * Math.pow(Math.random(), 0.6); // more stars near center
                const spiralOffset = Math.sin(angle * 3) * 12; // spiral perturbation
                
                const x = Math.cos(angle) * (r + spiralOffset);
                const z = Math.sin(angle) * (r + spiralOffset);
                
                // Flatten the galaxy (small Y variation)
                const y = (Math.random() - 0.5) * 18 + Math.random() * Math.sin(angle * 2) * 6;

                positions[i * 3]     = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                // Color temperature variation (bluish to yellowish)
                const temp = Math.random();
                const rCol = 0.9 + temp * 0.1;
                const gCol = 0.85 + temp * 0.15;
                const bCol = 0.95 + (1 - temp) * 0.1;

                colors[i * 3]     = rCol;
                colors[i * 3 + 1] = gCol;
                colors[i * 3 + 2] = bCol;

                // Size variation - bigger stars are rarer
                sizes[i] = 0.6 + Math.pow(Math.random(), 3) * 3.8;

                i++;
            }
        }
