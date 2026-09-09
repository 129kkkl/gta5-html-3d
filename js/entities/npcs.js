/**
 * Los Santos Living AI: Pedestrians & Autonomous Traffic System
 * State machines, wandering sidewalks, panic fleeing, gang retaliation, loot drops, and carjackable traffic
 */
export class NPCManager {
  constructor(scene, soundEngine, engine) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.engine = engine;

    this.pedestrians = [];
    this.trafficCars = [];
    this.lootPickups = [];

    this.maxPeds = 24;
    this.maxCars = 12;

    this.initPedestrians();
  }

  initPedestrians() {
    for (let i = 0; i < this.maxPeds; i++) {
      const rx = (Math.random() - 0.5) * 260;
      const rz = (Math.random() - 0.5) * 260;
      this.spawnPedestrian(new THREE.Vector3(rx, 0.8, rz));
    }
  }

  spawnPedestrian(pos, isHostile = false) {
    const pGroup = new THREE.Group();

    const colors = [0x2c3e50, 0x8e44ad, 0x16a085, 0xd35400, 0xc0392b, 0x7f8c8d];
    const shirtCol = colors[Math.floor(Math.random() * colors.length)];
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirtCol });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.28), shirtMat);
    torso.position.y = 0.55;
    torso.castShadow = true;
    pGroup.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skinMat);
    head.position.y = 0.95;
    head.castShadow = true;
    pGroup.add(head);

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), pantsMat);
    leftLeg.position.set(-0.14, 0.3, 0);
    pGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), pantsMat);
    rightLeg.position.set(0.14, 0.3, 0);
    pGroup.add(rightLeg);

    pGroup.position.copy(pos);
    this.scene.add(pGroup);

    const ped = {
      mesh: pGroup,
      leftLeg: leftLeg,
      rightLeg: rightLeg,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      health: 60,
      isDead: false,
      isHostile: isHostile,
      state: 'walk', // 'idle', 'walk', 'flee', 'attack', 'dead'
      targetPoint: new THREE.Vector3(pos.x + (Math.random() - 0.5) * 50, 0, pos.z + (Math.random() - 0.5) * 50),
      walkSpeed: 1.6 + Math.random() * 0.8,
      animTimer: Math.random() * 5,
      fleeTimer: 0
    };

    this.pedestrians.push(ped);
    return ped;
  }

  update(player, weapons, cityWorld, deltaTime) {
    // 1. Update Pedestrians
    this.pedestrians.forEach(ped => {
      if (ped.isDead) return;

      const distToPlayer = ped.position.distanceTo(player.position);

      // React to player shooting or gun aiming nearby
      if (player.isAiming && distToPlayer < 18 && ped.state !== 'flee' && !ped.isHostile) {
        ped.state = 'flee';
        ped.fleeTimer = 6.0;
      }

      if (ped.state === 'flee') {
        ped.fleeTimer -= deltaTime;
        // Run directly away from player
        const fleeDir = ped.position.clone().sub(player.position).normalize();
        ped.position.addScaledVector(fleeDir, ped.walkSpeed * 2.8 * deltaTime);
        ped.mesh.rotation.y = Math.atan2(fleeDir.x, fleeDir.z);

        if (ped.fleeTimer <= 0) ped.state = 'walk';
      } else if (ped.state === 'attack' && ped.isHostile) {
        // Gang member shooting back
        const dirToPlayer = player.position.clone().sub(ped.position).normalize();
        ped.mesh.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);

        if (Math.random() < 0.02 && distToPlayer < 25) {
          player.takeDamage(12);
          this.soundEngine.playGunshot('pistol');
          this.engine.spawnSparks(player.position, 3);
        }
      } else {
        // Wandering logic
        const dir = ped.targetPoint.clone().sub(ped.position);
        if (dir.lengthSq() < 4) {
          ped.targetPoint.set(ped.position.x + (Math.random() - 0.5) * 60, 0, ped.position.z + (Math.random() - 0.5) * 60);
        } else {
          dir.normalize();
          ped.position.addScaledVector(dir, ped.walkSpeed * deltaTime);
          ped.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      ped.mesh.position.copy(ped.position);

      // Leg swing animation
      ped.animTimer += deltaTime * 5;
      ped.leftLeg.rotation.x = Math.sin(ped.animTimer) * 0.5;
      ped.rightLeg.rotation.x = -Math.sin(ped.animTimer) * 0.5;
    });

    // 2. Update Loot Pickups
    this.updateLoot(player, deltaTime);
  }

  handlePedDamage(ped, amount, attacker) {
    if (ped.isDead) return;
    ped.health -= amount;

    if (ped.health <= 0) {
      ped.isDead = true;
      ped.state = 'dead';
      ped.mesh.rotation.x = Math.PI / 2;
      ped.position.y = 0.2;
      ped.mesh.position.copy(ped.position);

      // Drop Cash Loot Bundle
      this.spawnCashLoot(ped.position);

      // If killed by player, raise wanted heat
      if (attacker && attacker.wantedLevel !== undefined) {
        attacker.wantedLevel = Math.min(5, attacker.wantedLevel + 1);
      }
    } else {
      if (ped.isHostile) {
        ped.state = 'attack';
      } else {
        ped.state = 'flee';
        ped.fleeTimer = 8.0;
      }
    }
  }

  spawnCashLoot(pos) {
    const cashGroup = new THREE.Group();
    const cashMat = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
    const cashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.22), cashMat);
    cashGroup.add(cashMesh);
    cashGroup.position.set(pos.x, 0.4, pos.z);
    this.scene.add(cashGroup);

    this.lootPickups.push({
      mesh: cashGroup,
      position: cashGroup.position,
      amount: Math.floor(Math.random() * 600) + 250
    });
  }

  updateLoot(player, deltaTime) {
    for (let i = this.lootPickups.length - 1; i >= 0; i--) {
      const loot = this.lootPickups[i];
      loot.mesh.rotation.y += deltaTime * 2.5;

      if (loot.position.distanceTo(player.position) < 1.8) {
        player.addCash(loot.amount);
        this.scene.remove(loot.mesh);
        this.lootPickups.splice(i, 1);
      }
    }
  }
}
