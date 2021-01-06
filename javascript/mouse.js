import State from './states.js';
import BasicCharacterControllerInput from './character_controller.js';
import { BasicCharacterControllerProxy } from './character_controller.js';
import { FiniteStateMachine } from './states.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import * as CONSTANTS from 'https://cdn.jsdelivr.net/npm/three@0.118.3/src/constants.js';

class MouseController {
  constructor(params) {
    this._Init(params);
  }
  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 100.0);
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._fsm = new MouseFSM(
      new BasicCharacterControllerProxy(this._animations)
    );
    this._LoadAnimatedModel();
  }

  _LoadAnimatedModel() {
    const loader = new FBXLoader();
    loader.setPath('./resources/mouse/');
    loader.load(this._params.name, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });
      this._target = fbx;
      fbx.position.x = 20;
      this._params.scene.add(this._target);
      this._mixer = new THREE.AnimationMixer(this._target);
      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._fsm.SetState('Walk');
      };
      const _OnLoad = (animName, anim) => {
        anim.timeScale = 1 / 5;
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);
        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };
      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/mouse/');
      loader.load('Walk.fbx', (a) => {
        _OnLoad('Walk', a);
      });
      loader.load('Jump.fbx', (a) => {
        _OnLoad('Jump', a);
      });
    });
  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }
    this._fsm.Update(timeInSeconds, this._input);
    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));
    velocity.add(frameDecceleration);
    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();
    const acc = this._acceleration.clone();
    if (this._input._keys.up_arrow) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.down_arrow) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left_arrow) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right_arrow) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * -Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    controlObject.quaternion.copy(_R);
    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();
    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);
    controlObject.position.add(forward);
    controlObject.position.add(sideways);
    oldPosition.copy(controlObject.position);
    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}

class MouseWalkState extends State {
  constructor(parent) {
    super(parent);
  }
  get Name() {
    return 'Walk';
  }
  Enter(prevState) {
    const curAction = this._parent._proxy._animations['Walk'].action;
    if (prevState) {
      const prevActions = this._parent._proxy._animations[prevState.Name]
        .action;
      curAction.enabled = true;
      if (prevState.Name == 'Walk') {
        const ratio =
          curAction.getClip().duration / prevActions.getClip().duration;
        curAction.time = prevActions.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }
      curAction.crossFadeFrom(prevActions, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }
  Exit() {}
  Update(_, input) {
    if (input._keys.spacebar) {
      this._parent.SetState('Jump');
    }
  }
}

class JumpState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'Jump';
  }

  Enter(prevState) {
    this._currentAction = this._parent._proxy._animations['Jump'].action;
    this._prevState = prevState;
    const prevActions = this._parent._proxy._animations[prevState.Name].action;
    this._currentAction.crossFadeFrom(prevActions, 0.5, true);
    this._currentAction.enabled = true;
    this._currentAction.time = 0.01;
    this._currentAction.setLoop(CONSTANTS.LoopOnce, 1);
    this._currentAction.play();
  }

  Update(timeElapsed, input) {
    if (!this._currentAction.isRunning()) {
      this._parent.SetState(this._prevState.Name);
    }
  }
}

class MouseFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }
  _Init() {
    this._AddState('Walk', MouseWalkState);
    this._AddState('Jump', JumpState);
  }
}

export default MouseController;
