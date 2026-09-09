/**
 * Los Santos Vehicle Physics & Driving System
 * Raycast suspension simulation, drift mechanics, gear shifts, damage models, and 5 distinct vehicle types
 */
export class Vehicle {
  constructor(scene, soundEngine, type = 'supercar', position = new THREE.Vector3()) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.type = type; // 'supercar', 'muscle', 'police', 'bike', 'heli'

    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.speed = 0; // m/s
    this.heading = 0; // radians
    this.steerAngle = 0;
    this.gear = 1;
    this.rpm = 0.2;

    // Tuning & Specs
    this.maxSpeed = (type === 'supercar') ? 65 : (type === 'heli' ? 50 : 45); // m/s
    this.acceleration = (type === 'supercar') ? 28 : 20;
    this.brakingForce = 35;
    this.reverseSpeed = 15;
    this.steerSpeed = 2.4;
    this.maxSteerAngle = 0.6;
    this.driftFactor = (type === 'muscle') ? 0.92 : 0.96;

    // Helicopter specific
    this.altitude = position.y;
    this.rotorAngle = 0;
    this.heliPitch = 0;
    this.heliRoll = 0;

    // Health & Damage
    this.health = 1000;
    this.maxHealth = 1000;
    this.isDestroyed = false;
    this.driver = null;

    // Customization
    this.bodyColor = (type === 'police') ? 0x0a0a0a : (type === 'supercar' ? 0xe74c3c : 0x2980b9);
    this.hasTurbo = false;
    this.hasNeon = (type === 'supercar');

    // Lights
    this.headlightsOn = false;
    this.sirenOn = false;
    this.strobeTimer = 0;

    this.createVehicleMesh();
  }

  createVehicleMesh() {
    this.mesh = new THREE.Group();

    if (this.type === 'heli') {
      this.createHelicopterMesh();
    } else if (this.type === 'bike') {
      this.createMotorcycleMesh();
    } else {
      this.createCarMesh();
    }

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  createCarMesh() {
    const isPolice = (this.type === 'police');
    const isSuper = (this.type === 'supercar');

    const carMat = new THREE.MeshPhongMaterial({
      color: this.bodyColor,
      specular: 0xcccccc,
      shininess: 90
    });
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xbdc3c7 });

    // 1. Main Chassis Body
    const bodyGeo = isSuper
      ? new THREE.BoxGeometry(2.1, 0.65, 4.6)
      : new THREE.BoxGeometry(2.0, 0.8, 4.8);
    this.chassis = new THREE.Mesh(bodyGeo, carMat);
    this.chassis.position.y = 0.65;
    this.chassis.castShadow = true;
    this.chassis.receiveShadow = true;
    this.mesh.add(this.chassis);

    // 2. Cabin & Roof
    const cabinGeo = isSuper
      ? new THREE.BoxGeometry(1.7, 0.55, 2.2)
      : new THREE.BoxGeometry(1.8, 0.65, 2.5);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, isSuper ? 0.55 : 0.65, -0.2);
    cabin.castShadow = true;
    this.chassis.add(cabin);

    // 3. Supercar Rear Wing Spoiler
    if (isSuper) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.08, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      wing.position.set(0, 0.75, 2.0);
      this.chassis.add(wing);
    }

    // 4. Police Lightbar
    if (isPolice) {
      const barGeo = new THREE.BoxGeometry(1.4, 0.15, 0.3);
      const barMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
      this.lightbar = new THREE.Mesh(barGeo, barMat);
      this.lightbar.position.set(0, 1.05, -0.2);
      this.chassis.add(this.lightbar);

      // Red & Blue Strobes
      this.redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      this.redStrobe.position.set(-0.4, 0, 0);
      this.lightbar.add(this.redStrobe);

      this.blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0x0066ff }));
      this.blueStrobe.position.set(0.4, 0, 0);
      this.lightbar.add(this.blueStrobe);

      // Police Decals on Doors
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      decal.rotation.y = Math.PI / 2;
      decal.position.set(1.06, 0, 0);
      this.chassis.add(decal);
    }

    // 5. Headlights & Taillights
    const headGeo = new THREE.BoxGeometry(0.35, 0.15, 0.1);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    [-0.75, 0.75].forEach(x => {
      const hl = new THREE.Mesh(headGeo, headMat);
      hl.position.set(x, 0, -2.31);
      this.chassis.add(hl);
    });

    const tailGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    [-0.75, 0.75].forEach(x => {
      const tl = new THREE.Mesh(tailGeo, tailMat);
      tl.position.set(x, 0.1, 2.31);
      this.chassis.add(tl);
    });

    // 6. Wheels (Front Left, Front Right, Rear Left, Rear Right)
    this.wheels = [];
    const wheelPositions = [
      { x: -1.05, y: 0.35, z: -1.4, isFront: true },
      { x: 1.05,  y: 0.35, z: -1.4, isFront: true },
      { x: -1.05, y: 0.35, z: 1.4,  isFront: false },
      { x: 1.05,  y: 0.35, z: 1.4,  isFront: false }
    ];

    wheelPositions.forEach(wp => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wp.x, wp.y, wp.z);

      const wMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), wheelMat);
      wMesh.rotation.z = Math.PI / 2;
      wMesh.castShadow = true;
      wGroup.add(wMesh);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      this.mesh.add(wGroup);
      this.wheels.push({ group: wGroup, mesh: wMesh, isFront: wp.isFront });
    });
  }

  createMotorcycleMesh() {
    const bikeMat = new THREE.MeshPhongMaterial({ color: 0x10b981, shininess: 80 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 2.2), bikeMat);
    frame.position.y = 0.6;
    this.mesh.add(frame);

    this.wheels = [];
    [-0.9, 0.9].forEach(z => {
      const wMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      wMesh.rotation.z = Math.PI / 2;
      wMesh.position.set(0, 0.36, z);
      this.mesh.add(wMesh);
      this.wheels.push({ group: wMesh, mesh: wMesh, isFront: z < 0 });
    });
  }

  createHelicopterMesh() {
    const heliMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 60 });
    // Fuselage
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), heliMat);
    body.scale.set(0.9, 1.0, 1.8);
    body.position.y = 2.0;
    this.mesh.add(body);

    // Tail Boom
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5.0, 8), heliMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 2.2, 3.5);
    this.mesh.add(tail);

    // Main Rotor Blades
    this.mainRotor = new THREE.Mesh(
      new THREE.BoxGeometry(10.0, 0.05, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    this.mainRotor.position.set(0, 3.4, 0);
    this.mesh.add(this.mainRotor);

    // Tail Rotor
    this.tailRotor = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.6, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    this.tailRotor.position.set(0.3, 2.5, 5.8);
    this.mesh.add(this.tailRotor);

    // Landing Skids
    [-0.9, 0.9].forEach(x => {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6), heliMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(x, 0.3, 0);
      this.mesh.add(skid);
    });
  }

  update(input, cityWorld, deltaTime) {
    if (this.isDestroyed) return;

    if (this.type === 'heli') {
      this.updateHelicopterPhysics(input, deltaTime);
      return;
    }

    // Car / Motorcycle Ground Driving Physics
    if (this.driver && input) {
      // Throttle (W) & Reverse/Brake (S)
      if (input.forward) {
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * deltaTime);
      } else if (input.backward) {
        if (this.speed > 1) {
          this.speed = Math.max(0, this.speed - this.brakingForce * deltaTime);
        } else {
          this.speed = Math.max(-this.reverseSpeed, this.speed - this.acceleration * 0.6 * deltaTime);
        }
      } else {
        // Natural coasting deceleration
        this.speed *= 0.985;
      }

      // Handbrake Drift (Space)
      if (input.handbrake) {
        this.speed *= 0.96;
        this.soundEngine.playTireSkid();
      }

      // Steering (A / D)
      const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, steerTarget * this.maxSteerAngle, 0.15);

      if (Math.abs(this.speed) > 0.5) {
        const turnMult = (this.speed >= 0 ? 1 : -1) * (input.handbrake ? 1.6 : 1.0);
        this.heading += this.steerAngle * this.steerSpeed * (this.speed / this.maxSpeed) * turnMult * deltaTime;
      }

      // Horn (E)
      if (input.horn) {
        this.soundEngine.playHorn();
      }

      // Headlights / Siren (H)
      if (input.headlights) {
        this.toggleHeadlights();
      }
    } else {
      // AI or parked coasting
      this.speed *= 0.92;
    }

    // Apply Velocity
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);

    const moveStep = new THREE.Vector3(forwardX * this.speed * deltaTime, 0, forwardZ * this.speed * deltaTime);
    const nextPos = this.position.clone().add(moveStep);

    // Collision Check
    const hit = cityWorld.checkCollision(nextPos, 1.2);
    if (!hit) {
      this.position.copy(nextPos);
    } else {
      // Crash impact
      this.speed *= -0.35;
      this.takeDamage(Math.abs(this.speed) * 15);
      this.soundEngine.playNoiseBurst(0.2, 0.5, 800);
    }

    // Stunt Jump Check
    cityWorld.ramps.forEach(ramp => {
      if (this.position.distanceTo(ramp.position) < 8 && this.speed > 20) {
        this.velocity.y = ramp.height * 2.2;
      }
    });

    if (this.position.y > 0) {
      this.velocity.y -= 20 * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
      }
    }

    // Update Mesh Transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    // Update Wheels Rotation and Steering Angle
    this.wheels.forEach(w => {
      w.mesh.rotation.x += (this.speed * deltaTime) / 0.38;
      if (w.isFront) {
        w.group.rotation.y = this.steerAngle;
      }
    });

    // Update Police Siren Lightbar
    if (this.type === 'police' && this.sirenOn) {
      this.strobeTimer += deltaTime * 12;
      const flash = Math.sin(this.strobeTimer) > 0;
      this.redStrobe.material.color.setHex(flash ? 0xff0000 : 0x220000);
      this.blueStrobe.material.color.setHex(!flash ? 0x0066ff : 0x001133);
    }

    // Gear & RPM calculations for Audio
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    this.gear = Math.min(6, Math.floor(speedRatio * 6) + 1);
    this.rpm = (speedRatio * 6) % 1.0;
    if (this.driver) {
      this.soundEngine.updateEngine(this.rpm, speedRatio);
    }
  }

  updateHelicopterPhysics(input, deltaTime) {
    // Spin Rotors
    this.mainRotor.rotation.y += deltaTime * 28;
    this.tailRotor.rotation.x += deltaTime * 35;

    if (this.driver && input) {
      // Ascend (Shift) / Descend (Ctrl/C)
      if (input.sprint) this.altitude += 12 * deltaTime;
      if (input.crouch) this.altitude = Math.max(0, this.altitude - 10 * deltaTime);

      // Pitch forward for flight speed
      if (input.forward) {
        this.speed = Math.min(this.maxSpeed, this.speed + 15 * deltaTime);
        this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, 0.25, 0.1);
      } else if (input.backward) {
        this.speed = Math.max(-10, this.speed - 12 * deltaTime);
        this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, -0.2, 0.1);
      } else {
        this.speed *= 0.98;
        this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, 0, 0.05);
      }

      // Yaw Turn
      if (input.left) this.heading += 1.8 * deltaTime;
      if (input.right) this.heading -= 1.8 * deltaTime;
    }

    this.position.y = this.altitude;
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);
    this.position.x += forwardX * this.speed * deltaTime;
    this.position.z += forwardZ * this.speed * deltaTime;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(this.heliPitch, this.heading, this.heliRoll);
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    if (this.type === 'police') {
      this.sirenOn = !this.sirenOn;
      if (this.sirenOn) this.soundEngine.startSiren();
      else this.soundEngine.stopSiren();
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0 && !this.isDestroyed) {
      this.explode();
    }
  }

  explode() {
    this.isDestroyed = true;
    this.soundEngine.playExplosion();
    // Turn chassis charred black
    this.mesh.traverse(child => {
      if (child.material) child.material.color.setHex(0x111111);
    });
    if (this.driver && this.driver.takeDamage) {
      this.driver.takeDamage(200);
    }
  }
}
