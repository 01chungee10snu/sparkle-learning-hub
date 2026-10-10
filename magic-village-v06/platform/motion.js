/**
 * A small, transparent Three.js decoration around the existing fairy portrait.
 * initMotion is synchronous; loading the locally vendored renderer is lazy.
 * No textures, analytics, remote requests or interaction are needed here.
 */
const MODES = new Set(['welcome', 'thinking', 'success', 'retry', 'finished', 'reward']);
const BURST_MODES = new Set(['success', 'finished', 'reward']);
const FRAME_MS = 1000 / 30;
const MAX_PARTICLES = 20;

function cosmetics(value) {
  const ids = new Set();
  const collect = item => {
    if (typeof item === 'string') ids.add(item);
    else if (Array.isArray(item) || item instanceof Set) item.forEach(collect);
    else if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, entry]) => {
        if (entry === true) ids.add(key);
        else collect(entry);
      });
    }
  };
  collect(value);
  return ids;
}

/**
 * @param {HTMLElement} host A persistent, positioned portrait-sized container.
 * @returns {{update: Function, burst: Function, dispose: Function}}
 * who: 'tae' (pink) or 'se' (lilac). Equipped may be IDs or an object of IDs.
 * Modes success/finished/reward trigger one burst on a transition into that mode.
 */
export function initMotion(host) {
  if (!host || typeof host.appendChild !== 'function') {
    return {update() {}, burst() {}, dispose() {}};
  }

  let state = {who: 'tae', mode: 'welcome', equipped: [],effect: {}};
  let equipped = cosmetics(state.equipped);
  let scene, camera, renderer, stars, gems, particles, orbit, halo, comet;
  let stopped = false, unavailable = false, frame = 0;
  let width = 0, height = 0, halfWidth = 1, halfHeight = 1.4;
  let clock = 0, previousTick = 0, lastRendered = 0;
  let burstAge = Infinity, queuedBurst = null;
  let intersects = true;
  const geometries = new Set(), materials = new Set();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionPreference.matches;
  host.setAttribute('aria-hidden', 'true');
  host.style.pointerEvents = 'none';
  host.dataset.motion = 'loading';

  const keepGeometry = geometry => {geometries.add(geometry); return geometry;};
  const keepMaterial = material => {materials.add(material); return material;};
  const canRun = () => !stopped && !unavailable && renderer && width > 0 && height > 0
    && !document.hidden && intersects;

  function cancelFrame() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousTick = 0;
  }

  function fallback() {
    unavailable = true;
    cancelFrame();
    if (!stopped) host.dataset.motion = 'fallback';
    renderer?.domElement.remove();
    // The portrait remains a normal CSS image when WebGL is unavailable/lost.
  }

  function tint() {
    if (!renderer) return;
    const color = state.effect.color || (state.who === 'se' ? 0xb28be9 : 0xef8bb3);
    const rainbow=[0xef8bb3,0xffbf39,0x39bfa1,0x4b9ce2,0x9470ef];
    stars.forEach((star, i) => {
      star.material.color.setHex(state.effect.rainbow?rainbow[i%rainbow.length]:i % 3 === 0 ? 0xffd879 : color);
      star.material.emissive.setHex(state.effect.rainbow?rainbow[i%rainbow.length]:i % 3 === 0 ? 0xffcf68 : color);
    });
    gems.forEach(gem => {
      gem.material.color.setHex(color);
      gem.material.emissive.setHex(color);
    });
    orbit.material.color.setHex(color);
    halo.material.color.setHex(color);
    comet.material.color.setHex(color);
    particles.forEach((particle, i) => {
      const hex = i % 3 === 0 ? 0xffcf68 : color;
      particle.material.color.setHex(hex);
      particle.material.emissive.setHex(hex);
    });
    host.dataset.who = state.who;
  }

  function startBurst(kind) {
    if (stopped || unavailable) return;
    if (!renderer) {queuedBurst = kind; return;}
    burstAge = 0;
    const count = kind === 'success' ? 14 : MAX_PARTICLES;
    particles.forEach((particle, index) => {
      const angle = index * Math.PI * 2 / count + 0.13;
      // Deterministic, finite particles: celebrate around the portrait, not over it.
      particle.userData = {
        active: index < count,
        angle,
        speed: 0.7 + (index % 4) * 0.12,
        scale: 0.044 + (index % 3) * 0.014,
        spin: (index % 2 ? -1 : 1) * (0.8 + index % 3),
      };
      particle.visible = index < count;
      particle.material.opacity = reduced ? 0.7 : 1;
    });
    paint(reduced ? 0 : clock);
    resume();
  }

  function paint(time) {
    if (!canRun()) return;
    const moodSpeed = state.effect.speed || (state.mode === 'thinking' ? 0.36 : state.mode === 'retry' ? 0.2 : 0.48);
    const celebration = BURST_MODES.has(state.mode);
    const orbitX = halfWidth * 0.77, orbitY = halfHeight * 0.74;
    const starCount = state.effect.count || (equipped.has('trail-stars') ? stars.length : 5);
    stars.forEach((star, index) => {
      const angle = index / starCount * Math.PI * 2 + time * moodSpeed;
      star.position.set(Math.cos(angle) * orbitX, Math.sin(angle) * orbitY, Math.sin(angle) * 0.12);
      star.rotation.set(0.18 + Math.sin(time + index) * 0.2, time * 0.45 + index, angle * 0.12);
      const size = (index % 3 === 0 ? 0.095 : 0.067) * (celebration ? 1.12 : 1);
      star.scale.setScalar(size);
      star.visible = index < starCount;
    });
    gems.forEach((gem, index) => {
      const angle = time * -moodSpeed * 0.7 + 0.72 + index * Math.PI;
      gem.position.set(Math.cos(angle) * orbitX * 0.94, Math.sin(angle) * orbitY * 0.94, -0.12);
      gem.rotation.set(time * 0.35, time * 0.4 + index, index * 0.3);
      gem.scale.setScalar(state.effect.gemScale||0.05);
    });
    orbit.scale.set(orbitX, orbitY, 1);
    orbit.rotation.z = Math.sin(time * 0.25) * 0.025;
    orbit.material.opacity = state.effect.ring?0.65:state.mode === 'thinking' ? 0.24 : 0.14;
    halo.visible = Boolean(state.effect.halo)||equipped.has('halo');
    halo.position.set(0, halfHeight * 0.8, -0.08);
    halo.scale.set(halfWidth * 0.42, halfHeight * 0.15, 0.15);
    halo.rotation.x = 0.35;
    halo.rotation.z = Math.sin(time * 0.6) * 0.08;
    comet.visible = Boolean(state.effect.comet)||equipped.has('comet');
    const cometAngle = time * 0.8;
    comet.position.set(Math.cos(cometAngle) * orbitX, Math.sin(cometAngle) * orbitY, -0.2);
    comet.rotation.z = cometAngle + Math.PI / 2;
    comet.scale.set(0.11, 0.07, 1);

    particles.forEach(particle => {
      const data = particle.userData;
      if (!data.active) return;
      const age = reduced ? 0.4 : burstAge;
      particle.visible = age < 1.65;
      if (!particle.visible) {data.active = false; return;}
      const radius = 0.38 + age * data.speed;
      particle.position.set(
        Math.cos(data.angle) * orbitX * radius,
        Math.sin(data.angle) * orbitY * radius + age * 0.18,
        0.2 + Math.sin(data.angle) * 0.15,
      );
      particle.rotation.set(age * data.spin, age * data.spin * 0.6, data.angle + age * data.spin);
      particle.scale.setScalar(data.scale * (1 - Math.min(0.65, age * 0.32)));
      particle.material.opacity = reduced ? 0.7 : Math.max(0, 1 - age / 1.65);
    });
    try {renderer.render(scene, camera);} catch {fallback();}
  }

  function tick(timestamp) {
    frame = 0;
    if (!canRun() || reduced) {previousTick = 0; return;}
    if (!previousTick) previousTick = timestamp;
    if (!lastRendered || timestamp - lastRendered >= FRAME_MS - 1) {
      const delta = Math.min(0.08, (timestamp - previousTick) / 1000);
      clock += delta;
      burstAge += delta;
      previousTick = timestamp;
      lastRendered = timestamp;
      paint(clock);
    }
    if (canRun()) frame = window.requestAnimationFrame(tick);
  }

  function resume() {
    if (!canRun()) {cancelFrame(); return;}
    if (reduced) {cancelFrame(); paint(0); return;}
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function resize() {
    if (stopped || unavailable) return;
    const bounds = host.getBoundingClientRect();
    width = Math.round(bounds.width);
    height = Math.round(bounds.height);
    if (!renderer || !width || !height) {cancelFrame(); return;}
    // Avoid high-resolution mobile canvases and keep the view local to its host.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    halfWidth = halfHeight * width / height;
    camera.left = -halfWidth; camera.right = halfWidth;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    paint(reduced ? 0 : clock);
    resume();
  }

  function onVisibility() {
    if (document.hidden) cancelFrame();
    else {lastRendered = 0; resize();}
  }
  function onPreference(event) {
    reduced = event.matches;
    cancelFrame();
    lastRendered = 0;
    paint(reduced ? 0 : clock);
    resume();
  }
  function onContextLost(event) {
    event.preventDefault();
    fallback();
  }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    intersects = entries.some(entry => entry.isIntersecting);
    resume();
  }) : null;
  intersection?.observe(host);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize, {passive: true});
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onPreference);
  else motionPreference.addListener(onPreference);

  import('../vendor/three.module.min.js').then(THREE => {
    if (stopped) return;
    try {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, halfHeight, -halfHeight, 0.1, 20);
      camera.position.z = 7;
      renderer = new THREE.WebGLRenderer({alpha: true, antialias: false, powerPreference: 'low-power'});
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;';
      canvas.addEventListener('webglcontextlost', onContextLost, false);
      host.appendChild(canvas);
      const ambient = new THREE.HemisphereLight(0xffffff, 0xd5bced, 2.3);
      const sun = new THREE.DirectionalLight(0xffffff, 1.8);
      sun.position.set(-3, 4, 7);
      scene.add(ambient, sun);

      const shape = new THREE.Shape();
      for (let point = 0; point < 10; point++) {
        const angle = Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 0.43 : 1;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (point === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      shape.closePath();
      const starGeometry = keepGeometry(new THREE.ExtrudeGeometry(shape, {
        depth: 0.19, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06,
        bevelSegments: 1, steps: 1, curveSegments: 1,
      }));
      starGeometry.translate(0, 0, -0.095);
      const gemstone = keepGeometry(new THREE.OctahedronGeometry(1, 0));
      const makeMaterial = transparent => keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xef8bb3, roughness: 0.65, metalness: 0.04,
        emissive: 0xef8bb3, emissiveIntensity: 0.15,
        transparent, depthWrite: !transparent,
      }));
      stars = Array.from({length: 9}, () => {
        const mesh = new THREE.Mesh(starGeometry, makeMaterial(false));
        scene.add(mesh); return mesh;
      });
      gems = Array.from({length: 2}, () => {
        const mesh = new THREE.Mesh(gemstone, makeMaterial(false));
        scene.add(mesh); return mesh;
      });
      particles = Array.from({length: MAX_PARTICLES}, () => {
        const mesh = new THREE.Mesh(starGeometry, makeMaterial(true));
        mesh.visible = false; mesh.userData.active = false;
        scene.add(mesh); return mesh;
      });
      const orbitPoints = Array.from({length: 65}, (_, index) => {
        const angle = index / 64 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle), Math.sin(angle), -0.2);
      });
      orbit = new THREE.Line(keepGeometry(new THREE.BufferGeometry().setFromPoints(orbitPoints)),
        keepMaterial(new THREE.LineBasicMaterial({color: 0xef8bb3, transparent: true, opacity: 0.14})));
      halo = new THREE.Mesh(keepGeometry(new THREE.TorusGeometry(1, 0.055, 4, 32)),
        keepMaterial(new THREE.MeshBasicMaterial({color: 0xef8bb3, transparent: true, opacity: 0.58})));
      const cometShape = new THREE.Shape();
      cometShape.moveTo(0, 1); cometShape.quadraticCurveTo(-0.95, -0.2, 0, -2.5);
      cometShape.quadraticCurveTo(0.6, -0.2, 0, 1);
      comet = new THREE.Mesh(keepGeometry(new THREE.ShapeGeometry(cometShape, 4)),
        keepMaterial(new THREE.MeshBasicMaterial({color: 0xef8bb3, transparent: true, opacity: 0.65, side: THREE.DoubleSide})));
      scene.add(orbit, halo, comet);
      tint();
      host.dataset.motion = 'three';
      resize();
      if (queuedBurst) {const kind = queuedBurst; queuedBurst = null; startBurst(kind);}
      else resume();
    } catch {
      fallback();
      renderer?.dispose();
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    }
  }).catch(fallback);

  return {
    update(next = {}) {
      if (stopped) return;
      const previousMode = state.mode;
      const previousWho = state.who;
      state = {
        who: next.who === undefined ? state.who : next.who === 'se' ? 'se' : 'tae',
        mode: MODES.has(next.mode) ? next.mode : state.mode,
        equipped: next.equipped === undefined ? state.equipped : next.equipped,
        effect: next.effect === undefined ? state.effect : next.effect,
      };
      equipped = cosmetics(state.equipped);
      host.dataset.mode = state.mode;
      if (previousWho !== state.who || (reduced && previousMode !== state.mode && !BURST_MODES.has(state.mode))) {
        burstAge = Infinity;
        queuedBurst = null;
        particles?.forEach(particle => {particle.visible = false; particle.userData.active = false;});
      }
      tint();
      if (previousMode !== state.mode && BURST_MODES.has(state.mode)) startBurst(state.mode);
      else {paint(reduced ? 0 : clock); resume();}
    },
    burst(kind = 'success') {startBurst(BURST_MODES.has(kind) ? kind : 'success');},
    dispose() {
      if (stopped) return;
      stopped = true;
      cancelFrame();
      observer?.disconnect();
      intersection?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      if (motionPreference.removeEventListener) motionPreference.removeEventListener('change', onPreference);
      else motionPreference.removeListener(onPreference);
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.remove();
        renderer.dispose();
      }
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      geometries.clear(); materials.clear();
      delete host.dataset.motion;
      delete host.dataset.mode;
      delete host.dataset.who;
    },
  };
}
