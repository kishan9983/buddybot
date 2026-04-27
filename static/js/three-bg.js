// ── Three.js Animated Background ───────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

(function () {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 40);

  // ── Particle System ────────────────────────────────────────
  const PARTICLE_COUNT = 1800;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);

  const palette = [
    new THREE.Color('#8b5cf6'),
    new THREE.Color('#6366f1'),
    new THREE.Color('#60a5fa'),
    new THREE.Color('#c084fc'),
    new THREE.Color('#a78bfa'),
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = Math.random() * 1.5 + 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // ── Glowing Orbs ──────────────────────────────────────────
  function createOrb(color, x, y, z, radius) {
    const g = new THREE.SphereGeometry(radius, 32, 32);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const light = new THREE.PointLight(color, 1.5, 50);
    light.position.set(x, y, z);
    scene.add(light);
    return { mesh, light };
  }

  const orbs = [
    createOrb(0x8b5cf6, -15, 8, 0, 5),
    createOrb(0x6366f1,  18, -6, -5, 6),
    createOrb(0x60a5fa,  2,  14, -10, 4),
  ];

  // ── Mouse Parallax ─────────────────────────────────────────
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Resize Handler ─────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animation Loop ─────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth parallax
    targetX += (mouseX * 4 - targetX) * 0.05;
    targetY += (-mouseY * 3 - targetY) * 0.05;
    camera.position.x = targetX;
    camera.position.y = targetY;
    camera.lookAt(scene.position);

    // Rotate particles slowly
    particles.rotation.y = t * 0.04;
    particles.rotation.x = t * 0.015;

    // Animate orbs
    orbs.forEach((orb, i) => {
      const offset = (i * Math.PI * 2) / 3;
      orb.mesh.position.x += Math.sin(t * 0.5 + offset) * 0.02;
      orb.mesh.position.y += Math.cos(t * 0.4 + offset) * 0.02;
      orb.light.position.copy(orb.mesh.position);
      orb.light.intensity = 1.2 + Math.sin(t * 1.5 + offset) * 0.5;
      orb.mesh.material.opacity = 0.05 + Math.sin(t * 0.8 + offset) * 0.04;
    });

    renderer.render(scene, camera);
  }

  animate();
})();
