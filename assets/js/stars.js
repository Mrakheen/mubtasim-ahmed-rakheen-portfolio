// stars.js — loaded as type="module", uses import-map THREE (not the global CDN one)
import * as THREE from 'three';

(function () {
  const container = document.getElementById('stars-js');
  if (!container) return;

  // ── Renderer ────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // fully transparent bg — let your existing background show
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // ── Scene / Camera ──────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 500);
  camera.position.set(0, 2.2, 3.2);
  camera.lookAt(0, 0, 0);

  // ── Helper: random in spiral arm ───────────────────────────────────
  function galaxyPoint(armIndex, numArms, spread) {
    const armAngle = (armIndex / numArms) * Math.PI * 2;
    const t        = Math.pow(Math.random(), 0.6);         // bias toward center
    const r        = 0.08 + t * spread;
    const spin     = t * Math.PI * 3.8 + armAngle;
    const scatter  = (1 - t * 0.65) * 0.22 * (Math.random() * 2 - 1);
    return {
      x: Math.cos(spin) * r + scatter,
      y: (Math.random() - 0.5) * 0.07 * (1 - t * 0.8),
      z: Math.sin(spin) * r + scatter,
    };
  }

  // ── Star layer factory ──────────────────────────────────────────────
  function makeLayer({ count, baseSize, color, opacity, type, spread }) {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const phases    = new Float32Array(count);
    const base      = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      let x, y, z;

      if (type === 'galaxy') {
        const p = galaxyPoint(i % 3, 3, spread);
        x = p.x; y = p.y; z = p.z;

      } else if (type === 'halo') {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = spread * (0.5 + Math.random() * 0.5);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) * 0.35;
        z = r * Math.cos(phi);

      } else if (type === 'bright') {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 0.4 + Math.random() * spread;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
        z = r * Math.cos(phi);

      } else { // core
        const r     = Math.random() * spread;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta) * 0.4;
        y = r * Math.sin(phi) * Math.sin(theta) * 0.12;
        z = r * Math.cos(phi) * 0.4;
      }

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const v = 0.07;
      colors[i * 3]     = Math.min(1, base.r + (Math.random() - 0.5) * v);
      colors[i * 3 + 1] = Math.min(1, base.g + (Math.random() - 0.5) * v);
      colors[i * 3 + 2] = Math.min(1, base.b + (Math.random() - 0.5) * v);

      sizes[i]  = baseSize * (0.4 + Math.random() * 1.4);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.PointsMaterial({
      size:            baseSize * 2.5,
      vertexColors:    true,
      transparent:     true,
      opacity:         opacity,
      depthWrite:      false,
      sizeAttenuation: true,
    });

    return { points: new THREE.Points(geo, mat), phases, baseSize, opacity, type };
  }

  // ── Build layers ────────────────────────────────────────────────────
  const layerDefs = [
    { count: 260, baseSize: 0.005, color: 0xffffff, opacity: 0.80, type: 'galaxy',  spread: 1.6 },
    { count: 120, baseSize: 0.003, color: 0x99bbff, opacity: 0.45, type: 'halo',    spread: 2.4 },
    { count:  80, baseSize: 0.009, color: 0xfff5e0, opacity: 0.95, type: 'bright',  spread: 1.5 },
    { count:  60, baseSize: 0.004, color: 0xffcc88, opacity: 0.60, type: 'core',    spread: 0.9 },
  ];

  const layers = layerDefs.map(def => {
    const layer = makeLayer(def);
    scene.add(layer.points);
    return layer;
  });

  // ── Subtle nebula glow band (no texture needed) ─────────────────────
  const nebulaGeo = new THREE.PlaneGeometry(4, 0.55);
  const nebulaMat = new THREE.MeshBasicMaterial({
    color: 0x2244aa, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide,
  });
  const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
  nebula.rotation.x = Math.PI / 2;
  scene.add(nebula);

  // ── Animation loop ──────────────────────────────────────────────────
  function animate(ts) {
    requestAnimationFrame(animate);
    const t = ts * 0.001;

    layers.forEach((layer, idx) => {
      // Differential rotation — outer halo slower
      const speed = idx === 1 ? 0.000018 : 0.000042;
      layer.points.rotation.y += speed;
      // Gentle long-period tilt drift
      layer.points.rotation.x = Math.sin(t * 0.025 + idx) * 0.012;

      // Per-star sparkle on bright layer only
      if (layer.type === 'bright') {
        const sa = layer.points.geometry.attributes.size.array;
        for (let i = 0; i < sa.length; i++) {
          sa[i] = layer.baseSize * (0.5 + 1.1 * Math.abs(Math.sin(t * 0.9 + layer.phases[i])));
        }
        layer.points.geometry.attributes.size.needsUpdate = true;
      }

      // Slow collective opacity pulse
      layer.points.material.opacity = layer.opacity * (0.92 + 0.08 * Math.sin(t * 0.3 + idx));
    });

    renderer.render(scene, camera);
  }

  animate(0);

  // ── Resize ──────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
