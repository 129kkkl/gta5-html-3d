/**
 * Los Santos 3D Procedural City & Open World System
 * Builds Downtown Skyscrapers, Vinewood Boulevard, Vespucci Beach & Ocean, Port Docks, LSIA Airport, Shops & Props
 */
export class CityWorld {
  constructor(scene) {
    this.scene = scene;

    // Colliders list for player and vehicle collisions
    this.colliders = [];

    // Interactive shop trigger zones
    this.shopZones = [];

    // Stunt ramps
    this.ramps = [];

    // Dynamic props (fire hydrants, traffic lights)
    this.trafficLights = [];
    this.destructibles = [];

    // Road network grid for AI traffic and GPS routing
    this.roadSegments = [];

    this.initWorld();
  }

  initWorld() {
    this.createGroundAndOcean();
    this.createRoadGrid();
    this.createDowntownDistrict();
    this.createVinewoodBoulevard();
    this.createVespucciBeachAndPier();
    this.createIndustrialDocks();
    this.createAirportAndRamps();
    this.createShopsAndEnterables();
    this.createStreetPropsAndFlora();
    this.createVinewoodSign();
  }

  // ================= GROUND & OCEAN =================
  createGroundAndOcean() {
    // City Base Terrain
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2b303a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Vespucci Ocean on West side (X < -280)
    const oceanGeo = new THREE.PlaneGeometry(800, 1400, 32, 32);
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x1a5276,
      emissive: 0x0e2f44,
      specular: 0x85c1e9,
      shininess: 90,
      transparent: true,
      opacity: 0.88
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(-650, -0.4, 0);
    this.scene.add(this.oceanMesh);

    // Sandy Beach Strip (-320 to -240)
    const sandGeo = new THREE.PlaneGeometry(100, 1200);
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xedd6af });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(-270, 0.05, 0);
    sand.receiveShadow = true;
    this.scene.add(sand);
  }

  // ================= ROAD GRID & INTERSECTIONS =================
  createRoadGrid() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x1f232a });
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Grid Layout: 5 East-West avenues, 5 North-South boulevards
    const gridSpacing = 90;
    const roadWidth = 16;
    const sidewalkWidth = 4;

    for (let x = -180; x <= 180; x += gridSpacing) {
      // North-South Road
      const roadGeo = new THREE.PlaneGeometry(roadWidth, 480);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.1, 0);
      road.receiveShadow = true;
      this.scene.add(road);

      // Yellow Center Line
      const lineGeo = new THREE.PlaneGeometry(0.3, 480);
      const line = new THREE.Mesh(lineGeo, markingMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.12, 0);
      this.scene.add(line);

      // Sidewalks
      [-1, 1].forEach(side => {
        const swGeo = new THREE.BoxGeometry(sidewalkWidth, 0.25, 480);
        const sw = new THREE.Mesh(swGeo, sidewalkMat);
        sw.position.set(x + side * (roadWidth / 2 + sidewalkWidth / 2), 0.125, 0);
        sw.receiveShadow = true;
        this.scene.add(sw);
      });

      this.roadSegments.push({ x: x, z1: -240, z2: 240, type: 'vertical' });
    }

    for (let z = -180; z <= 180; z += gridSpacing) {
      // East-West Road
      const roadGeo = new THREE.PlaneGeometry(480, roadWidth);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.11, z);
      road.receiveShadow = true;
      this.scene.add(road);

      // Yellow Center Line
      const lineGeo = new THREE.PlaneGeometry(480, 0.3);
      const line = new THREE.Mesh(lineGeo, markingMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.13, z);
      this.scene.add(line);

      this.roadSegments.push({ z: z, x1: -240, x2: 240, type: 'horizontal' });
    }
  }

  // ================= DOWNTOWN SKYSCRAPERS & MAZE BANK =================
  createDowntownDistrict() {
    // 1. Maze Bank Tower (Centerpiece at x: 45, z: -45)
    const towerRadius = 22;
    const towerHeight = 180;
    const towerGeo = new THREE.CylinderGeometry(towerRadius * 0.85, towerRadius, towerHeight, 24);
    const towerMat = new THREE.MeshPhongMaterial({
      color: 0x1c2833,
      emissive: 0x0b1319,
      specular: 0x5dade2,
      shininess: 60
    });
    const mazeBank = new THREE.Mesh(towerGeo, towerMat);
    mazeBank.position.set(45, towerHeight / 2, -45);
    mazeBank.castShadow = true;
    mazeBank.receiveShadow = true;
    this.scene.add(mazeBank);

    // Maze Bank Rooftop Helipad
    const helipadGeo = new THREE.CylinderGeometry(18, 18, 2, 24);
    const helipadMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const helipad = new THREE.Mesh(helipadGeo, helipadMat);
    helipad.position.set(45, towerHeight + 1, -45);
    this.scene.add(helipad);

    // Helipad Yellow 'H'
    const hLetterGeo = new THREE.PlaneGeometry(8, 8);
    const hLetterMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const hMesh = new THREE.Mesh(hLetterGeo, hLetterMat);
    hMesh.rotation.x = -Math.PI / 2;
    hMesh.position.set(45, towerHeight + 2.1, -45);
    this.scene.add(hMesh);

    // Maze Bank Sign
    const signGeo = new THREE.BoxGeometry(26, 4, 1);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(45, towerHeight - 8, -45 + towerRadius * 0.85);
    this.scene.add(sign);

    this.addCollider(45, -45, towerRadius * 2, towerRadius * 2, towerHeight);

    // 2. Surrounding Modern Skyscrapers
    const buildingPresets = [
      { x: -45, z: -45, w: 32, d: 32, h: 120, color: 0x212f3d }, // FIB Headquarters
      { x: -45, z: 45,  w: 36, d: 28, h: 100, color: 0x283747 }, // Union Depository
      { x: 45,  z: 45,  w: 30, d: 34, h: 140, color: 0x1b2631 }, // Arcadius Center
      { x: 135, z: -45, w: 28, d: 28, h: 85,  color: 0x34495e },
      { x: 135, z: 45,  w: 32, d: 30, h: 110, color: 0x2c3e50 },
      { x: -135, z: -45, w: 30, d: 30, h: 95, color: 0x17202a }
    ];

    buildingPresets.forEach(b => {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMat = new THREE.MeshPhongMaterial({
        color: b.color,
        specular: 0x85929e,
        shininess: 40
      });
      const mesh = new THREE.Mesh(bGeo, bMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Glass Windows Pattern
      this.createBuildingWindows(mesh, b.w, b.h, b.d);
      this.addCollider(b.x, b.z, b.w, b.d, b.h);
    });
  }

  createBuildingWindows(parentMesh, w, h, d) {
    // Glowing Window Tiles
    const winGeo = new THREE.PlaneGeometry(w * 0.9, h * 0.85);
    const winMat = new THREE.MeshBasicMaterial({
      color: 0xf9e79f,
      transparent: true,
      opacity: 0.25
    });

    const frontWin = new THREE.Mesh(winGeo, winMat);
    frontWin.position.set(0, 0, d / 2 + 0.1);
    parentMesh.add(frontWin);

    const backWin = new THREE.Mesh(winGeo, winMat);
    backWin.rotation.y = Math.PI;
    backWin.position.set(0, 0, -d / 2 - 0.1);
    parentMesh.add(backWin);
  }

  // ================= VINEWOOD BOULEVARD =================
  createVinewoodBoulevard() {
    // Palm Trees along Vinewood (z = -90)
    for (let x = -160; x <= 160; x += 22) {
      this.createPalmTree(x, -80);
      this.createPalmTree(x, -100);
    }

    // Vinewood Walk of Fame Stars on Sidewalk
    for (let x = -140; x <= 140; x += 12) {
      const starGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xca6f1e });
      const star = new THREE.Mesh(starGeo, starMat);
      star.rotation.x = -Math.PI / 2;
      star.rotation.z = Math.PI / 4;
      star.position.set(x, 0.26, -96);
      this.scene.add(star);
    }

    // Vinewood Chinese Theatres & Marquees
    const theaterGeo = new THREE.BoxGeometry(45, 24, 25);
    const theaterMat = new THREE.MeshLambertMaterial({ color: 0x78281f });
    const theater = new THREE.Mesh(theaterGeo, theaterMat);
    theater.position.set(0, 12, -135);
    theater.castShadow = true;
    theater.receiveShadow = true;
    this.scene.add(theater);

    // Neon Marquee
    const marqueeGeo = new THREE.BoxGeometry(32, 6, 2);
    const marqueeMat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.set(0, 14, -121.5);
    this.scene.add(marquee);

    this.addCollider(0, -135, 45, 25, 24);
  }

  createPalmTree(x, z) {
    const trunkHeight = 12 + Math.random() * 4;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.55, trunkHeight, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    this.scene.add(trunk);

    // Palm Fronds Crown
    const leavesGeo = new THREE.ConeGeometry(4.5, 2, 8);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x1e8449 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, trunkHeight + 0.5, z);
    leaves.castShadow = true;
    this.scene.add(leaves);

    this.addCollider(x, z, 1.2, 1.2, trunkHeight);
  }

  // ================= VESPUCCI BEACH & PIER =================
  createVespucciBeachAndPier() {
    // Del Perro Pier stretching into the ocean (x: -240 to -480, z: 0)
    const pierLength = 220;
    const pierWidth = 24;
    const pierGeo = new THREE.BoxGeometry(pierLength, 3, pierWidth);
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6d3b }); // Weathered wood
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(-360, 1.5, 0);
    pier.receiveShadow = true;
    pier.castShadow = true;
    this.scene.add(pier);

    // Wooden Pier Support Pilings
    for (let px = -260; px >= -460; px -= 30) {
      [-9, 9].forEach(pz => {
        const poleGeo = new THREE.CylinderGeometry(0.6, 0.6, 12, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a3b2c });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, -2, pz);
        this.scene.add(pole);
      });
    }

    // Iconic Ferris Wheel at Pier Head (x: -440, z: 0)
    const wheelRadius = 18;
    const wheelGeo = new THREE.TorusGeometry(wheelRadius, 0.8, 8, 24);
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    this.ferrisWheel = new THREE.Mesh(wheelGeo, wheelMat);
    this.ferrisWheel.position.set(-440, wheelRadius + 4, 0);
    this.ferrisWheel.rotation.y = Math.PI / 2;
    this.scene.add(this.ferrisWheel);

    // Ferris Wheel Hub & Spokes
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const spokeGeo = new THREE.CylinderGeometry(0.2, 0.2, wheelRadius * 2, 6);
      const spokeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.set(-440, wheelRadius + 4, 0);
      spoke.rotation.x = a;
      this.scene.add(spoke);
    }

    this.addCollider(-360, 0, pierLength, pierWidth, 4);
  }

  // ================= INDUSTRIAL DOCKS =================
  createIndustrialDocks() {
    // Port of South Los Santos (x: -90 to 180, z: 270)
    const containerColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad];

    // Shipping Container Stacks
    for (let i = 0; i < 16; i++) {
      const cx = 30 + (i % 4) * 28;
      const cz = 240 + Math.floor(i / 4) * 22;
      const stackHeight = Math.floor(Math.random() * 3) + 1;

      for (let s = 0; s < stackHeight; s++) {
        const col = containerColors[(i + s) % containerColors.length];
        const conGeo = new THREE.BoxGeometry(18, 4.5, 6.5);
        const conMat = new THREE.MeshLambertMaterial({ color: col });
        const container = new THREE.Mesh(conGeo, conMat);
        container.position.set(cx, s * 4.5 + 2.25, cz);
        container.castShadow = true;
        container.receiveShadow = true;
        this.scene.add(container);
      }
      this.addCollider(cx, cz, 18, 6.5, stackHeight * 4.5);
    }

    // Giant Harbor Cargo Crane
    const craneMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    const craneBase = new THREE.Mesh(new THREE.BoxGeometry(12, 45, 12), craneMat);
    craneBase.position.set(160, 22.5, 270);
    this.scene.add(craneBase);

    const craneArm = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 6), craneMat);
    craneArm.position.set(140, 45, 270);
    this.scene.add(craneArm);

    this.addCollider(160, 270, 12, 12, 45);
  }

  // ================= LSIA AIRPORT & STUNT RAMPS =================
  createAirportAndRamps() {
    // Airport Runway (x: 270 to 520, z: 0)
    const runwayGeo = new THREE.PlaneGeometry(280, 50);
    const runwayMat = new THREE.MeshLambertMaterial({ color: 0x15181e });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(380, 0.15, 0);
    runway.receiveShadow = true;
    this.scene.add(runway);

    // Runway Center White Markings
    for (let rx = 270; rx <= 490; rx += 25) {
      const dashGeo = new THREE.PlaneGeometry(12, 2);
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(rx, 0.18, 0);
      this.scene.add(dash);
    }

    // Cargo Jumbo Jet on Tarmac
    const planeMat = new THREE.MeshPhongMaterial({ color: 0xecf0f1, specular: 0xffffff });
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 42, 16), planeMat);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.set(380, 5.5, 40);
    fuselage.castShadow = true;
    this.scene.add(fuselage);

    // Wings
    const wings = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 48), planeMat);
    wings.position.set(380, 5.5, 40);
    this.scene.add(wings);

    // Stunt Jump Ramps across the city
    this.createStuntRamp(220, 0, 0, 18, 5, 8, 'airport_ramp');
    this.createStuntRamp(0, 120, -Math.PI / 2, 14, 4, 7, 'downtown_ramp');
    this.createStuntRamp(-180, -90, 0, 14, 4, 7, 'vinewood_ramp');
  }

  createStuntRamp(x, z, rotY, length, height, width, id) {
    const rampGeo = new THREE.BufferGeometry();
    // Triangular prism wedge
    const hw = width / 2;
    const vertices = new Float32Array([
      // Bottom face
      -length/2, 0, -hw,   length/2, 0, -hw,   length/2, 0, hw,
      -length/2, 0, -hw,   length/2, 0, hw,   -length/2, 0, hw,
      // Ramp slope face
      -length/2, 0, -hw,   length/2, height, -hw,   length/2, height, hw,
      -length/2, 0, -hw,   length/2, height, hw,   -length/2, 0, hw,
      // Back face
      length/2, 0, -hw,   length/2, height, -hw,   length/2, height, hw,
      length/2, 0, -hw,   length/2, height, hw,   length/2, 0, hw
    ]);
    rampGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    rampGeo.computeVertexNormals();

    const rampMat = new THREE.MeshLambertMaterial({ color: 0xf39c12, side: THREE.DoubleSide });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(x, 0.1, z);
    ramp.rotation.y = rotY;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    this.ramps.push({ id, position: new THREE.Vector3(x, 0, z), height, length });
  }

  // ================= INTERACTIVE SHOPS & ENTERABLES =================
  createShopsAndEnterables() {
    // 1. Ammu-Nation Gun Store (x: -90, z: 90)
    const ammuBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(26, 10, 22),
      new THREE.MeshLambertMaterial({ color: 0x7f1d1d })
    );
    ammuBuilding.position.set(-90, 5, 90);
    ammuBuilding.castShadow = true;
    this.scene.add(ammuBuilding);

    // Ammu-Nation Sign
    const ammuSign = new THREE.Mesh(
      new THREE.BoxGeometry(18, 3, 1),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    ammuSign.position.set(-90, 8, 101.5);
    this.scene.add(ammuSign);

    this.shopZones.push({
      type: 'ammunation',
      name: '武装国度 (AMMU-NATION)',
      position: new THREE.Vector3(-90, 1, 104),
      radius: 5.5
    });
    this.addCollider(-90, 90, 26, 22, 10);

    // 2. Los Santos Customs Garage (x: 90, z: 90)
    const lsCustoms = new THREE.Mesh(
      new THREE.BoxGeometry(32, 12, 28),
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    lsCustoms.position.set(90, 6, 90);
    lsCustoms.castShadow = true;
    this.scene.add(lsCustoms);

    // LS Customs Neon Yellow Sign
    const lscSign = new THREE.Mesh(
      new THREE.BoxGeometry(22, 3.5, 1),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    lscSign.position.set(90, 9.5, 104.5);
    this.scene.add(lscSign);

    this.shopZones.push({
      type: 'customs',
      name: '洛圣都改车王 (LOS SANTOS CUSTOMS)',
      position: new THREE.Vector3(90, 1, 106),
      radius: 7.0
    });
    this.addCollider(90, 90, 32, 28, 12);
  }

  // ================= STREET PROPS & FLORA =================
  createStreetPropsAndFlora() {
    // Street Lamps at Intersections
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let x = -180; x <= 180; x += 90) {
      for (let z = -180; z <= 180; z += 90) {
        // Lamp Post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 8, 8), lampMat);
        post.position.set(x + 10, 4, z + 10);
        post.castShadow = true;
        this.scene.add(post);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), bulbMat);
        bulb.position.set(x + 10, 8, z + 10);
        this.scene.add(bulb);

        // Fire Hydrants (Destructible!)
        const hydrant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8),
          new THREE.MeshLambertMaterial({ color: 0xdc2626 })
        );
        hydrant.position.set(x + 10, 0.6, z - 10);
        hydrant.castShadow = true;
        this.scene.add(hydrant);

        this.destructibles.push({
          type: 'hydrant',
          mesh: hydrant,
          position: hydrant.position.clone(),
          active: true
        });
      }
    }
  }

  // ================= VINEWOOD SIGN =================
  createVinewoodSign() {
    // V I N E W O O D letters on north ridge (z: -260, y: 35)
    const letters = ['V', 'I', 'N', 'E', 'W', 'O', 'O', 'D'];
    const letterMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    letters.forEach((l, i) => {
      const lx = -70 + i * 20;
      const lMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 2), letterMat);
      lMesh.position.set(lx, 35, -260);
      this.scene.add(lMesh);
      this.addCollider(lx, -260, 10, 2, 20);
    });
  }

  addCollider(x, z, width, depth, height = 20) {
    this.colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height: height,
      center: new THREE.Vector2(x, z)
    });
  }

  checkCollision(pos, radius = 0.5) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (
        pos.x + radius > c.minX &&
        pos.x - radius < c.maxX &&
        pos.z + radius > c.minZ &&
        pos.z - radius < c.maxZ &&
        pos.y < c.height
      ) {
        return c;
      }
    }
    return null;
  }

  update(deltaTime) {
    // Rotate Ferris Wheel slowly
    if (this.ferrisWheel) {
      this.ferrisWheel.rotation.x += deltaTime * 0.15;
    }

    // Undulate Ocean waves
    if (this.oceanMesh) {
      this.oceanMesh.position.y = -0.4 + Math.sin(Date.now() * 0.002) * 0.25;
    }
  }
}
