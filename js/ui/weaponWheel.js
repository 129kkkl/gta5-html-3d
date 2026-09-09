/**
 * GTA V Radial Weapon Wheel Controller
 * Slow-motion time dilation, radial slot selection, live damage & fire rate preview
 */
export class WeaponWheel {
  constructor(weaponManager, soundEngine, input) {
    this.weaponManager = weaponManager;
    this.soundEngine = soundEngine;
    this.input = input;

    this.overlay = document.getElementById('weapon-wheel-overlay');
    this.weaponName = document.getElementById('wheel-weapon-name');
    this.weaponAmmo = document.getElementById('wheel-weapon-ammo');
    this.statDamage = document.getElementById('wheel-stat-damage');
    this.statRate = document.getElementById('wheel-stat-rate');

    this.isOpen = false;
    this.hoveredWeapon = null;

    this.initSlots();
  }

  initSlots() {
    const slots = document.querySelectorAll('.wheel-slot');
    slots.forEach(slot => {
      slot.addEventListener('mouseenter', () => {
        const wepId = slot.dataset.weapon;
        this.previewWeapon(wepId);
        this.soundEngine.playClick();
      });

      slot.addEventListener('click', () => {
        const wepId = slot.dataset.weapon;
        this.selectWeapon(wepId);
      });
    });
  }

  previewWeapon(wepId) {
    this.hoveredWeapon = wepId;
    const wep = this.weaponManager.weapons[wepId];
    if (!wep) return;

    if (this.weaponName) this.weaponName.innerText = wep.name;
    if (this.weaponAmmo) {
      this.weaponAmmo.innerText = (wep.type === 'melee') ? '近战无消耗' : (wep.clip + ' / ' + wep.ammo);
    }
    if (this.statDamage) this.statDamage.style.width = Math.min(100, (wep.damage / 100) * 100) + '%';
    if (this.statRate) this.statRate.style.width = Math.min(100, (1 / (wep.fireRate || 0.1)) * 15) + '%';

    document.querySelectorAll('.wheel-slot').forEach(s => {
      s.classList.toggle('active', s.dataset.weapon === wepId);
    });
  }

  selectWeapon(wepId) {
    this.weaponManager.selectWeapon(wepId, this.weaponManager.game ? this.weaponManager.game.player : null);
    this.close();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.previewWeapon(this.weaponManager.currentWeaponId);
    this.input.isWeaponWheelOpen = true;
    this.input.exitPointerLock();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.input.isWeaponWheelOpen = false;
    if (this.hoveredWeapon) {
      this.weaponManager.selectWeapon(this.hoveredWeapon, this.weaponManager.game ? this.weaponManager.game.player : null);
    }
    this.input.requestPointerLock();
  }

  update(input) {
    if (input.weaponWheelHold && !this.isOpen) {
      this.open();
    } else if (!input.weaponWheelHold && this.isOpen) {
      this.close();
    }
  }
}
