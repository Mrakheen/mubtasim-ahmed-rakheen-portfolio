import * as THREE from 'three';

function loadStars(divId, jsonUrl) {
    fetch(jsonUrl)
    .then(response => response.json())
    .then(config => {
        const container = document.getElementById(divId);
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const geometry = new THREE.BufferGeometry();
        const numStars = config.stars.number.value;
        const positions = new Float32Array(numStars * 3);
        const sizes = new Float32Array(numStars); // Sizes for stars
        randomInSphere(positions, config.stars.number.radius);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Set random sizes for stars based on the variation
        for (let i = 0; i < numStars; i++) {
            sizes[i] = config.stars.size.default + (Math.random() * config.stars.size.variation); // Random size variation
        }
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: config.stars.color.value,
            size: config.stars.size.default * 2, // Base size for visibility
            transparent: config.stars.opacity.transparent,
            opacity: config.stars.opacity.value,
            depthWrite: config.stars.opacity.depthWrite
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        let previousTime = 0;

        function animate(time) {
            requestAnimationFrame(animate);

            const delta = time - previousTime;
            previousTime = time;

            const sizesArray = points.geometry.attributes.size.array; // Sizes array for twinkling
            const positionsArray = points.geometry.attributes.position.array;

            for (let i = 0; i < sizesArray.length; i++) {
                // Twinkling effect: Adjust size slightly for each star
                sizesArray[i] = config.stars.size.default + 
                    (Math.random() * config.stars.size.variation * 
                    (Math.sin(delta * config.stars.twinklingSpeed + i) + 1)); // Vary size with a slight phase shift for each star

                // Apply very slow falling effect
                positionsArray[i * 3 + 1] -= 0.000012; // Slower downward movement

                // Reset star position if it falls out of bounds
                if (positionsArray[i * 3 + 1] < -1.5) {
                    positionsArray[i * 3 + 1] = 1.2; // Move back to the top
                }
            }

            points.geometry.attributes.size.needsUpdate = true; // Update size attribute for twinkling
            points.geometry.attributes.position.needsUpdate = true; // Update position attribute for falling

            renderer.render(scene, camera);
        }

        camera.position.z = config.stars.camera.position[2];

        animate(0);

        window.addEventListener('resize', () => {
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });
    });
}

function randomInSphere(positions, radius) {
    for (let i = 0; i < positions.length; i += 3) {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
    }
    return positions;
}

loadStars('stars-js', 'assets/json/stars.json');



