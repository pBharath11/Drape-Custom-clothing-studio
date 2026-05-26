declare module "three/examples/jsm/controls/OrbitControls" {
  import { EventDispatcher, PerspectiveCamera, Vector3 } from "three";

  export class OrbitControls extends EventDispatcher {
    constructor(object: PerspectiveCamera, domElement?: HTMLElement);
    enabled: boolean;
    target: Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    screenSpacePanning: boolean;
    minDistance: number;
    maxDistance: number;
    update(): void;
    dispose(): void;
  }
}

declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { Loader, Group } from "three";

  export interface GLTF {
    scene: Group;
  }

  export class GLTFLoader extends Loader {
    setPath(path: string): this;
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}
