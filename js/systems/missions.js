/**
 * Los Santos Story Missions & Heist System
 * 4 Complete Action-Packed Missions with Checkpoints, AI Wave Spawns, and Heist Sequences
 */
export class MissionManager {
  constructor(scene, soundEngine, game) {
    this.scene = scene;
    this.soundEngine = soundEngine;
    this.game = game;

    this.activeMission = null;
    this.currentStep = 0;
    this.checkpoints = [];
    this.missionEntities = [];

    this.objectiveBar = document.getElementById('mission-objective-bar');
    this.checkpointRing = null;

    this.createCheckpointRingMesh();
  }

  createCheckpointRingMesh() {
    const geo = new THREE.TorusGeometry(3.5, 0.35, 12, 24);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.85 });
    this.checkpointRing = new THREE.Mesh(geo, mat);
    this.checkpointRing.visible = false;
    this.scene.add(this.checkpointRing);

    const colGeo = new THREE.CylinderGeometry(3.2, 3.2, 18, 16, 1, true);
    const colMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    this.lightColumn = new THREE.Mesh(colGeo, colMat);
    this.lightColumn.position.y = 9;
    this.checkpointRing.add(this.lightColumn);
  }

  startMission(missionId) {
    this.abandonCurrentMission();
    this.currentStep = 0;

    if (missionId === 1) {
      this.activeMission = {
        id: 1,
        title: '回收行动 (REPO MAN)',
        reward: 25000,
        steps: [
          { text: '前往好莱坞豪车陈列室 (VINEWOOD AUTO)', target: new THREE.Vector3(-90, 0, -90), radius: 8 },
          { text: '消灭看守车库的敌对帮派成员', target: new THREE.Vector3(-90, 0, -90), type: 'fight', enemies: 4 },
          { text: '坐上 佩嘉西 桑托劳 超跑', target: new THREE.Vector3(-90, 0, -90), type: 'enter_target_car' },
          { text: '甩掉警察追捕并将超跑送至改装车库', target: new THREE.Vector3(90, 0, 90), radius: 10 }
        ]
      };
    } else if (missionId === 2) {
      this.activeMission = {
        id: 2,
        title: '码头火拼 (DOCKS CARTEL BUST)',
        reward: 50000,
        steps: [
          { text: '驱车前往南洛圣都货运码头 (PORT OF LS)', target: new THREE.Vector3(90, 0, 270), radius: 12 },
          { text: '肃清集装箱区的所有毒枭武装分子', target: new THREE.Vector3(90, 0, 270), type: 'fight', enemies: 6 },
          { text: '摧毁走私军火集装箱 (使用火箭筒或手雷)', target: new THREE.Vector3(120, 0, 270), radius: 8 }
        ]
      };
    } else if (missionId === 3) {
      this.activeMission = {
        id: 3,
        title: '午夜街头飙车赛 (MIDNIGHT STREET RACE)',
        reward: 75000,
        steps: [
          { text: '第 1/6 赛道检查点 (藤蔓大道)', target: new THREE.Vector3(-90, 0, -90), radius: 10 },
          { text: '第 2/6 赛道检查点 (金融区高速)', target: new THREE.Vector3(90, 0, -90), radius: 10 },
          { text: '第 3/6 赛道检查点 (花园银行转角)', target: new THREE.Vector3(90, 0, 90), radius: 10 },
          { text: '第 4/6 赛道检查点 (南洛圣都大桥)', target: new THREE.Vector3(0, 0, 180), radius: 10 },
          { text: '第 5/6 赛道检查点 (佩罗码头大道)', target: new THREE.Vector3(-180, 0, 0), radius: 10 },
          { text: '冲刺终点线！夺取第一名', target: new THREE.Vector3(0, 0, 0), radius: 12 }
        ]
      };
    } else if (missionId === 4) {
      this.activeMission = {
        id: 4,
        title: '花园银行大劫案 (THE BIG SCORE AT MAZE BANK)',
        reward: 500000,
        steps: [
          { text: '前往花园银行大楼中心 (MAZE BANK TOWER)', target: new THREE.Vector3(45, 0, -45), radius: 10 },
          { text: '击倒银行内部安保人员并炸开金库大门', target: new THREE.Vector3(45, 0, -45), type: 'fight', enemies: 5 },
          { text: '在 4 星特警包围下坚守并夺取 50 万金砖！', target: new THREE.Vector3(45, 0, -45), type: 'heist_hold', duration: 10 },
          { text: '前往楼顶停机坪乘坐武装直升机逃离！', target: new THREE.Vector3(45, 0, -45), radius: 15 }
        ]
      };
    }

    this.setStep(0);
    this.game.showSubtitle('任务已开启: ' + this.activeMission.title);
  }

  setStep(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.activeMission.steps[stepIndex];
    if (!step) {
      this.completeMission();
      return;
    }

    if (this.objectiveBar) {
      this.objectiveBar.innerText = '任务目标: ' + step.text;
      this.objectiveBar.classList.add('show');
    }

    if (step.target) {
      this.checkpointRing.position.copy(step.target);
      this.checkpointRing.position.y = 0.2;
      this.checkpointRing.visible = true;
    } else {
      this.checkpointRing.visible = false;
    }

    if (step.type === 'fight') {
      for (let i = 0; i < step.enemies; i++) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 16, 0.8, (Math.random() - 0.5) * 16);
        const enemy = this.game.npcManager.spawnPedestrian(step.target.clone().add(offset), true);
        this.missionEntities.push(enemy);
      }
    } else if (step.type === 'heist_hold') {
      this.game.policeSystem.setWantedLevel(4);
    }
  }

  update(player, deltaTime) {
    if (!this.activeMission) return;

    if (this.checkpointRing && this.checkpointRing.visible) {
      this.checkpointRing.rotation.z += deltaTime * 2.0;
    }

    const step = this.activeMission.steps[this.currentStep];
    if (!step) return;

    if (step.type === 'fight') {
      const remaining = this.missionEntities.filter(e => !e.isDead);
      if (remaining.length === 0) {
        this.setStep(this.currentStep + 1);
      }
    } else if (step.type === 'heist_hold') {
      step.duration -= deltaTime;
      if (step.duration <= 0) {
        this.setStep(this.currentStep + 1);
      }
    } else if (step.target) {
      const dist = player.position.distanceTo(step.target);
      if (dist < (step.radius || 8.0)) {
        this.soundEngine.playClick();
        this.setStep(this.currentStep + 1);
      }
    }
  }

  completeMission() {
    const m = this.activeMission;
    this.soundEngine.playMissionPassed();

    this.game.player.addCash(m.reward);

    const banner = document.getElementById('mission-passed-screen');
    const title = document.getElementById('passed-mission-name');
    const cash = document.getElementById('passed-reward-cash');

    if (title) title.innerText = m.title;
    if (cash) cash.innerText = '+$' + m.reward.toLocaleString();
    if (banner) {
      banner.style.display = 'flex';
      setTimeout(() => {
        banner.style.display = 'none';
      }, 5000);
    }

    this.abandonCurrentMission();
  }

  abandonCurrentMission() {
    this.activeMission = null;
    this.currentStep = 0;
    if (this.checkpointRing) this.checkpointRing.visible = false;
    if (this.objectiveBar) this.objectiveBar.classList.remove('show');
    this.missionEntities = [];
  }
}
