/**
 * LOS SANTOS: 3D Grand Action (GTA 5 HTML Edition)
 * Master Game Orchestrator & Loop
 */
import { SoundEngine } from './core/audio.js';
import { InputManager } from './core/input.js';
import { TPSCamera } from './core/camera.js';
import { GameEngine } from './core/engine.js';
import { CityWorld } from './systems/city.js';
import { Player } from './entities/player.js';
import { Vehicle } from './entities/vehicle.js';
import { WeaponManager } from './entities/weapons.js';
import { NPCManager } from './entities/npcs.js';
import { PoliceSystem } from './systems/police.js';
import { PhoneSystem } from './systems/phone.js';
import { MissionManager } from './systems/missions.js';
import { HUD } from './ui/hud.js';
import { WeaponWheel } from './ui/weaponWheel.js';

class GTA5Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');

    // 1. Core Systems
    this.soundEngine = new SoundEngine();
    this.input = new InputManager(this.canvas);
    this.engine = new GameEngine(this.canvas);
    this.cameraController = new TPSCamera(this.engine.camera, this.canvas);

    // 2. World & Entities
    this.cityWorld = new CityWorld(this.engine.scene);
    this.player = new Player(this.engine.scene, this.soundEngine);
    this.cameraController.setTarget(this.player, 'on_foot');

    // Vehicles array
    this.vehicles = [];
    this.currentVehicle = null;

    // 3. Combat, AI & Police
    this.weaponManager = new WeaponManager(this.engine.scene, this.soundEngine, this.engine);
    this.weaponManager.game = this;
    this.weaponManager.attachToPlayerSocket(this.player.weaponSocket);

    this.npcManager = new NPCManager(this.engine.scene, this.soundEngine, this.engine);
    this.policeSystem = new PoliceSystem(this.engine.scene, this.soundEngine, this.engine);

    // 4. Missions & Smartphone
    this.phoneSystem = new PhoneSystem(this.soundEngine, this);
    this.missionManager = new MissionManager(this.engine.scene, this.soundEngine, this);

    // 5. UI Systems
    this.hud = new HUD(this);
    this.weaponWheel = new WeaponWheel(this.weaponManager, this.soundEngine, this.input);

    // Time & State
    this.lastTime = performance.now();
    this.isGameRunning = false;

    // Spawn Initial World Vehicles
    this.spawnInitialVehicles();

    // Initialize Loading Screen & UI
    this.initLoadingScreen();
    this.initShopModals();
    this.initRadioUI();
  }

  spawnInitialVehicles() {
    // 1. Pegassi Zentorno Supercar near player
    const superCar = new Vehicle(this.engine.scene, this.soundEngine, 'supercar', new THREE.Vector3(12, 0, 8));
    this.vehicles.push(superCar);

    // 2. Muscle Car on Vinewood Blvd
    const muscleCar = new Vehicle(this.engine.scene, this.soundEngine, 'muscle', new THREE.Vector3(-45, 0, -90));
    this.vehicles.push(muscleCar);

    // 3. Motorcycle near Beach Pier
    const bike = new Vehicle(this.engine.scene, this.soundEngine, 'bike', new THREE.Vector3(-220, 0, 0));
    this.vehicles.push(bike);

    // 4. Buzzard Attack Helicopter on Maze Bank Rooftop Helipad
    const heli = new Vehicle(this.engine.scene, this.soundEngine, 'heli', new THREE.Vector3(45, 182, -45));
    this.vehicles.push(heli);
  }

  spawnVehicleNearPlayer(type) {
    const forward = this.cameraController.getForwardVector();
    const spawnPos = this.player.position.clone().add(forward.multiplyScalar(8));
    if (type === 'heli') spawnPos.y = 1;

    const veh = new Vehicle(this.engine.scene, this.soundEngine, type, spawnPos);
    this.vehicles.push(veh);
    return veh;
  }

  initLoadingScreen() {
    const progressBar = document.getElementById('loading-progress-bar');
    const progressPercent = document.getElementById('loading-percentage');
    const startBtn = document.getElementById('start-game-btn');
    const loadingScreen = document.getElementById('loading-screen');

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressPercent.innerText = '100%';
        startBtn.style.display = 'inline-block';
      } else {
        progressBar.style.width = progress + '%';
        progressPercent.innerText = progress + '%';
      }
    }, 120);

    startBtn.addEventListener('click', () => {
      this.soundEngine.init();
      this.soundEngine.resume();
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 800);
      this.isGameRunning = true;
      this.input.requestPointerLock();
      this.showSubtitle('欢迎来到洛圣都！按 M 键打开手机，按 TAB 切换武器，按 F 键驾驶超跑！', 6.0);
    });
  }

  initShopModals() {
    // Ammu-Nation
    const ammuGrid = document.getElementById('ammunation-grid');
    const ammuModal = document.getElementById('ammunation-modal');
    const closeAmmu = document.getElementById('close-ammunation-btn');

    if (ammuGrid) {
      const items = [
        { name: '卡宾突击步枪弹药 (x120)', price: 800, buy: () => this.weaponManager.weapons.rifle.ammo += 120 },
        { name: '微型冲锋枪弹药 (x150)', price: 500, buy: () => this.weaponManager.weapons.smg.ammo += 150 },
        { name: '重型防弹衣 (100% 护甲)', price: 1500, buy: () => this.player.armor = 100 },
        { name: 'RPG 火箭弹药 (x5)', price: 4500, buy: () => this.weaponManager.weapons.rpg.ammo += 5 },
        { name: '黏弹 / 手榴弹包 (x5)', price: 2000, buy: () => this.weaponManager.weapons.grenade.ammo += 5 }
      ];

      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = '<div><div class="shop-item-name">' + it.name + '</div><div class="shop-item-price">$' + it.price + '</div></div><button class="buy-btn">购买装备</button>';
        card.querySelector('.buy-btn').addEventListener('click', () => {
          if (this.player.money >= it.price) {
            this.player.money -= it.price;
            it.buy();
            this.soundEngine.playCash();
            this.showSubtitle('已购买: ' + it.name);
          }
        });
        ammuGrid.appendChild(card);
      });
    }

    if (closeAmmu) {
      closeAmmu.addEventListener('click', () => {
        ammuModal.classList.remove('show');
        this.input.isShopOpen = false;
        this.input.requestPointerLock();
      });
    }

    // LS Customs
    const customsGrid = document.getElementById('customs-grid');
    const customsModal = document.getElementById('customs-modal');
    const closeCustoms = document.getElementById('close-customs-btn');

    if (customsGrid) {
      const tunes = [
        { name: '涡轮增压引擎 (顶级极速)', price: 15000, apply: (v) => { v.maxSpeed += 15; v.acceleration += 10; } },
        { name: '防弹装甲车身 (耐久加倍)', price: 10000, apply: (v) => { v.maxHealth = 2000; v.health = 2000; } },
        { name: '霓虹底盘灯光 (炫酷绿光)', price: 5000, apply: (v) => { v.hasNeon = true; } },
        { name: '喷漆: 哑光黑', price: 2500, apply: (v) => { v.bodyColor = 0x111111; if (v.chassis && v.chassis.material) v.chassis.material.color.setHex(0x111111); } },
        { name: '喷漆: 烈焰红', price: 2500, apply: (v) => { v.bodyColor = 0xe74c3c; if (v.chassis && v.chassis.material) v.chassis.material.color.setHex(0xe74c3c); } }
      ];

      tunes.forEach(t => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = '<div><div class="shop-item-name">' + t.name + '</div><div class="shop-item-price">$' + t.price + '</div></div><button class="buy-btn">改装升级</button>';
        card.querySelector('.buy-btn').addEventListener('click', () => {
          if (this.player.money >= t.price && this.currentVehicle) {
            this.player.money -= t.price;
            t.apply(this.currentVehicle);
            this.soundEngine.playCash();
            this.showSubtitle('车辆已升级: ' + t.name);
          }
        });
        customsGrid.appendChild(card);
      });
    }

    if (closeCustoms) {
      closeCustoms.addEventListener('click', () => {
        customsModal.classList.remove('show');
        this.input.isShopOpen = false;
        this.input.requestPointerLock();
      });
    }
  }

  initRadioUI() {
    const radioBtns = document.querySelectorAll('.radio-station-btn');
    radioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const station = parseInt(btn.dataset.station);
        this.soundEngine.setStation(station);
        radioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  showSubtitle(text, duration = 4.0) {
    this.hud.showSubtitle(text, duration);
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameLoop(currentTime) {
    requestAnimationFrame((t) => this.gameLoop(t));

    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const deltaTime = Math.min(rawDelta, 0.1);

    if (!this.isGameRunning) return;

    // Time dilation for Special Ability / Weapon Wheel
    const timeScale = (this.weaponWheel.isOpen || this.player.specialAbilityActive) ? 0.2 : 1.0;
    const effectiveDelta = deltaTime * timeScale;

    // 1. Update Input Manager
    this.input.update();

    // 2. Smartphone Toggle (M / P)
    if (this.input.phoneToggle) {
      this.phoneSystem.togglePhone();
    }

    // 3. Quick Weapon Slot Keys (1-8)
    const slotSelected = this.input.getWeaponSlotSelected();
    if (slotSelected >= 0) {
      const wepKeys = Object.keys(this.weaponManager.weapons);
      if (wepKeys[slotSelected]) {
        this.weaponManager.selectWeapon(wepKeys[slotSelected], this.player);
      }
    }

    // 4. Vehicle Entry / Exit (F / Enter)
    this.handleVehicleInteractions();

    // 5. Update Player & Weapons
    if (!this.currentVehicle) {
      this.player.update(this.input, this.cameraController, this.cityWorld, effectiveDelta);
      this.weaponManager.update(this.input, this.player, this.cameraController, this.npcManager.pedestrians, this.vehicles, this.cityWorld, effectiveDelta);
    } else {
      // Player is driving
      this.currentVehicle.update(this.input, this.cityWorld, effectiveDelta);
      this.player.position.copy(this.currentVehicle.position);
      this.player.mesh.position.copy(this.currentVehicle.position);
    }

    // 6. Update AI NPCs & Traffic
    this.npcManager.update(this.player, this.weaponManager, this.cityWorld, effectiveDelta);

    // 7. Update Police Wanted System
    this.policeSystem.update(this.player, this.cityWorld, effectiveDelta);

    // 8. Update Missions & Story
    this.missionManager.update(this.player, effectiveDelta);

    // 9. Update City World Props & Atmosphere
    this.cityWorld.update(effectiveDelta);
    this.engine.update(effectiveDelta, this.player.position);

    // 10. Update Camera
    const isAiming = this.player.isAiming && !this.currentVehicle;
    const vehSpeed = this.currentVehicle ? this.currentVehicle.speed : 0;
    this.cameraController.update(this.input, effectiveDelta, isAiming, vehSpeed);

    // 11. Update UI, Weapon Wheel, and HUD
    this.weaponWheel.update(this.input);
    this.hud.update(this.player, this.weaponManager, this.policeSystem, this.currentVehicle, effectiveDelta);
    this.phoneSystem.update(this.engine.timeOfDay);

    // 12. Check Shop Proximity & Prompts
    this.checkWorldInteractions();

    // 13. Wasted Death Screen Loop
    if (this.player.isDead) {
      this.handleWastedState();
    }

    // 14. Render Three.js Scene
    this.engine.render();

    // Reset single-frame inputs
    this.input.postUpdate();
  }

  handleVehicleInteractions() {
    if (this.input.enterVehicle) {
      if (this.currentVehicle) {
        // Exit Vehicle
        this.soundEngine.stopEngine();
        this.currentVehicle.driver = null;
        this.player.inVehicle = null;
        this.player.mesh.visible = true;
        this.player.position.copy(this.currentVehicle.position).add(new THREE.Vector3(2.0, 0.9, 0));
        this.cameraController.setTarget(this.player, 'on_foot');
        this.currentVehicle = null;
        this.soundEngine.playClick();
      } else {
        // Search nearest vehicle
        let nearestVeh = null;
        let nearestDist = 4.5;
        this.vehicles.forEach(v => {
          const d = this.player.position.distanceTo(v.position);
          if (d < nearestDist && !v.isDestroyed) {
            nearestDist = d;
            nearestVeh = v;
          }
        });

        if (nearestVeh) {
          this.currentVehicle = nearestVeh;
          nearestVeh.driver = this.player;
          this.player.inVehicle = nearestVeh;
          this.player.mesh.visible = false;
          this.cameraController.setTarget(nearestVeh, nearestVeh.type === 'heli' ? 'helicopter' : 'in_vehicle');
          this.soundEngine.startEngine(nearestVeh.type);
          this.soundEngine.playClick();
        }
      }
    }
  }

  checkWorldInteractions() {
    if (this.currentVehicle) {
      this.hud.hidePrompt();
      return;
    }

    let nearVeh = null;
    this.vehicles.forEach(v => {
      if (this.player.position.distanceTo(v.position) < 4.0 && !v.isDestroyed) {
        nearVeh = v;
      }
    });

    if (nearVeh) {
      const names = { supercar: '佩嘉西 桑托劳 (超跑)', muscle: '威皮 统治者 (肌肉车)', bike: '巴蒂801 (摩托)', heli: '秃鹰 武装直升机', police: '警局巡逻车' };
      this.hud.showPrompt('F', '进入 ' + (names[nearVeh.type] || '载具'));
      return;
    }

    let nearShop = null;
    this.cityWorld.shopZones.forEach(sz => {
      if (this.player.position.distanceTo(sz.position) < sz.radius) {
        nearShop = sz;
      }
    });

    if (nearShop) {
      this.hud.showPrompt('E', '进入 ' + nearShop.name);
      if (this.input.interact) {
        if (nearShop.type === 'ammunation') {
          document.getElementById('ammunation-modal').classList.add('show');
          this.input.isShopOpen = true;
          this.input.exitPointerLock();
        } else if (nearShop.type === 'customs') {
          document.getElementById('customs-modal').classList.add('show');
          this.input.isShopOpen = true;
          this.input.exitPointerLock();
        }
      }
      return;
    }

    this.hud.hidePrompt();
  }

  handleWastedState() {
    const wastedScreen = document.getElementById('wasted-screen');
    if (wastedScreen && wastedScreen.style.display !== 'flex') {
      wastedScreen.style.display = 'flex';
      this.cameraController.setTarget(this.player, 'wasted');
      setTimeout(() => {
        wastedScreen.style.display = 'none';
        this.player.respawn(new THREE.Vector3(0, 0.9, 0));
        this.cameraController.setTarget(this.player, 'on_foot');
        this.policeSystem.setWantedLevel(0);
        this.showSubtitle('你已在 蒙特佐纳 医疗中心门前重生。医疗费用: $5,000');
        this.player.money = Math.max(0, this.player.money - 5000);
      }, 4000);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new GTA5Game();
  game.start();
});
