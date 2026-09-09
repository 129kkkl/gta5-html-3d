/**
 * Los Santos Third-Person Camera Controller
 * Smooth spring-damped orbit follow, over-the-shoulder ADS, vehicle chase cam, and collision raycasting
 */
export class TPSCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Target reference (Player or Vehicle)
    this.target = null;
    this.mode = 'on_foot'; // 'on_foot', 'in_vehicle', 'helicopter', 'wasted', 'cinematic'

    // Orbit angles
    this.yaw = 0;
    this.pitch = 0.2;
    this.minPitch = -Math.PI / 3;
    this.maxPitch = Math.PI / 3;

    // Follow parameters
    this.distance = 3.6;
    this.targetDistance = 3.6;
    this.height = 1.7;

    // Offsets
    this.shoulderOffset = new THREE.Vector3(0.5, 0, 0); // Over-the-shoulder right
    this.currentOffset = new THREE.Vector3();

    // Damping
    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();
    this.damping = 0.12;

    // FOV
    this.baseFOV = 65;
    this.currentFOV = 65;
    this.targetFOV = 65;

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
  }

  setTarget(target, mode = 'on_foot') {
    this.target = target;
    this.mode = mode;

    if (mode === 'in_vehicle') {
      this.targetDistance = 6.5;
      this.height = 2.4;
    } else if (mode === 'helicopter') {
      this.targetDistance = 14.0;
      this.height = 5.0;
    } else {
      this.targetDistance = 3.6;
      this.height = 1.7;
    }
  }

  addScreenShake(intensity) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 1.5);
  }

  update(input, deltaTime, isAiming = false, vehicleSpeed = 0) {
    if (!this.target) return;

    // Update yaw/pitch from input
    if (input && input.isPointerLocked) {
      this.yaw -= input.mouseDeltaX * input.mouseSensitivity;
      this.pitch -= input.mouseDeltaY * input.mouseSensitivity;
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    }

    // Determine target position & offsets
    const targetPos = this.target.position ? this.target.position.clone() : new THREE.Vector3();

    if (this.mode === 'on_foot') {
      // Over-the-shoulder aiming or normal chase
      if (isAiming) {
        this.targetDistance = 1.8;
        this.targetFOV = 48;
        // Right shoulder offset in camera space
        const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        this.currentOffset.lerp(rightVec.multiplyScalar(0.65), 0.15);
      } else {
        this.targetDistance = 3.5;
        this.targetFOV = 65;
        this.currentOffset.lerp(new THREE.Vector3(0, 0, 0), 0.1);
      }
    } else if (this.mode === 'in_vehicle') {
      // Speed-dependent FOV and distance
      const speedKmh = vehicleSpeed * 3.6;
      this.targetFOV = Math.min(90, 65 + (speedKmh / 180) * 20);
      this.targetDistance = 6.2 + (speedKmh / 200) * 1.5;
      this.currentOffset.set(0, 0, 0);
    } else if (this.mode === 'wasted') {
      this.targetDistance = 4.5;
      this.height = 0.8;
      this.yaw += deltaTime * 0.3; // Dramatic slow orbit
      this.pitch = 0.15;
    }

    // Smooth FOV
    this.currentFOV += (this.targetFOV - this.currentFOV) * 0.1;
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();

    // Smooth distance
    this.distance += (this.targetDistance - this.distance) * 0.12;

    // Calculate ideal camera position based on yaw/pitch orbit
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const orbitOffset = new THREE.Vector3(
      sinYaw * cosPitch * this.distance,
      sinPitch * this.distance + this.height,
      cosYaw * cosPitch * this.distance
    );

    const desiredCamPos = targetPos.clone().add(orbitOffset).add(this.currentOffset);
    const lookTarget = targetPos.clone().add(new THREE.Vector3(0, this.height * 0.85, 0)).add(this.currentOffset.clone().multiplyScalar(0.5));

    // Smooth camera position
    this.currentPosition.lerp(desiredCamPos, this.damping);
    this.currentTarget.lerp(lookTarget, this.damping);

    // Apply Screen Shake
    if (this.shakeIntensity > 0.001) {
      const rx = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const ry = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const rz = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      this.camera.position.copy(this.currentPosition).add(new THREE.Vector3(rx, ry, rz));
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.camera.position.copy(this.currentPosition);
    }

    this.camera.lookAt(this.currentTarget);
  }

  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return forward.normalize();
  }

  getRightVector() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return right.normalize();
  }
}
