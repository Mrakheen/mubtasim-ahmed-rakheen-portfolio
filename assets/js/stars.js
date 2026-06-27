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
  camera.position.set(0, 3.5, 0.1);
  camera.lookAt(0, 0, 0);

  // ── Shared round-star shader material ────────────────────────────────
  const VERT = `
    attribute float aSize;
    attribute float aPhase;
    attribute vec3  aColor;
    varying   vec3  vColor;
    varying   float vPhase;
    uniform   float uTime;

    void main() {
      vColor = aColor;
      vPhase = aPhase;

      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);

      float dist = length(mvPos.xyz);
      float twinkle = 0.78 + 0.22 * sin(uTime * 1.4 + aPhase);

      gl_PointSize = (aSize / dist) * twinkle * 280.0;
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const FRAG = `
    varying vec3  vColor;
    varying float vPhase;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float dist = length(uv);

      if (dist > 0.5) discard;

      float alpha = exp(-dist * dist * 8.0) * 0.95;
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

  // ── Star placement helpers ────────────────────────────────────────────
  function spiralPoint(armIdx, numArms, spread) {
    const armAngle = (armIdx / numArms) * Math.PI * 2;
    const t = Math.pow(Math.random(), 0.55);
    const r = 0.05 + t * spread;
    const spin = t * Math.PI * 4.2 + armAngle;
    const scatter = (1.0 - t * 0.7) * 0.20 * (Math.random() * 2 - 1);

    return [
      Math.cos(spin) * r + scatter,
      (Math.random() - 0.5) * 0.06 * (1.0 - t * 0.85),
      Math.sin(spin) * r + scatter,
    ];
  }

  function spherePoint(r) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  }

  // ── Build a star layer ────────────────────────────────────────────────
  function makeLayer({
    count,
    sizeMean,
    sizeVar,
    colorFn,
    type,
    spread,
    rotSpeed,
  }) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      let p;

      if (type === "galaxy") {
        p = spiralPoint(i % 4, 4, spread);
      } else if (type === "halo") {
        const [x, y, z] = spherePoint(
          spread * (0.55 + Math.random() * 0.45)
        );
        p = [x, y * 0.28, z];
      } else if (type === "core") {
        p = spiralPoint(i % 2, 2, spread * 0.22);
      } else {
        p = spherePoint(spread * Math.random());
      }

      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];

      const c = colorFn(i);

      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];

      sizes[i] = sizeMean + (Math.random() - 0.5) * sizeVar;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geo.setAttribute(
      "aColor",
      new THREE.BufferAttribute(colors, 3)
    );
    geo.setAttribute(
      "aSize",
      new THREE.BufferAttribute(sizes, 1)
    );
    geo.setAttribute(
      "aPhase",
      new THREE.BufferAttribute(phases, 1)
    );

    const uTime = { value: 0.0 };
    const mat = makeShaderMat(uTime);
    const mesh = new THREE.Points(geo, mat);

    return { mesh, uTime, rotSpeed };
  }

  // ── Layers ────────────────────────────────────────────────────────────
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
    0.88 + Math.random() * 0.12,
    0.60 + Math.random() * 0.18,
  ];

  const YELLOW = () => [
    1.0,
    0.95 + Math.random() * 0.05,
    0.70 + Math.random() * 0.10,
  ];

  const layerDefs = [
    // Galactic disk
    {
      count: 340,
      sizeMean: 0.012,
      sizeVar: 0.008,
      colorFn: WHITE,
      type: "galaxy",
      spread: 1.7,
      rotSpeed: 0.000040,
    },

    // Outer halo
    {
      count: 160,
      sizeMean: 0.007,
      sizeVar: 0.004,
      colorFn: BLUE,
      type: "halo",
      spread: 2.6,
      rotSpeed: 0.000012,
    },

    // Bright foreground stars
    {
      count: 60,
      sizeMean: 0.028,
      sizeVar: 0.014,
      colorFn: WARM,
      type: "scatter",
      spread: 1.8,
      rotSpeed: 0.000022,
    },

    // Dense galactic core (updated)
    {
      count: 220,
      sizeMean: 0.011,
      sizeVar: 0.006,
      colorFn: YELLOW,
      type: "core",
      spread: 0.65,
      rotSpeed: 0.000055,
    },
  ];

  const layers = layerDefs.map((def) => {
    const layer = makeLayer(def);
    scene.add(layer.mesh);
    return layer;
  });

   // ── Milky Way dust band (faint translucent disc) ──────────────────────
  const dustGeo = new THREE.PlaneGeometry(3.6, 0.55, 1, 1);

  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x334488,
    transparent: true,
    opacity: 0.032,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const dust = new THREE.Mesh(dustGeo, dustMat);
  dust.rotation.x = Math.PI / 2;
  scene.add(dust);

  // ── Animation ─────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    layers.forEach(({ mesh, uTime, rotSpeed }) => {
      mesh.rotation.y += rotSpeed;

      // Long-period gentle tilt
      mesh.rotation.x =
        0.04 + Math.sin(elapsed * 0.018) * 0.022;

      uTime.value = elapsed;
    });

    // Dust band co-rotates with galaxy disk
    dust.rotation.y = layers[0].mesh.rotation.y;

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  });
})();


