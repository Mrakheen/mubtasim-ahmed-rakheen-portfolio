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
 
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 500);
  camera.position.set(0, 3.5, 0.1);
  camera.lookAt(0, 0, 0);
 
  // ── Shared round-star shader material ────────────────────────────────
  // Uses gl_PointCoord to draw a smooth circular gaussian disc —
  // completely eliminates the "square pixel" look.
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
      // Size attenuates with distance; base multiplied by per-star random
      float dist   = length(mvPos.xyz);
      float twinkle = 0.78 + 0.22 * sin(uTime * 1.4 + aPhase);
      gl_PointSize = (aSize / dist) * twinkle * 280.0;
      gl_Position  = projectionMatrix * mvPos;
    }
  `;
 
  const FRAG = `
    varying vec3  vColor;
    varying float vPhase;
 
    void main() {
      // Signed distance from centre of the point sprite → perfect circle
      vec2  uv   = gl_PointCoord - 0.5;
      float dist = length(uv);
      if (dist > 0.5) discard;
 
      // Gaussian soft glow — bright centre, fades to zero at edge
      float alpha = exp(-dist * dist * 8.0) * 0.95;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;
 
  function makeShaderMat(uTime) {
    return new THREE.ShaderMaterial({
      uniforms:       { uTime },
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    });
  }
 
  // ── Star placement helpers ────────────────────────────────────────────
  function spiralPoint(armIdx, numArms, spread) {
    const armAngle = (armIdx / numArms) * Math.PI * 2;
    const t        = Math.pow(Math.random(), 0.55);
    const r        = 0.05 + t * spread;
    const spin     = t * Math.PI * 4.2 + armAngle;
    const scatter  = (1.0 - t * 0.7) * 0.20 * (Math.random() * 2 - 1);
    return [
      Math.cos(spin) * r + scatter,
      (Math.random() - 0.5) * 0.06 * (1.0 - t * 0.85),
      Math.sin(spin) * r + scatter,
    ];
  }
 
  function spherePoint(r) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  }
 
  // ── Build a star layer ────────────────────────────────────────────────
  function makeLayer({ count, sizeMean, sizeVar, colorFn, type, spread, rotSpeed }) {
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const phases    = new Float32Array(count);
 
    for (let i = 0; i < count; i++) {
      let p;
      if      (type === 'galaxy')  p = spiralPoint(i % 4, 4, spread);
      else if (type === 'halo')    { const [x,y,z] = spherePoint(spread * (0.55 + Math.random()*0.45)); p = [x, y*0.28, z]; }
      else if (type === 'core')    p = spiralPoint(i % 2, 2, spread * 0.22);
      else                         p = spherePoint(spread * Math.random());
 
      positions[i*3]   = p[0];
      positions[i*3+1] = p[1];
      positions[i*3+2] = p[2];
 
      const c = colorFn(i);
      colors[i*3]   = c[0];
      colors[i*3+1] = c[1];
      colors[i*3+2] = c[2];
 
      sizes[i]  = sizeMean + (Math.random() - 0.5) * sizeVar;
      phases[i] = Math.random() * Math.PI * 2;
    }
 
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases,    1));
 
    const uTime = { value: 0.0 };
    const mat   = makeShaderMat(uTime);
    const mesh  = new THREE.Points(geo, mat);
 
    return { mesh, uTime, rotSpeed };
  }
 
  // ── Layers ────────────────────────────────────────────────────────────
  const WHITE  = () => [0.92 + Math.random()*0.08,  0.92 + Math.random()*0.08,  1.0];
  const BLUE   = () => [0.55 + Math.random()*0.15,  0.70 + Math.random()*0.15,  1.0];
  const WARM   = () => [1.0,  0.88 + Math.random()*0.12, 0.60 + Math.random()*0.18];
  const YELLOW = () => [1.0,  0.95 + Math.random()*0.05, 0.70 + Math.random()*0.10];
 
  const layerDefs = [
    // Galactic disk — 4-arm spiral, small dense stars
    { count: 340, sizeMean: 0.012, sizeVar: 0.008, colorFn: WHITE,  type: 'galaxy', spread: 1.7, rotSpeed: 0.000040 },
    // Outer halo — faint blue distant stars, flat disc
    { count: 160, sizeMean: 0.007, sizeVar: 0.004, colorFn: BLUE,   type: 'halo',   spread: 2.6, rotSpeed: 0.000012 },
    // Bright foreground stars — larger, warm, noticeable twinkle
    { count:  60, sizeMean: 0.028, sizeVar: 0.014, colorFn: WARM,   type: 'scatter',spread: 1.8, rotSpeed: 0.000022 },
    // Inner core region — dense warm-yellow cluster
    { count:  90, sizeMean: 0.010, sizeVar: 0.005, colorFn: YELLOW, type: 'core',   spread: 0.9, rotSpeed: 0.000055 },
  ];
 
  const layers = layerDefs.map(def => {
    const layer = makeLayer(def);
    scene.add(layer.mesh);
    return layer;
  });
 
  // ── Galactic core glow (additive sprite stack) ────────────────────────
  // Multiple concentric billboarded planes — no texture needed,
  // pure shader gradient gives a volumetric-looking core.
  const CORE_VERT = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
  const CORE_FRAG = `
    varying vec2 vUv;
    uniform float uRadius;
    uniform vec3  uColor;
 
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float g = exp(-d * d * uRadius);
      gl_FragColor = vec4(uColor * g, g * 0.85);
    }
  `;
 
  function addGlow(size, radius, color) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.ShaderMaterial({
      uniforms:       { uRadius: { value: radius }, uColor: { value: new THREE.Color(color) } },
      vertexShader:   CORE_VERT,
      fragmentShader: CORE_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      side:           THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    return mesh;
  }
 
  // Three nested glows: wide soft outer → tighter warm mid → bright hot centre
  const glowOuter  = addGlow(1.10, 3.5,  0x1a2fff);
  const glowMid    = addGlow(0.50, 7.0,  0x88aaff);
  const glowHot    = addGlow(0.22, 18.0, 0xffffff);
  const glowCore   = addGlow(0.08, 55.0, 0xffffff);
 
  // ── Milky Way dust band (faint translucent disc) ──────────────────────
  const dustGeo = new THREE.PlaneGeometry(3.6, 0.55, 1, 1);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x334488, transparent: true, opacity: 0.032, depthWrite: false, side: THREE.DoubleSide,
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
      // Long-period gentle tilt — feels like the galaxy is slowly tilting toward viewer
      mesh.rotation.x = 0.04 + Math.sin(elapsed * 0.018) * 0.022;
      uTime.value = elapsed;
    });
 
    // Core glows gently pulse in sync
    const pulse = 0.9 + 0.1 * Math.sin(elapsed * 0.6);
    glowOuter.material.uniforms.uRadius.value = 3.5  * pulse;
    glowMid  .material.uniforms.uRadius.value = 7.0  * pulse;
    glowHot  .material.uniforms.uRadius.value = 18.0 * (0.95 + 0.05 * Math.sin(elapsed * 1.1));
    glowCore .material.uniforms.uRadius.value = 55.0 * (0.97 + 0.03 * Math.sin(elapsed * 2.3));
 
    // Dust band co-rotates with galaxy disk
    dust.rotation.y = layers[0].mesh.rotation.y;
 
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
