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
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  camera.position.set(0, 0, 5);

  // ── Shader ───────────────────────────────────────────────────────────
  const VERT = `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;
    attribute float aDepth;

    varying vec3 vColor;
    varying float vDepth;
    varying float vPhase;

    uniform float uTime;

    void main() {
      vColor = aColor;
      vDepth = aDepth;
      vPhase = aPhase;

      vec3 pos = position;

      // subtle drift based on depth (parallax illusion)
      pos.x += sin(uTime * 0.05 + aPhase) * aDepth * 0.02;
      pos.y += cos(uTime * 0.04 + aPhase) * aDepth * 0.02;

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

      float dist = length(mvPos.xyz);
      float twinkle = 0.7 + 0.3 * sin(uTime * 1.2 + aPhase);

      gl_PointSize = (aSize / dist) * twinkle * 240.0;
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const FRAG = `
    varying vec3 vColor;
    varying float vDepth;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      if (d > 0.5) discard;

      float alpha = exp(-d * d * 10.0);
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  function makeMat(uTime) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  // ── Star field (infinite volume) ─────────────────────────────────────
  const STAR_COUNT = 1400;
  const RANGE = 60;

  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const phases = new Float32Array(STAR_COUNT);
  const depth = new Float32Array(STAR_COUNT);

  const WHITE = () => [0.95, 0.95, 1.0];
  const BLUE = () => [0.6, 0.75, 1.0];
  const WARM = () => [1.0, 0.9, 0.7];

  function randSpread() {
    return (Math.random() - 0.5) * RANGE;
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i * 3] = randSpread();
    positions[i * 3 + 1] = randSpread();
    positions[i * 3 + 2] = randSpread();

    const c = Math.random() < 0.6 ? WHITE() : Math.random() < 0.8 ? BLUE() : WARM();

    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];

    sizes[i] = 0.008 + Math.random() * 0.02;
    phases[i] = Math.random() * Math.PI * 2;
    depth[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));

  const uTime = { value: 0 };
  const mat = makeMat(uTime);

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);

  // ── Shooting stars system ────────────────────────────────────────────
  const shootGeo = new THREE.BufferGeometry();
  const shootPositions = new Float32Array(6); // line
  shootGeo.setAttribute('position', new THREE.BufferAttribute(shootPositions, 3));

  const shootMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
  });

  const shootingStar = new THREE.Line(shootGeo, shootMat);
  scene.add(shootingStar);

  let shootTimer = 0;

  function spawnShoot() {
    const x = (Math.random() - 0.5) * 40;
    const y = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;

    shootPositions.set([x, y, z, x + 2, y - 1, z - 2]);

    shootGeo.attributes.position.needsUpdate = true;

    shootMat.opacity = 1.0;
  }

  // ── Camera motion (cinematic drift) ──────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();
    uTime.value = t;

    // slow forward drift (illusion of travel)
    camera.position.z -= 0.01;

    // wrap camera so it feels infinite
    if (camera.position.z < -20) camera.position.z = 5;

    // subtle camera sway
    camera.position.x = Math.sin(t * 0.1) * 0.5;
    camera.position.y = Math.cos(t * 0.08) * 0.3;

    camera.lookAt(0, 0, camera.position.z - 5);

    // recycle stars around camera (infinite field)
    const pos = geo.attributes.position.array;

    for (let i = 0; i < STAR_COUNT; i++) {
      const ix = i * 3;

      if (pos[ix + 2] > camera.position.z + 10) {
        pos[ix] = (Math.random() - 0.5) * RANGE;
        pos[ix + 1] = (Math.random() - 0.5) * RANGE;
        pos[ix + 2] = camera.position.z - RANGE;
      }
    }

    geo.attributes.position.needsUpdate = true;

    // shooting stars
    shootTimer += 1;

    if (shootTimer > 120 + Math.random() * 200) {
      spawnShoot();
      shootTimer = 0;
    }

    shootMat.opacity *= 0.92;

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
