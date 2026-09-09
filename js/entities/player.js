/**
 * Los Santos 3D Player Character Entity
 * Articulated procedural humanoid, skeletal locomotion, combat ADS IK, melee combos, stats & special abilities
 */
export class Player {
  constructor(scene, soundEngine) {
    this.scene = scene;
    this.soundEngine = soundEngine;

    // Transform
    this.position = new THREE.Vector3(0, 0.9, 0);
    this.velocity = new THREE.Vector3();
    this.rotationY = 0;
    this.moveSpeed = 4.8;
    this.sprintMultiplier = 1.9;
    this.jumpForce = 7.5;
    this.gravity = 20.0;
    this.isGrounded = true;

    // States
    this.state = 'idle'; // 'idle', 'walk', 'run', 'sprint', 'jump', 'crouch', 'aiming', 'melee', 'in_vehicle', 'dead'
    this.isCrouching = false;
    this.isAiming = false;
    this.inVehicle = null;

    // Melee combo system
    this.isMeleeAttacking = false;
    this.meleeComboStep = 0;
    this.meleeTimer = 0;

    // Special Ability (Michael / Franklin Bullet Time)
    this.specialAbilityActive = false;
    this.specialAbilityMeter = 100;

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.maxArmor = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.money = 1500000;
    this.wantedLevel = 0;
    this.isDead = false;

    // Animation time accumulator
    this.animTime = 0;

    this.createPlayerMesh();
  }

  createPlayerMesh() {
    this.mesh = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a373 });
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a }); // Navy jacket
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 }); // Dark jeans
    const shoesMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White sneakers
    const glassesMat = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Aviator sunglasses

    // 1. Pelvis / Hips (Root)
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.9;
    this.mesh.add(this.pelvis);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), pantsMat);
    this.pelvis.add(hips);

    // 2. Torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.2;
    this.pelvis.add(this.torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.32), shirtMat);
    chest.position.y = 0.275;
    chest.castShadow = true;
    this.torso.add(chest);

    // 3. Head & Sunglasses
    this.head = new THREE.Group();
    this.head.position.y = 0.65;
    this.torso.add(this.head);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), new THREE.MeshLambertMaterial({ color: 0x271c19 }));
    hair.position.y = 0.15;
    this.head.add(hair);

    // Aviator Sunglasses
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.06), glassesMat);
    glasses.position.set(0, 0.03, -0.16);
    this.head.add(glasses);

    // 4. Arms
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.35, 0.5, 0);
    this.torso.add(this.leftArm);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), shirtMat);
    leftArmMesh.position.y = -0.275;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Right Arm (Weapon holding arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.35, 0.5, 0);
    this.torso.add(this.rightArm);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), shirtMat);
    rightArmMesh.position.y = -0.275;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Weapon Attachment Socket (Right Hand)
    this.weaponSocket = new THREE.Group();
    this.weaponSocket.position.set(0, -0.55, -0.1);
    this.rightArm.add(this.weaponSocket);

    // 5. Legs
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, -0.12, 0);
    this.pelvis.add(this.leftLeg);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28), shoesMat);
    leftFoot.position.set(0, -0.72, -0.05);
    this.leftLeg.add(leftFoot);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, -0.12, 0);
    this.pelvis.add(this.rightLeg);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat);
    rightLegMesh.position.y = -0.35;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28), shoesMat);
    rightFoot.position.set(0, -0.72, -0.05);
    this.rightLeg.add(rightFoot);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(input, cameraController, cityWorld, deltaTime) {
    if (this.isDead || this.inVehicle) return;

    // Special Ability Toggle & Drain
    if (input.specialAbility && this.specialAbilityMeter > 10) {
      this.specialAbilityActive = !this.specialAbilityActive;
    }
    if (this.specialAbilityActive) {
      this.specialAbilityMeter -= deltaTime * 20;
      if (this.specialAbilityMeter <= 0) {
        this.specialAbilityMeter = 0;
        this.specialAbilityActive = false;
      }
    } else {
      this.specialAbilityMeter = Math.min(this.maxStamina, this.specialAbilityMeter + deltaTime * 8);
    }

    // Aiming state
    this.isAiming = input.aim;

    // Movement direction relative to camera
    const forward = cameraController.getForwardVector();
    const right = cameraController.getRightVector();

    const moveDir = new THREE.Vector3();
    if (input.forward) moveDir.add(forward);
    if (input.backward) moveDir.sub(forward);
    if (input.right) moveDir.add(right);
    if (input.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) moveDir.normalize();

    // Sprint & Stamina
    let speed = this.moveSpeed;
    if (input.sprint && isMoving && !this.isAiming && this.stamina > 5) {
      speed *= this.sprintMultiplier;
      this.stamina = Math.max(0, this.stamina - deltaTime * 12);
      this.state = 'sprint';
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + deltaTime * 15);
      this.state = isMoving ? 'run' : (this.isAiming ? 'aiming' : 'idle');
    }

    // Crouch
    if (input.crouch) {
      this.isCrouching = !this.isCrouching;
    }
    if (this.isCrouching) {
      speed *= 0.5;
      this.pelvis.position.y = 0.6;
    } else {
      this.pelvis.position.y = 0.9;
    }

    // Jump
    if (input.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.stamina = Math.max(0, this.stamina - 10);
    }

    // Apply gravity
    this.velocity.y -= this.gravity * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Ground check (Y = 0)
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Apply horizontal motion with collision
    if (isMoving) {
      const moveStep = moveDir.clone().multiplyScalar(speed * deltaTime);
      const nextPos = this.position.clone().add(moveStep);

      // Check collision with city buildings
      const hit = cityWorld.checkCollision(nextPos, 0.4);
      if (!hit) {
        this.position.copy(nextPos);
      } else {
        // Slide along wall
        const slidePos = this.position.clone();
        slidePos.x += moveStep.x;
        if (!cityWorld.checkCollision(slidePos, 0.4)) {
          this.position.copy(slidePos);
        } else {
          slidePos.x = this.position.x;
          slidePos.z += moveStep.z;
          if (!cityWorld.checkCollision(slidePos, 0.4)) {
            this.position.copy(slidePos);
          }
        }
      }

      // Smooth rotate towards movement direction (or face camera when aiming)
      if (!this.isAiming) {
        const targetRot = Math.atan2(moveDir.x, moveDir.z) + Math.PI;
        this.rotationY = THREE.MathUtils.lerp(this.rotationY, targetRot, 0.2);
      }
    }

    // If aiming, face camera heading always
    if (this.isAiming) {
      this.rotationY = cameraController.yaw;
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;

    // Update Procedural Locomotion Animations
    this.updateAnimations(deltaTime, isMoving, speed);

    // Melee attack update
    this.updateMelee(input, deltaTime);

    // Natural passive health regeneration (up to 50%)
    if (this.health < 50 && !this.isDead) {
      this.health = Math.min(50, this.health + deltaTime * 2);
    }
  }

  updateAnimations(deltaTime, isMoving, speed) {
    if (this.isMeleeAttacking) return;

    if (isMoving) {
      this.animTime += deltaTime * (speed * 1.8);
      const legAngle = Math.sin(this.animTime) * 0.75;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      if (!this.isAiming) {
        this.leftArm.rotation.x = -legAngle * 0.8;
        this.rightArm.rotation.x = legAngle * 0.8;
        this.torso.rotation.y = Math.sin(this.animTime) * 0.1;
      }
    } else {
      // Idle breathing
      this.animTime += deltaTime * 2;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.pelvis.position.y = (this.isCrouching ? 0.6 : 0.9) + Math.sin(this.animTime) * 0.02;

      if (!this.isAiming) {
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
        this.torso.rotation.y = 0;
      }
    }

    // Aiming IK
    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2 + 0.1;
      this.rightArm.rotation.y = -0.2;
      this.leftArm.rotation.x = -Math.PI / 2 + 0.2;
      this.leftArm.rotation.y = 0.4;
    }
  }

  triggerMeleeAttack() {
    if (this.isMeleeAttacking) return;
    this.isMeleeAttacking = true;
    this.meleeComboStep = (this.meleeComboStep + 1) % 3;
    this.meleeTimer = 0.35;

    // Melee swing animation
    if (this.meleeComboStep === 0) {
      // Left Jab
      this.leftArm.rotation.x = -Math.PI / 2;
      this.soundEngine.playPunch();
    } else if (this.meleeComboStep === 1) {
      // Right Hook
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.y = -0.6;
      this.soundEngine.playPunch();
    } else {
      // Heavy Kick
      this.rightLeg.rotation.x = -Math.PI / 2.5;
      this.soundEngine.playPunch();
    }
  }

  updateMelee(input, deltaTime) {
    if (!this.isMeleeAttacking) return;
    this.meleeTimer -= deltaTime;
    if (this.meleeTimer <= 0) {
      this.isMeleeAttacking = false;
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
      this.rightLeg.rotation.set(0, 0, 0);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;
    if (this.armor > 0) {
      const remaining = amount - this.armor;
      this.armor = Math.max(0, this.armor - amount);
      if (remaining > 0) this.health -= remaining;
    } else {
      this.health -= amount;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  addCash(amount) {
    this.money += amount;
    this.soundEngine.playCash();
  }

  die() {
    this.isDead = true;
    this.state = 'dead';
    this.soundEngine.playWasted();
    // Ragdoll fallback: rotate torso on ground
    this.mesh.rotation.x = Math.PI / 2;
    this.position.y = 0.2;
  }

  respawn(position = new THREE.Vector3(0, 0.9, 0)) {
    this.isDead = false;
    this.health = 100;
    this.armor = 50;
    this.stamina = 100;
    this.position.copy(position);
    this.mesh.position.copy(position);
    this.mesh.rotation.set(0, 0, 0);
    this.state = 'idle';
  }
}
