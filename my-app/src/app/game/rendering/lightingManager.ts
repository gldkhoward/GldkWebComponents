import * as THREE from 'three';
import { Vector3 } from 'three';

export class LightingManager {
  private ambientLight: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    // Ambient light setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(this.ambientLight);

    // Directional light (sun) setup
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.configureSun();
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  private configureSun(): void {
    this.sun.position.set(50, 50, 50);
    this.sun.castShadow = true;
    
    // Configure shadow properties
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sun.shadow.camera.near = 0.1;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.bias = -0.0001;
    this.sun.shadow.mapSize.set(2048, 2048);
  }

  public updateSunPosition(playerPosition: Vector3): void {
    this.sun.position.copy(playerPosition);
    this.sun.position.sub(new THREE.Vector3(-50, -50, -50));
    this.sun.target.position.copy(playerPosition);
  }

  public dispose(): void {
    this.ambientLight.dispose();
    this.sun.dispose();
  }
}