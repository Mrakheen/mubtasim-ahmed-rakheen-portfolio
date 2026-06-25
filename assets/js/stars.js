import * as THREE from 'three';

function loadStars(divId, jsonUrl) {
  fetch(jsonUrl)
    .then(response => response.json())
    .then(config => {
      const container = document.getElementById(divId);
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);

      const renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);

      const geometry = new THREE.BufferGeometry();
      const numStars = config.stars.number.value;
      const positions = new Float32Array(numStars * 3);
      const sizes = new Float32Array(numStars);

      randomInSphere(positions, config.stars.number.radius);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      for (let i = 0; i < numStars; i++) {
        sizes[i] = config.stars.size.default + (Math.random() * config.stars.size.variation);
      }
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const sprite = new THREE.TextureLoader().load('assets/img/star.png');
      const material = new THREE.PointsMaterial({
        map: sprite,
        color: config.stars.color.value,
        size: config.stars.size.default * 3,
        transparent: config.stars.opacity.transparent,
        opacity: config.stars.opacity.value,
        depthWrite: config.stars.opacity.depthWrite,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      let previousTime = 0;
      function animate(time) {
        requestAnimationFrame(animate);
        const delta = time - previousTime;
        previousTime = time;

        const sizesArray = points.geometry.attributes.size.array;
        const positionsArray = points.geometry.attributes.position.array;
        for (let i = 0; i < sizesArray.length; i++) {
          sizesArray[i] = config.stars.size.default + (Math.random() * config.stars.size.variation * (Math.sin(delta * config.stars.twinklingSpeed + i) + 1));
          positionsArray[i * 3 + 1] -= 0.00002;

          if (positionsArray[i * 3 + 1] < -2) {
            positionsArray[i * 3 + 1] = 2;
          }
        }

        points.geometry.attributes.size.needsUpdate = true;
        points.geometry.attributes.position.needsUpdate = true;

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
