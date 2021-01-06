class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }
  get animations() {
    return this._animations;
  }
}

class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }
  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false,
      left_arrow: false,
      up_arrow: false,
      down_arrow: false,
      right_arrow: false,
      spacebar: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }
  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: //w
        this._keys.forward = true;
        break;
      case 65: //a
        this._keys.left = true;
        break;
      case 83: //s
        this._keys.backward = true;
        break;
      case 68: //d
        this._keys.right = true;
        break;
      case 16: //shift
        this._keys.shift = true;
        break;
      case 32: //spacebar
        this._keys.spacebar = true;
        break;
      case 37: //left arrow
        this._keys.left_arrow = true;
        break;
      case 39: //right arrow
        this._keys.right_arrow = true;
        break;
      case 38: //up arrow
        this._keys.up_arrow = true;
        break;
      case 40: //down arrow
        this._keys.down_arrow = true;
        break;
    }
  }
  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: //w
        this._keys.forward = false;
        break;
      case 65: //a
        this._keys.left = false;
        break;
      case 83: //s
        this._keys.backward = false;
        break;
      case 68: //d
        this._keys.right = false;
        break;
      case 16: //shift
        this._keys.shift = false;
        break;
      case 32: //spacebar
        this._keys.spacebar = false;
        break;
      case 37: //left arrow
        this._keys.left_arrow = false;
        break;
      case 39: //right arrow
        this._keys.right_arrow = false;
        break;
      case 38: //up arrow
        this._keys.up_arrow = false;
        break;
      case 40: //down arrow
        this._keys.down_arrow = false;
        break;
    }
  }
}

export default BasicCharacterControllerInput;
export { BasicCharacterControllerProxy };
