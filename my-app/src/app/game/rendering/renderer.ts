import * as THREE from 'three';
import { LightingManager } from './lightingManager';
import Stats from "three/examples/jsm/libs/stats.module.js";

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private stats: Stats;
  
  constructor(mountElement: HTMLDivElement) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x80a0e0, 50, 75);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(this.scene.fog.color);
    mountElement.appendChild(this.renderer.domElement);

    // Stats setup
    this.stats = new Stats();
    this.stats.dom.style.position = 'absolute';
    mountElement.appendChild(this.stats.dom);

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public render(camera: THREE.Camera): void {
    this.stats.begin();
    this.renderer.render(this.scene, camera);
    this.stats.end();
  }

  private handleResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.stats.dom.remove();
  }
}