/**
 * Los Santos WebGL Engine
 * Manages Three.js Renderer, Shadows, Day/Night Cycle, Weather, Sky, and Particle Systems
 */
export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;

    // Core Three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);

    // Dynamic Atmosphere & Sky
    this.scene.fog = new THREE.FogExp2(0xd6e5f3, 0.0018);

    // Lighting
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.75);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.6);
    this.sunLight.position.set(200, 300, 150);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 800;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Time of Day (0 to 24)
    this.timeOfDay = 14.5;
    this.timeSpeed = 0.02;

    // Weather ('clear', 'sunset', 'rain', 'night')
    this.currentWeather = 'clear';
    this.rainParticles = null;
    this.rainGeometry = null;

    // Active Particles List
    this.particles = [];

    this.initSky();
    this.initRain();
    this.initResizeListener();
  }

  initSky() {
    const vertexShader = [
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
      '  vWorldPosition = worldPosition.xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n');

    const fragmentShader = [
      'uniform vec3 topColor;',
      'uniform vec3 bottomColor;',
      'uniform float offset;',
      'uniform float exponent;',
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  float h = normalize(vWorldPosition + offset).y;',
      '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
      '}'
    ].join('\n');

    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x3a88e9) },
      bottomColor: { value: new THREE.Color(0xf6d3a4) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };
    const skyGeo = new THREE.SphereGeometry(1200, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: this.skyUniforms,
      side: THREE.BackSide
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  initRain() {
    const count = 4000;
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.25,
      transparent: true,
      opacity: 0.7
    });
    this.rainParticles = new THREE.Points(this.rainGeometry, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setWeather(weather) {
    this.currentWeather = weather;
    if (weather === 'rain') {
      this.rainParticles.visible = true;
      this.scene.fog.color.setHex(0x334455);
      this.scene.fog.density = 0.004;
      this.renderer.toneMappingExposure = 0.9;
    } else if (weather === 'sunset') {
      this.rainParticles.visible = false;
      this.timeOfDay = 18.0;
      this.scene.fog.color.setHex(0xeb7d34);
      this.scene.fog.density = 0.002;
      this.renderer.toneMappingExposure = 1.25;
    } else if (weather === 'night') {
      this.rainParticles.visible = false;
      this.timeOfDay = 23.0;
      this.scene.fog.color.setHex(0x0a0e17);
      this.scene.fog.density = 0.003;
      this.renderer.toneMappingExposure = 0.8;
    } else {
      this.rainParticles.visible = false;
      this.timeOfDay = 13.0;
      this.scene.fog.color.setHex(0xd6e5f3);
      this.scene.fog.density = 0.0018;
      this.renderer.toneMappingExposure = 1.15;
    }
  }

  update(deltaTime, playerPosition) {
    this.timeOfDay = (this.timeOfDay + deltaTime * this.timeSpeed) % 24;

    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDistance = 400;
    const sunY = Math.sin(sunAngle) * sunDistance;
    const sunX = Math.cos(sunAngle) * sunDistance;

    if (playerPosition) {
      this.sunLight.position.set(playerPosition.x + sunX, Math.max(sunY, 15), playerPosition.z + 100);
      this.sunLight.target.position.copy(playerPosition);
    }

    if (this.timeOfDay > 6 && this.timeOfDay < 18) {
      this.sunLight.intensity = Math.max(0.2, Math.sin((this.timeOfDay - 6) / 12 * Math.PI) * 1.8);
      this.skyUniforms.topColor.value.setHex(0x2874a6);
      this.skyUniforms.bottomColor.value.setHex(0xfad7a0);
      this.ambientLight.intensity = 0.75;
    } else if (this.timeOfDay >= 18 && this.timeOfDay < 20) {
      this.sunLight.intensity = 1.1;
      this.skyUniforms.topColor.value.setHex(0x4a235a);
      this.skyUniforms.bottomColor.value.setHex(0xe67e22);
      this.ambientLight.intensity = 0.55;
    } else {
      this.sunLight.intensity = 0.15;
      this.skyUniforms.topColor.value.setHex(0x05070d);
      this.skyUniforms.bottomColor.value.setHex(0x1a2536);
      this.ambientLight.intensity = 0.35;
    }

    if (this.rainParticles && this.rainParticles.visible && playerPosition) {
      this.rainParticles.position.x = playerPosition.x;
      this.rainParticles.position.z = playerPosition.z;

      const positions = this.rainGeometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= deltaTime * 45;
        if (positions[i] < 0) positions[i] = 50;
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.update) p.update(deltaTime);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  spawnExplosionFX(position) {
    const geo = new THREE.SphereGeometry(3.5, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const light = new THREE.PointLight(0xffaa22, 6, 25);
    light.position.copy(position);
    this.scene.add(light);

    this.particles.push({
      mesh: mesh,
      life: 0.6,
      update: (dt) => {
        mesh.scale.addScalar(dt * 8);
        mat.opacity -= dt * 1.5;
        light.intensity -= dt * 9;
        if (light.intensity <= 0) this.scene.remove(light);
      }
    });

    const ringGeo = new THREE.RingGeometry(1, 4, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).add(new THREE.Vector3(0, 0.2, 0));
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      life: 0.8,
      update: (dt) => {
        ring.scale.addScalar(dt * 12);
        ringMat.opacity -= dt * 1.1;
      }
    });
  }

  spawnSparks(position, count = 8) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
      const spark = new THREE.Mesh(geo, mat);
      spark.position.copy(position);
      this.scene.add(spark);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 6
      );

      this.particles.push({
        mesh: spark,
        life: 0.35,
        update: (dt) => {
          vel.y -= 15 * dt;
          spark.position.addScaledVector(vel, dt);
        }
      });
    }
  }

  initResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
