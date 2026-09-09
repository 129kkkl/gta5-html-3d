/**
 * Los Santos Unified Input System
 * Manages Keyboard, Pointer Lock Mouse, ADS Camera Look, and Action Mappings
 */
export class InputManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;

    this.keys = {};
    this.keysPressed = {};
    this.keysReleased = {};

    this.mouseButtons = {};
    this.mouseButtonsPressed = {};

    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseSensitivity = 0.0022;

    this.isPointerLocked = false;
    this.isWeaponWheelOpen = false;
    this.isPhoneOpen = false;
    this.isShopOpen = false;

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keys[code]) {
        this.keysPressed[code] = true;
      }
      this.keys[code] = true;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      this.keys[code] = false;
      this.keysReleased[code] = true;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked && !this.isWeaponWheelOpen && !this.isPhoneOpen && !this.isShopOpen) {
        this.requestPointerLock();
      }
      if (!this.mouseButtons[e.button]) {
        this.mouseButtonsPressed[e.button] = true;
      }
      this.mouseButtons[e.button] = true;
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.canvas);
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  requestPointerLock() {
    if (this.canvas && !this.isPointerLocked) {
      try {
        this.canvas.requestPointerLock();
      } catch (err) {
        console.warn("Pointer lock request ignored:", err);
      }
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  update() {}

  postUpdate() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.keysPressed = {};
    this.keysReleased = {};
    this.mouseButtonsPressed = {};
  }

  isKeyDown(code) { return !!this.keys[code]; }
  isKeyPressed(code) { return !!this.keysPressed[code]; }
  isKeyReleased(code) { return !!this.keysReleased[code]; }

  isButtonDown(btn) { return !!this.mouseButtons[btn]; }
  isButtonPressed(btn) { return !!this.mouseButtonsPressed[btn]; }

  get forward() { return this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp'); }
  get backward() { return this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown'); }
  get left() { return this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft'); }
  get right() { return this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight'); }

  get sprint() { return this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight'); }
  get jump() { return this.isKeyPressed('Space'); }
  get handbrake() { return this.isKeyDown('Space'); }
  get crouch() { return this.isKeyPressed('KeyC') || this.isKeyPressed('ControlLeft'); }

  get enterVehicle() { return this.isKeyPressed('KeyF') || this.isKeyPressed('Enter'); }
  get interact() { return this.isKeyPressed('KeyE'); }
  get horn() { return this.isKeyDown('KeyE'); }
  get headlights() { return this.isKeyPressed('KeyH'); }

  get attack() { return this.isButtonDown(0); }
  get attackPressed() { return this.isButtonPressed(0); }
  get aim() { return this.isButtonDown(2); }
  get reload() { return this.isKeyPressed('KeyR'); }
  get grenade() { return this.isKeyPressed('KeyG'); }
  get specialAbility() { return this.isKeyPressed('CapsLock'); }

  get weaponWheelHold() { return this.isKeyDown('Tab') || this.isKeyDown('KeyQ'); }
  get phoneToggle() { return this.isKeyPressed('KeyM') || this.isKeyPressed('KeyP'); }

  getWeaponSlotSelected() {
    for (let i = 1; i <= 8; i++) {
      if (this.isKeyPressed('Digit' + i)) return i - 1;
    }
    return -1;
  }
}
