import State from './states.js';
import BasicCharacterControllerInput from './character_controller.js';
import { BasicCharacterControllerProxy } from './character_controller.js';
import { FiniteStateMachine } from './states.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

class BasicGirlController {
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
    this._fsm = new GirlFSM(
      new BasicCharacterControllerProxy(this._animations)
    );
    this._LoadAnimatedModel();
  }
  _LoadAnimatedModel() {
    const loader = new FBXLoader();
    loader.setPath('./resources/girl/');
    loader.load(this._params.name, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
      });
      this._target = fbx;
      fbx.position.x = -20;
      this._params.scene.add(this._target);
      this._mixer = new THREE.AnimationMixer(this._target);
      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._fsm.SetState('dance');
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
      loader.setPath('./resources/girl/');
      loader.load('dance.fbx', (a) => {
        _OnLoad('dance', a);
      });
    });
  }
  Update(timeInSeconds) {
    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}

class DanceState extends State {
  constructor(parent) {
    super(parent);
  }
  get Name() {
    return 'dance';
  }
  Enter(prevState) {
    const currentAction = this._parent._proxy._animations['dance'].action;
    currentAction.time = 0.0;
    currentAction.setEffectiveTimeScale(1.0);
    currentAction.setEffectiveWeight(1.0);
    currentAction.play();
  }
}

class GirlFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }
  _Init() {
    this._AddState('dance', DanceState);
  }
}

export default BasicGirlController;
