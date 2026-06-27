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
    55,
    window.innerWidth / window.innerHeight,
    0.01,
    500
  );

  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  // ── Shader ───────────────────────────────────────────────────────────
  const VERT = `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3  aColor;
    varying vec3 vColor;
    uniform float uTime;

    void main() {
      vColor = aColor;

      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);

      float dist = length(mvPos.xyz);
      float twinkle = 0.75 + 0.25 * sin(uTime * 1.5 + aPhase);

      gl_PointSize = (aSize / dist) * twinkle * 260.0;
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const FRAG = `
    varying vec3 vColor;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);

      if (d > 0.5) discard;

      float alpha = exp(-d * d * 10.0);
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  function makeShaderMat(uTime) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  // ── Star helpers ──────────────────────────────────────────────────────
  function spherePoint(r) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  }

  function randomVolumePoint(spread) {
    const r = spread * Math.cbrt(Math.random());
    return spherePoint(r);
  }

  // ── Layer builder ─────────────────────────────────────────────────────
  function makeLayer({ count, sizeMean, sizeVar, colorFn, spread, rotSpeed }) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = randomVolumePoint(spread);

      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];

      const c = colorFn();

      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];

      sizes[i] = sizeMean + (Math.random() - 0.5) * sizeVar;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const uTime = { value: 0 };
    const mat = makeShaderMat(uTime);
    const mesh = new THREE.Points(geo, mat);

    return { mesh, uTime, rotSpeed };
  }

  // ── Colors ────────────────────────────────────────────────────────────
  const WHITE = () => [
    0.92 + Math.random() * 0.08,
    0.92 + Math.random() * 0.08,
    1.0,
  ];

  const BLUE = () => [
    0.55 + Math.random() * 0.15,
    0.70 + Math.random() * 0.15,
    1.0,
  ];

  const WARM = () => [
    1.0,
    0.85 + Math.random() * 0.15,
    0.60 + Math.random() * 0.20,
  ];

  const layerDefs = [
    {
      count: 500,
      sizeMean: 0.010,
      sizeVar: 0.007,
      colorFn: WHITE,
      spread: 5.0,
      rotSpeed: 0.000010,
    },
    {
      count: 220,
      sizeMean: 0.008,
      sizeVar: 0.005,
      colorFn: BLUE,
      spread: 6.5,
      rotSpeed: 0.000006,
    },
    {
      count: 90,
      sizeMean: 0.022,
      sizeVar: 0.010,
      colorFn: WARM,
      spread: 3.5,
      rotSpeed: 0.000015,
    },
    {
      count: 120,
      sizeMean: 0.012,
      sizeVar: 0.006,
      colorFn: WHITE,
      spread: 4.0,
      rotSpeed: 0.000008,
    },
  ];

  const layers = layerDefs.map((def) => {
    const layer = makeLayer(def);
    scene.add(layer.mesh);
    return layer;
  });

  // ── Animation ─────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    layers.forEach(({ mesh, uTime, rotSpeed }) => {
      mesh.rotation.y += rotSpeed;
      mesh.rotation.x = Math.sin(t * 0.02) * 0.03;
      uTime.value = t;
    });

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
