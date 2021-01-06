import State from './states.js';
import BasicCharacterControllerInput from './character_controller.js';
import { BasicCharacterControllerProxy } from './character_controller.js';
import { FiniteStateMachine } from './states.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

class BasicGuardController {
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
    this._fsm = new GuardFSM(
      new BasicCharacterControllerProxy(this._animations)
    );
    this._LoadAnimatedModel();
  }
  _LoadAnimatedModel() {
    const loader = new FBXLoader();
    loader.setPath('./resources/alex/');
    loader.load(this._params.name, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });
      this._target = fbx;
      this._params.scene.add(this._target);
      this._mixer = new THREE.AnimationMixer(this._target);
      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._fsm.SetState('idle');
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
      loader.setPath('./resources/alex/');
      loader.load('Running.fbx', (a) => {
        _OnLoad('sprint', a);
      });
      loader.load('Walking.fbx', (a) => {
        _OnLoad('walk', a);
      });
      loader.load('Idle.fbx', (a) => {
        _OnLoad('idle', a);
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
    if (this._input._keys.shift) {
      acc.multiplyScalar(2.0);
    }
    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
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

class SprintState extends State {
  constructor(parent) {
    super(parent);
  }
  get Name() {
    return 'sprint';
  }
  Enter(prevState) {
    const curAction = this._parent._proxy._animations['sprint'].action;
    if (prevState) {
      const prevActions = this._parent._proxy._animations[prevState.Name]
        .action;
      curAction.enabled = true;
      if (prevState.Name == 'walk') {
        const ratio =
          curAction.getClip().duration / prevActions.getClip().duration;
        curAction.time = prevActions.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(0.2);
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
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState('walk');
      }
      return;
    }
    this._parent.SetState('idle');
  }
}

class WalkState extends State {
  constructor(parent) {
    super(parent);
  }
  get Name() {
    return 'walk';
  }
  Enter(prevState) {
    const curAction = this._parent._proxy._animations['walk'].action;
    if (prevState) {
      const prevActions = this._parent._proxy._animations[prevState.Name]
        .action;
      curAction.enabled = true;
      if (prevState.Name == 'walk') {
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
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('sprint');
      }
      return;
    }
    this._parent.SetState('idle');
  }
}

class IdleState extends State {
  constructor(parent) {
    super(parent);
  }
  get Name() {
    return 'idle';
  }
  Enter(prevState) {
    const curAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevActions = this._parent._proxy._animations[prevState.Name]
        .action;
      curAction.time = 0.0;
      curAction.enabled = true;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevActions, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }
  Exit() {}
  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    }
  }
}

class GuardFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }
  _Init() {
    this._AddState('idle', IdleState);
    this._AddState('sprint', SprintState);
    this._AddState('walk', WalkState);
  }
}

export default BasicGuardController;
