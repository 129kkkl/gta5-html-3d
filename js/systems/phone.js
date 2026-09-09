/**
 * Los Santos iFruit Smartphone Operating System
 * Slide-up mobile phone, Contacts (Lester, Franklin), Cheats, Vehicle Delivery, Missions, and Radio Player
 */
export class PhoneSystem {
  constructor(soundEngine, game) {
    this.soundEngine = soundEngine;
    this.game = game;

    this.isOpen = false;
    this.currentView = 'home';

    this.phoneContainer = document.getElementById('phone-container');
    this.homeGrid = document.getElementById('phone-home-grid');
    this.viewTitle = document.getElementById('phone-view-title');
    this.timeDisplay = document.getElementById('phone-time');

    this.initUI();
  }

  initUI() {
    document.querySelectorAll('.phone-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const app = btn.dataset.app;
        this.openApp(app);
      });
    });

    document.querySelectorAll('.phone-back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showHome();
      });
    });

    document.querySelectorAll('[data-call]').forEach(item => {
      item.addEventListener('click', () => {
        const callTarget = item.dataset.call;
        this.handleCall(callTarget);
      });
    });

    document.querySelectorAll('[data-cheat]').forEach(item => {
      item.addEventListener('click', () => {
        const cheat = item.dataset.cheat;
        this.handleCheat(cheat);
      });
    });

    document.querySelectorAll('[data-spawn]').forEach(item => {
      item.addEventListener('click', () => {
        const vehType = item.dataset.spawn;
        this.game.spawnVehicleNearPlayer(vehType);
        this.soundEngine.playCash();
        this.togglePhone();
      });
    });

    document.querySelectorAll('[data-mission]').forEach(item => {
      item.addEventListener('click', () => {
        const mId = parseInt(item.dataset.mission);
        this.game.missionManager.startMission(mId);
        this.togglePhone();
      });
    });
  }

  togglePhone() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.phoneContainer.classList.add('open');
      this.soundEngine.playClick();
      this.showHome();
      if (this.game.input) this.game.input.isPhoneOpen = true;
    } else {
      this.phoneContainer.classList.remove('open');
      this.soundEngine.playClick();
      if (this.game.input) this.game.input.isPhoneOpen = false;
    }
  }

  showHome() {
    this.currentView = 'home';
    this.viewTitle.innerText = 'iFruit OS';
    this.homeGrid.style.display = 'grid';
    document.querySelectorAll('.phone-app-view').forEach(v => v.classList.remove('active'));
    this.soundEngine.playClick();
  }

  openApp(appName) {
    this.currentView = appName;
    this.homeGrid.style.display = 'none';
    this.soundEngine.playClick();

    const viewElem = document.getElementById('phone-view-' + appName);
    if (viewElem) {
      viewElem.classList.add('active');
    }

    const titles = {
      contacts: '通讯录',
      cheats: '作弊秘籍',
      delivery: '技工送车',
      missions: '差事列表',
      radio: '电台广播',
      camera: '相机拍照'
    };
    this.viewTitle.innerText = titles[appName] || 'iFruit';
  }

  handleCall(target) {
    this.soundEngine.playClick();
    if (target === 'lester') {
      this.game.policeSystem.setWantedLevel(0);
      this.game.showSubtitle('莱斯特: "行了，警察那边我已经帮你摆平了，别再惹是生非。"');
    } else if (target === 'franklin') {
      this.game.showSubtitle('富兰克林: "嘿兄弟，去码头或者市中心转转，有大买卖等着我们！"');
    } else if (target === 'mechanic') {
      this.openApp('delivery');
      return;
    } else if (target === 'police') {
      this.game.policeSystem.setWantedLevel(2);
      this.game.showSubtitle('911 接警中心: "已派遣警车前往您所在区域！"');
    }
    this.togglePhone();
  }

  handleCheat(cheat) {
    this.soundEngine.playClick();
    if (cheat === 'buzzard') {
      this.game.spawnVehicleNearPlayer('heli');
      this.game.showSubtitle('已刷出: 秃鹰武装直升机');
    } else if (cheat === 'supercar') {
      this.game.spawnVehicleNearPlayer('supercar');
      this.game.showSubtitle('已刷出: 佩嘉西 桑托劳 超级跑车');
    } else if (cheat === 'godmode') {
      this.game.player.health = 999999;
      this.game.player.armor = 999999;
      this.game.showSubtitle('秘籍激活: 无敌模式 (GOD MODE)');
    } else if (cheat === 'maxammo') {
      Object.values(this.game.weaponManager.weapons).forEach(w => {
        w.clip = w.maxClip;
        w.ammo = w.maxAmmo;
      });
      this.game.showSubtitle('秘籍激活: 所有武器已满弹药');
    } else if (cheat === 'clearwanted') {
      this.game.policeSystem.setWantedLevel(0);
      this.game.showSubtitle('秘籍激活: 通缉星级已全部清除');
    } else if (cheat === 'maxwanted') {
      this.game.policeSystem.setWantedLevel(5);
      this.game.showSubtitle('秘籍激活: 5星最高通缉！');
    } else if (cheat === 'weather') {
      const weathers = ['clear', 'sunset', 'rain', 'night'];
      const next = weathers[(weathers.indexOf(this.game.engine.currentWeather) + 1) % weathers.length];
      this.game.engine.setWeather(next);
      this.game.showSubtitle('天气已切换为: ' + next.toUpperCase());
    }
    this.togglePhone();
  }

  update(timeOfDay) {
    const hours = Math.floor(timeOfDay);
    const mins = Math.floor((timeOfDay % 1) * 60);
    const pad = (n) => n < 10 ? '0' + n : n;
    if (this.timeDisplay) {
      this.timeDisplay.innerText = pad(hours) + ':' + pad(mins);
    }
  }
}
