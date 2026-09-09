/**
 * Los Santos Arsenal & Gunplay Combat System
 * 8 Weapons with distinct ballistics, RPG rockets, grenades, raycasting, muzzle flash, and hit feedback
 */
export class WeaponManager {
  constructor(scene, soundEngine, engine) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.engine = engine;

    // Active Projectiles (RPG rockets, Grenades)
    this.projectiles = [];

    // Weapon Definitions
    this.weapons = {
      fists: {
        id: 'fists', name: '拳头 / 近战', type: 'melee',
        damage: 30, range: 2.5, fireRate: 0.35, clip: 1, maxClip: 1, ammo: 1, maxAmmo: 1
      },
      pistol: {
        id: 'pistol', name: 'AP 手枪 (PISTOL)', type: 'gun',
        damage: 35, range: 80, fireRate: 0.22, clip: 12, maxClip: 12, ammo: 120, maxAmmo: 240, spread: 0.015
      },
      smg: {
        id: 'smg', name: '微型冲锋枪 (MICRO SMG)', type: 'gun',
        damage: 25, range: 60, fireRate: 0.085, clip: 30, maxClip: 30, ammo: 300, maxAmmo: 600, spread: 0.04
      },
      rifle: {
        id: 'rifle', name: '卡宾突击步枪 (CARBINE)', type: 'gun',
        damage: 48, range: 120, fireRate: 0.12, clip: 30, maxClip: 30, ammo: 300, maxAmmo: 600, spread: 0.02
      },
      shotgun: {
        id: 'shotgun', name: '泵动式霰弹枪 (SHOTGUN)', type: 'shotgun',
        damage: 18, pellets: 8, range: 40, fireRate: 0.7, clip: 8, maxClip: 8, ammo: 64, maxAmmo: 128, spread: 0.075
      },
      rpg: {
        id: 'rpg', name: 'RPG 火箭推进榴弹', type: 'rocket',
        damage: 450, range: 150, fireRate: 1.5, clip: 1, maxClip: 1, ammo: 10, maxAmmo: 20
      },
      grenade: {
        id: 'grenade', name: '黏弹 / 破片手榴弹', type: 'throwable',
        damage: 350, range: 35, fireRate: 0.8, clip: 1, maxClip: 1, ammo: 15, maxAmmo: 25
      },
      sniper: {
        id: 'sniper', name: '重型狙击步枪 (SNIPER)', type: 'gun',
        damage: 180, range: 300, fireRate: 1.1, clip: 6, maxClip: 6, ammo: 36, maxAmmo: 72, spread: 0.002
      }
    };

    this.currentWeaponId = 'rifle';
    this.fireTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // Attached 3D Weapon Meshes in Hand
    this.weaponMeshes = {};
    this.createWeapon3DMeshes();
  }

  createWeapon3DMeshes() {
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const metalMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 80 });

    // 1. Pistol Mesh
    const pistolGroup = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.22), darkMat);
    pistolGroup.add(pBody);
    this.weaponMeshes['pistol'] = pistolGroup;

    // 2. SMG Mesh
    const smgGroup = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.38), darkMat);
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.08), metalMat);
    smgMag.position.set(0, -0.12, 0.05);
    smgGroup.add(smgBody);
    smgGroup.add(smgMag);
    this.weaponMeshes['smg'] = smgGroup;

    // 3. Rifle Mesh
    const rifleGroup = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.65), darkMat);
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), metalMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.03, -0.4);
    rifleGroup.add(rBody);
    rifleGroup.add(rBarrel);
    this.weaponMeshes['rifle'] = rifleGroup;

    // 4. RPG Mesh
    const rpgGroup = new THREE.Group();
    const rpgTube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 12), new THREE.MeshLambertMaterial({ color: 0x274e13 }));
    rpgTube.rotation.x = Math.PI / 2;
    const rocketHead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
    rocketHead.rotation.x = -Math.PI / 2;
    rocketHead.position.set(0, 0, -0.55);
    rpgGroup.add(rpgTube);
    rpgGroup.add(rocketHead);
    this.weaponMeshes['rpg'] = rpgGroup;
  }

  attachToPlayerSocket(playerSocket) {
    if (!playerSocket) return;
    // Remove all previous
    while (playerSocket.children.length > 0) {
      playerSocket.remove(playerSocket.children[0]);
    }
    const activeMesh = this.weaponMeshes[this.currentWeaponId];
    if (activeMesh) {
      playerSocket.add(activeMesh);
    }
  }

  selectWeapon(weaponId, player) {
    if (this.weapons[weaponId]) {
      this.currentWeaponId = weaponId;
      this.soundEngine.playClick();
      if (player && player.weaponSocket) {
        this.attachToPlayerSocket(player.weaponSocket);
      }
    }
  }

  getCurrentWeapon() {
    return this.weapons[this.currentWeaponId];
  }

  update(input, player, cameraController, npcs, vehicles, cityWorld, deltaTime) {
    this.fireTimer -= deltaTime;
    if (this.isReloading) {
      this.reloadTimer -= deltaTime;
      if (this.reloadTimer <= 0) {
        this.completeReload();
      }
    }

    const cur = this.getCurrentWeapon();

    // Reload trigger (R)
    if (input.reload && cur.clip < cur.maxClip && cur.ammo > 0 && !this.isReloading) {
      this.startReload();
    }

    // Quick grenade throw (G)
    if (input.grenade && this.weapons.grenade.ammo > 0) {
      this.throwGrenade(player, cameraController);
    }

    // Attack Trigger (LMB)
    if (input.attack && this.fireTimer <= 0 && !this.isReloading) {
      if (cur.type === 'melee') {
        player.triggerMeleeAttack();
        this.fireTimer = cur.fireRate;
        this.checkMeleeHits(player, npcs, vehicles);
      } else if (cur.clip > 0) {
        this.fireWeapon(player, cameraController, npcs, vehicles, cityWorld);
        cur.clip--;
        this.fireTimer = cur.fireRate;
      } else if (cur.ammo > 0) {
        this.startReload();
      }
    }

    // Update active projectiles
    this.updateProjectiles(npcs, vehicles, cityWorld, deltaTime);
  }

  startReload() {
    this.isReloading = true;
    this.reloadTimer = 1.4;
    this.soundEngine.playClick();
  }

  completeReload() {
    const cur = this.getCurrentWeapon();
    const needed = cur.maxClip - cur.clip;
    const toLoad = Math.min(needed, cur.ammo);
    cur.clip += toLoad;
    cur.ammo -= toLoad;
    this.isReloading = false;
  }

  fireWeapon(player, cameraController, npcs, vehicles, cityWorld) {
    const cur = this.getCurrentWeapon();

    // Sound
    this.soundEngine.playGunshot(cur.id);

    // Screen Shake on fire
    cameraController.addScreenShake(cur.id === 'sniper' ? 0.35 : 0.12);

    if (cur.type === 'rocket') {
      this.launchRocket(player, cameraController);
      return;
    }

    // Raycast Shooting
    const raycaster = new THREE.Raycaster();
    const shootOrigin = cameraController.camera.position.clone();
    const forward = cameraController.getForwardVector();

    // Spread
    const count = (cur.type === 'shotgun') ? cur.pellets : 1;
    for (let p = 0; p < count; p++) {
      const spreadX = (Math.random() - 0.5) * (cur.spread || 0.02);
      const spreadY = (Math.random() - 0.5) * (cur.spread || 0.02);
      const dir = forward.clone().add(new THREE.Vector3(spreadX, spreadY, 0)).normalize();

      raycaster.set(shootOrigin, dir);
      raycaster.far = cur.range;

      // Check Hits against NPCs
      let hitTarget = false;
      npcs.forEach(npc => {
        if (!npc.isDead && raycaster.ray.distanceToPoint(npc.position) < 1.0) {
          npc.takeDamage(cur.damage, player);
          this.soundEngine.playHitmarker();
          this.engine.spawnSparks(npc.position, 6);
          hitTarget = true;
        }
      });

      // Check Hits against Vehicles
      vehicles.forEach(veh => {
        if (!veh.isDestroyed && raycaster.ray.distanceToPoint(veh.position) < 2.2) {
          veh.takeDamage(cur.damage * 1.5);
          this.soundEngine.playHitmarker();
          this.engine.spawnSparks(veh.position, 8);
          hitTarget = true;
        }
      });

      // City building impact
      if (!hitTarget) {
        const hitPos = shootOrigin.clone().add(dir.multiplyScalar(cur.range * 0.8));
        this.engine.spawnSparks(hitPos, 4);
      }
    }
  }

  launchRocket(player, cameraController) {
    const forward = cameraController.getForwardVector();
    const spawnPos = player.position.clone().add(new THREE.Vector3(0, 1.4, 0)).add(forward.clone().multiplyScalar(1.2));

    const rocketGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    rocketGeo.rotateX(Math.PI / 2);
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xeb984e });
    const mesh = new THREE.Mesh(rocketGeo, rocketMat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    this.projectiles.push({
      type: 'rpg',
      mesh: mesh,
      position: spawnPos,
      velocity: forward.clone().multiplyScalar(55),
      life: 4.0,
      damage: 450,
      radius: 12.0
    });
  }

  throwGrenade(player, cameraController) {
    this.weapons.grenade.ammo--;
    const forward = cameraController.getForwardVector();
    const spawnPos = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));

    const geo = new THREE.SphereGeometry(0.16, 8, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0x145a32 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const vel = forward.clone().multiplyScalar(22).add(new THREE.Vector3(0, 7, 0));

    this.projectiles.push({
      type: 'grenade',
      mesh: mesh,
      position: spawnPos,
      velocity: vel,
      life: 2.2,
      damage: 350,
      radius: 10.0
    });
  }

  updateProjectiles(npcs, vehicles, cityWorld, deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= deltaTime;

      if (p.type === 'grenade') {
        p.velocity.y -= 18 * deltaTime; // Gravity
      }

      p.position.addScaledVector(p.velocity, deltaTime);
      p.mesh.position.copy(p.position);

      // Collision check or timer expiry
      const hitWorld = cityWorld.checkCollision(p.position, 0.5);
      const hitGround = p.position.y <= 0.2;

      if (hitWorld || hitGround || p.life <= 0) {
        // Detonate Area Blast!
        this.detonateExplosion(p.position, p.damage, p.radius, npcs, vehicles);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  detonateExplosion(position, damage, radius, npcs, vehicles) {
    this.engine.spawnExplosionFX(position);
    this.soundEngine.playExplosion();

    // Damage all NPCs in blast zone
    npcs.forEach(npc => {
      const dist = npc.position.distanceTo(position);
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        npc.takeDamage(damage * falloff);
      }
    });

    // Damage all Vehicles in blast zone
    vehicles.forEach(veh => {
      const dist = veh.position.distanceTo(position);
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        veh.takeDamage(damage * 1.5 * falloff);
      }
    });
  }

  checkMeleeHits(player, npcs, vehicles) {
    const forward = player.mesh.getWorldDirection(new THREE.Vector3());
    const hitOrigin = player.position.clone().add(forward.clone().multiplyScalar(1.2));

    npcs.forEach(npc => {
      if (npc.position.distanceTo(hitOrigin) < 1.6) {
        npc.takeDamage(35, player);
        this.engine.spawnSparks(npc.position, 4);
      }
    });
  }
}
