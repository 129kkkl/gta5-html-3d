/**
 * Los Santos HUD & Radar Minimap System
 * Canvas2D dynamic GPS radar, status bars, ammo counters, wanted stars, speedometers & subtitles
 */
export class HUD {
  constructor(game) {
    this.game = game;

    // Elements
    this.moneyElem = document.getElementById('hud-money');
    this.wantedStarsElem = document.getElementById('hud-wanted-stars');
    this.weaponAmmoElem = document.getElementById('hud-weapon-ammo');
    this.healthBar = document.getElementById('health-bar');
    this.armorBar = document.getElementById('armor-bar');
    this.staminaBar = document.getElementById('stamina-bar');
    this.abilityBar = document.getElementById('ability-bar');

    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.prompt = document.getElementById('interaction-prompt');
    this.promptKey = document.getElementById('prompt-key');
    this.promptText = document.getElementById('prompt-text');

    this.speedometer = document.getElementById('speedometer');
    this.speedVal = document.getElementById('speed-val');
    this.gearVal = document.getElementById('gear-val');
    this.locationTag = document.getElementById('radar-location');
    this.subtitlesElem = document.getElementById('subtitles-container');

    // Radar Canvas
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.displayedMoney = 1500000;
    this.subtitleTimer = 0;
  }

  showHitmarker() {
    if (!this.hitmarker) return;
    this.hitmarker.classList.add('show');
    if (this.crosshair) this.crosshair.classList.add('hit');
    setTimeout(() => {
      this.hitmarker.classList.remove('show');
      if (this.crosshair) this.crosshair.classList.remove('hit');
    }, 120);
  }

  showPrompt(key, text) {
    if (!this.prompt) return;
    this.promptKey.innerText = key;
    this.promptText.innerText = text;
    this.prompt.classList.add('show');
  }

  hidePrompt() {
    if (this.prompt) this.prompt.classList.remove('show');
  }

  showSubtitle(text, duration = 4.0) {
    if (!this.subtitlesElem) return;
    this.subtitlesElem.innerText = text;
    this.subtitlesElem.style.display = 'block';
    this.subtitleTimer = duration;
  }

  update(player, weaponManager, policeSystem, vehicle, deltaTime) {
    // 1. Money Counter Animation
    if (this.moneyElem) {
      if (this.displayedMoney < player.money) {
        this.displayedMoney = Math.min(player.money, this.displayedMoney + Math.ceil((player.money - this.displayedMoney) * 0.1));
      } else if (this.displayedMoney > player.money) {
        this.displayedMoney = player.money;
      }
      this.moneyElem.innerText = '$' + this.displayedMoney.toLocaleString();
    }

    // 2. Status Bars
    if (this.healthBar) this.healthBar.style.width = Math.max(0, (player.health / player.maxHealth) * 100) + '%';
    if (this.armorBar) this.armorBar.style.width = Math.max(0, (player.armor / player.maxArmor) * 100) + '%';
    if (this.staminaBar) this.staminaBar.style.width = Math.max(0, (player.stamina / player.maxStamina) * 100) + '%';
    if (this.abilityBar) this.abilityBar.style.width = Math.max(0, (player.specialAbilityMeter / 100) * 100) + '%';

    // 3. Wanted Stars
    if (this.wantedStarsElem) {
      const stars = this.wantedStarsElem.children;
      for (let i = 0; i < 5; i++) {
        if (i < policeSystem.wantedLevel) {
          stars[i].classList.add('active');
        } else {
          stars[i].classList.remove('active');
        }
      }
    }

    // 4. Weapon & Ammo HUD
    const curWep = weaponManager.getCurrentWeapon();
    if (this.weaponAmmoElem && curWep) {
      if (curWep.type === 'melee') {
        this.weaponAmmoElem.innerHTML = '<span class="clip">--</span>';
      } else {
        this.weaponAmmoElem.innerHTML = '<span class="clip">' + curWep.clip + '</span><span class="reserve">/ ' + curWep.ammo + '</span>';
      }
    }

    // 5. Crosshair Aiming State
    if (this.crosshair) {
      if (player.isAiming) {
        this.crosshair.classList.add('aiming');
      } else {
        this.crosshair.classList.remove('aiming');
      }
    }

    // 6. Vehicle Speedometer
    if (vehicle && this.speedometer) {
      this.speedometer.classList.add('show');
      const kmh = Math.abs(Math.round(vehicle.speed * 3.6));
      this.speedVal.innerText = kmh;
      this.gearVal.innerText = vehicle.gear + 'ND';
    } else if (this.speedometer) {
      this.speedometer.classList.remove('show');
    }

    // 7. Subtitles Timer
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= deltaTime;
      if (this.subtitleTimer <= 0 && this.subtitlesElem) {
        this.subtitlesElem.style.display = 'none';
      }
    }

    // 8. Location Name Tag
    if (this.locationTag) {
      if (player.position.z < -100) this.locationTag.innerText = 'VINEWOOD BOULEVARD';
      else if (player.position.x < -180) this.locationTag.innerText = 'VESPUCCI BEACH & PIER';
      else if (player.position.z > 150) this.locationTag.innerText = 'PORT OF LOS SANTOS';
      else if (player.position.x > 180) this.locationTag.innerText = 'LOS SANTOS INT. AIRPORT';
      else this.locationTag.innerText = 'DOWNTOWN LOS SANTOS';
    }

    // 9. Render Radar Minimap
    this.renderRadar(player, policeSystem);
  }

  renderRadar(player, policeSystem) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.45;

    ctx.fillStyle = '#090c10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-player.rotationY);

    // Draw Roads
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    for (let x = -180; x <= 180; x += 90) {
      ctx.beginPath();
      ctx.moveTo((x - player.position.x) * scale, (-240 - player.position.z) * scale);
      ctx.lineTo((x - player.position.x) * scale, (240 - player.position.z) * scale);
      ctx.stroke();
    }
    for (let z = -180; z <= 180; z += 90) {
      ctx.beginPath();
      ctx.moveTo((-240 - player.position.x) * scale, (z - player.position.z) * scale);
      ctx.lineTo((240 - player.position.x) * scale, (z - player.position.z) * scale);
      ctx.stroke();
    }

    // Draw Mission Checkpoint Blip
    if (this.game.missionManager && this.game.missionManager.activeMission) {
      const step = this.game.missionManager.activeMission.steps[this.game.missionManager.currentStep];
      if (step && step.target) {
        const mx = (step.target.x - player.position.x) * scale;
        const mz = (step.target.z - player.position.z) * scale;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(mx, mz, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Police Blips (Flashing Red/Blue)
    if (policeSystem && policeSystem.policeVehicles) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      policeSystem.policeVehicles.forEach(c => {
        if (!c.isDestroyed) {
          const px = (c.position.x - player.position.x) * scale;
          const pz = (c.position.z - player.position.z) * scale;
          ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
          ctx.beginPath();
          ctx.arc(px, pz, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore();

    // Draw Player Indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }
}
