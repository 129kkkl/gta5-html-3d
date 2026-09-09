/**
 * Los Santos 1-5 Star Police Wanted & Law Enforcement Pursuit AI
 * Cruiser chases, PIT maneuvers, SWAT tactical vans, Police Helicopter with spotlight, and evasion timers
 */
import { Vehicle } from '../entities/vehicle.js';

export class PoliceSystem {
  constructor(scene, soundEngine, engine) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.engine = engine;

    this.wantedLevel = 0; // 0 - 5
    this.policeVehicles = [];
    this.policeHelicopter = null;

    this.evadeTimer = 0;
    this.isEvading = false;
    this.searchRadius = 60;
  }

  setWantedLevel(level) {
    this.wantedLevel = Math.max(0, Math.min(5, level));
    if (this.wantedLevel > 0) {
      this.soundEngine.startSiren();
      this.spawnPursuitUnits();
    } else {
      this.soundEngine.stopSiren();
      this.clearPoliceUnits();
    }
  }

  spawnPursuitUnits() {
    // Clear dead units first
    this.policeVehicles = this.policeVehicles.filter(v => !v.isDestroyed);

    const neededCruisers = Math.min(4, this.wantedLevel * 2);
    while (this.policeVehicles.length < neededCruisers) {
      const rx = (Math.random() - 0.5) * 200 + 50;
      const rz = (Math.random() - 0.5) * 200 + 50;
      const cruiser = new Vehicle(this.scene, this.soundEngine, 'police', new THREE.Vector3(rx, 0, rz));
      cruiser.sirenOn = true;
      this.policeVehicles.push(cruiser);
    }

    // 4+ Stars: Spawn Police Helicopter
    if (this.wantedLevel >= 4 && !this.policeHelicopter) {
      this.policeHelicopter = new Vehicle(this.scene, this.soundEngine, 'heli', new THREE.Vector3(0, 35, 0));
      // Add spotlight to helicopter
      this.spotlight = new THREE.SpotLight(0xffffff, 4.0, 120, Math.PI / 6, 0.5);
      this.policeHelicopter.mesh.add(this.spotlight);
    }
  }

  clearPoliceUnits() {
    this.policeVehicles.forEach(v => {
      this.scene.remove(v.mesh);
    });
    this.policeVehicles = [];

    if (this.policeHelicopter) {
      this.scene.remove(this.policeHelicopter.mesh);
      this.policeHelicopter = null;
    }
  }

  update(player, cityWorld, deltaTime) {
    if (this.wantedLevel === 0) return;

    const playerPos = player.position;

    // 1. Update Police Cruisers Pursuit AI
    this.policeVehicles.forEach(cruiser => {
      if (cruiser.isDestroyed) return;

      const dist = cruiser.position.distanceTo(playerPos);

      // Steer directly toward player
      const dir = playerPos.clone().sub(cruiser.position).normalize();
      const targetHeading = Math.atan2(-dir.x, -dir.z);

      cruiser.heading = THREE.MathUtils.lerp(cruiser.heading, targetHeading, 0.08);
      cruiser.speed = Math.min(cruiser.maxSpeed * 0.9, cruiser.speed + cruiser.acceleration * deltaTime);

      // Ram or shoot at player
      if (dist < 5.0 && !player.inVehicle) {
        player.takeDamage(15 * deltaTime);
      }

      cruiser.update(null, cityWorld, deltaTime);
    });

    // 2. Update Police Helicopter tracking AI
    if (this.policeHelicopter && !this.policeHelicopter.isDestroyed) {
      const heli = this.policeHelicopter;
      const targetPos = playerPos.clone().add(new THREE.Vector3(0, 25, 0));
      heli.position.lerp(targetPos, 0.03);
      heli.heading += 0.01;
      heli.updateHelicopterPhysics(null, deltaTime);

      if (this.spotlight) {
        this.spotlight.target.position.copy(playerPos);
      }

      // 4-5 stars: Helicopter sniper fires
      if (this.wantedLevel >= 4 && Math.random() < 0.015) {
        player.takeDamage(18);
        this.soundEngine.playGunshot('sniper');
        this.engine.spawnSparks(player.position, 4);
      }
    }

    // 3. Evade / Cooldown Logic
    let nearestCopDist = 9999;
    this.policeVehicles.forEach(c => {
      const d = c.position.distanceTo(playerPos);
      if (d < nearestCopDist) nearestCopDist = d;
    });

    if (nearestCopDist > this.searchRadius) {
      this.isEvading = true;
      this.evadeTimer += deltaTime;
      if (this.evadeTimer >= 15.0) {
        // Escaped!
        this.setWantedLevel(0);
        this.evadeTimer = 0;
        this.isEvading = false;
      }
    } else {
      this.isEvading = false;
      this.evadeTimer = 0;
    }
  }
}
