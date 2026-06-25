import * as THREE from 'three';

function loadStars(divId, jsonUrl) {
  fetch(jsonUrl)
    .then(response => response.json())
    .then(config => {
      const container = document.getElementById(divId);
      if (!container) return;

      const width = container.offsetWidth;
      const height = container.offsetHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
      camera.position.set(0, 1.8, 2.8);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);

      const totalStars = config.stars.number.value;

      // ── Layer definitions ──────────────────────────────────────────
      // Each layer adds distinct visual depth
      const layers = [
        { count: Math.floor(totalStars * 0.55), size: 0.006, color: 0xffffff, opacity: 0.85, spread: 1.6, type: 'galaxy'  }, // main galaxy disk
        { count: Math.floor(totalStars * 0.20), size: 0.003, color: 0xaaccff, opacity: 0.5,  spread: 2.5, type: 'halo'    }, // distant blue haze
        { count: Math.floor(totalStars * 0.15), size: 0.010, color: 0xfff8e7, opacity: 0.95, spread: 1.4, type: 'bright'  }, // bright foreground stars
        { count: Math.floor(totalStars * 0.10), size: 0.004, color: 0xffd7a0, opacity: 0.6,  spread: 1.0, type: 'cluster' }, // warm core cluster
      ];

      const groups = [];

      layers.forEach(layer => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(layer.count * 3);
        const colors    = new Float32Array(layer.count * 3);
        const sizes     = new Float32Array(layer.count);
        const phases    = new Float32Array(layer.count); // per-star twinkle phase

        const baseColor = new THREE.Color(layer.color);

        for (let i = 0; i < layer.count; i++) {
          let x, y, z;

          if (layer.type === 'galaxy') {
            // Logarithmic spiral arms — 3 arms
            const arm      = Math.floor(Math.random() * 3);
            const armAngle = (arm / 3) * Math.PI * 2;
            const t        = Math.random();                          // 0 = core, 1 = edge
            const r        = 0.05 + t * layer.spread;
            const spin     = t * Math.PI * 3.5 + armAngle;         // spiral wind
            const scatter  = (1 - t * 0.6) * 0.18 * (Math.random() - 0.5) * 2;
            x = Math.cos(spin) * r + scatter;
            z = Math.sin(spin) * r + scatter;
            y = (Math.random() - 0.5) * 0.08 * (1 - t * 0.7);    // thin disk

          } else if (layer.type === 'halo') {
            // Roughly spherical halo with slight flattening
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = layer.spread * (0.6 + Math.random() * 0.4);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
            z = r * Math.cos(phi);

          } else if (layer.type === 'bright') {
            // Random placement but biased toward mid-distances
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            const r     = 0.3 + Math.random() * layer.spread;
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.4;
            z = r * Math.cos(phi);

          } else {
            // Tight warm core cluster
            const r = Math.random() * layer.spread;
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta) * 0.5;
            y = r * Math.sin(phi) * Math.sin(theta) * 0.15;
            z = r * Math.cos(phi) * 0.5;
          }

          positions[i * 3]     = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          // Slight per-star color variance for realism
          const variance = 0.06;
          colors[i * 3]     = Math.min(1, baseColor.r + (Math.random() - 0.5) * variance);
          colors[i * 3 + 1] = Math.min(1, baseColor.g + (Math.random() - 0.5) * variance);
          colors[i * 3 + 2] = Math.min(1, baseColor.b + (Math.random() - 0.5) * variance);

          sizes[i]  = layer.size * (0.5 + Math.random() * 1.2);
          phases[i] = Math.random() * Math.PI * 2;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
        geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

        const mat = new THREE.PointsMaterial({
          size:         layer.size * 2.2,
          vertexColors: true,
          transparent:  true,
          opacity:      layer.opacity,
          depthWrite:   false,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geo, mat);
        scene.add(points);
        groups.push({ points, mat, phases, layer });
      });

      // ── Nebula / glow plane ────────────────────────────────────────
      // A very faint, blurred plane to mimic the Milky Way band glow
      const nebulaGeo = new THREE.PlaneGeometry(3.5, 0.6);
      const nebulaMat = new THREE.MeshBasicMaterial({
        color:       0x3355aa,
        transparent: true,
        opacity:     0.04,
        depthWrite:  false,
        side:        THREE.DoubleSide,
      });
      const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
      nebula.rotation.x = Math.PI / 2;
      scene.add(nebula);

      // ── Animation ─────────────────────────────────────────────────
      let time = 0;

      function animate(ts) {
        requestAnimationFrame(animate);
        time = ts * 0.001; // seconds

        // Very slow galaxy rotation + gentle bobbing
        const rotSpeed  = 0.000035;
        const tiltSwing = Math.sin(time * 0.04) * 0.008;

        groups.forEach(({ points, phases, layer }) => {
          points.rotation.y += rotSpeed * (layer.type === 'halo' ? 0.4 : 1.0);
          points.rotation.x  = tiltSwing;

          // Twinkling: modulate opacity per group slightly
          const twinkle = 0.96 + 0.04 * Math.sin(time * 1.2);
          points.material.opacity = layer.layer.opacity * twinkle;

          // Update individual star sizes for subtle sparkle (only bright layer)
          if (layer.type === 'bright') {
            const sizesArr = points.geometry.attributes.size.array;
            for (let i = 0; i < sizesArr.length; i++) {
              const base = layer.size * (0.5 + 1.2 * ((phases[i] + 1) / 2)); // stable base
              sizesArr[i] = base * (0.75 + 0.5 * Math.abs(Math.sin(time * 0.8 + phases[i])));
            }
            points.geometry.attributes.size.needsUpdate = true;
          }
        });

        renderer.render(scene, camera);
      }

      animate(0);

      // ── Resize ────────────────────────────────────────────────────
      window.addEventListener('resize', () => {
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
    });
}

loadStars('stars-js', 'assets/json/stars.json');
