import * as THREE from 'three';

(function () {
  const container = document.getElementById('stars-js');
  if (!container) return;

  // ── Renderer ─────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );

  camera.position.set(0, 0, 8);

  // ── Mouse flight controls ────────────────────────────────────────────
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── Star shader ───────────────────────────────────────────────────────
  const VERT = `
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aCluster;

    varying vec3 vColor;
    varying float vCluster;

    uniform float uTime;

    void main() {
      vColor = aColor;
      vCluster = aCluster;

      vec3 p = position;

      // slight cluster breathing motion
      p += sin(uTime * 0.2 + aCluster * 10.0) * 0.02;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);

      float dist = length(mv.xyz);
      gl_PointSize = (aSize / dist) * 220.0;

      gl_Position = projectionMatrix * mv;
    }
  `;

  const FRAG = `
    varying vec3 vColor;
    varying float vCluster;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      if (d > 0.5) discard;

      float alpha = exp(-d * d * 12.0);

      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  function mat() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  // ── Galaxy clusters (travel targets) ─────────────────────────────────
  const STAR_COUNT = 2000;

  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const cluster = new Float32Array(STAR_COUNT);

  function randColor() {
    const t = Math.random();
    if (t < 0.5) return [0.9, 0.9, 1.0];
    if (t < 0.8) return [0.6, 0.8, 1.0];
    return [1.0, 0.85, 0.7];
  }

  // 6 galaxy clusters in space
  const clusters = Array.from({ length: 6 }, () => ({
    x: (Math.random() - 0.5) * 80,
    y: (Math.random() - 0.5) * 40,
    z: (Math.random() - 0.5) * 80,
    radius: 8 + Math.random() * 12,
  }));

  function pickCluster() {
    return clusters[Math.floor(Math.random() * clusters.length)];
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    const c = pickCluster();

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * c.radius;

    const x = c.x + Math.cos(angle) * radius;
    const y = c.y + (Math.random() - 0.5) * radius;
    const z = c.z + Math.sin(angle) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const col = randColor();
    colors[i * 3] = col[0];
    colors[i * 3 + 1] = col[1];
    colors[i * 3 + 2] = col[2];

    sizes[i] = 0.01 + Math.random() * 0.03;
    cluster[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 1));

  const stars = new THREE.Points(geo, mat());
  scene.add(stars);

  // ── Nebula fog layers ────────────────────────────────────────────────
  const fogs = [];

  function createNebula(color, x, y, z) {
    const geo = new THREE.SphereGeometry(10 + Math.random() * 15, 16, 16);

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    scene.add(mesh);
    fogs.push(mesh);
  }

  for (let i = 0; i < 6; i++) {
    createNebula(
      new THREE.Color(`hsl(${200 + Math.random() * 80}, 70%, 60%)`),
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 80
    );
  }

  // ── Camera physics (flight sim feel) ─────────────────────────────────
  const clock = new THREE.Clock();

  let velX = 0, velY = 0;

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    // smooth mouse steering
    targetX = mouseX * 2;
    targetY = mouseY * 2;

    velX += (targetX - velX) * 0.02;
    velY += (targetY - velY) * 0.02;

    camera.position.x += velX * 0.1;
    camera.position.y += velY * 0.1;

    camera.position.z -= 0.05; // forward travel

    // wrap space
    if (camera.position.z < -80) camera.position.z = 8;

    camera.lookAt(
      camera.position.x,
      camera.position.y,
      camera.position.z - 10
    );

    // nebula drift
    fogs.forEach((f, i) => {
      f.rotation.x += 0.0005;
      f.rotation.y += 0.0003;
      f.material.opacity = 0.03 + Math.sin(t + i) * 0.01;
    });

    // cluster lensing effect (fake gravity distortion)
    const pos = geo.attributes.position.array;

    for (let i = 0; i < STAR_COUNT; i++) {
      const ix = i * 3;

      const dx = pos[ix] - camera.position.x;
      const dy = pos[ix + 1] - camera.position.y;
      const dz = pos[ix + 2] - camera.position.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 12) {
        const force = (12 - dist) * 0.002;
        pos[ix] += dx * force;
        pos[ix + 1] += dy * force;
      }
    }

    geo.attributes.position.needsUpdate = true;

    stars.material.uniforms.uTime.value = t;

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();


