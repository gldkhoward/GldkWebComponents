import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

interface PlayerOptions {
    height?: number;
    speed?: number;
    runSpeed?: number;  // New option for run speed
    sensitivity?: number;
    jumpForce?: number;
    radius?: number;
  }

export class Player {
  public camera: THREE.PerspectiveCamera;
  public controls: PointerLockControls;
  public velocity: THREE.Vector3;
  public position: THREE.Vector3;  // Physical position of the player
  public height: number;
  public radius: number;
  public onGround: boolean = false;
  
  private direction: THREE.Vector3;
  private moveState: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    run: boolean;  // New state for running

  };
  
  private speed: number;
  private sensitivity: number;
  private jumpForce: number;
  private maxSpeed: number = 10;
  private runSpeed: number;  // New property for run speed
  private cameraOffset: THREE.Vector3;
  private moveDirection: THREE.Vector3;

  constructor(domElement: HTMLElement, options: PlayerOptions = {}) {
    this.height = options.height || 1.75;
    this.speed = options.speed || 10;
    this.sensitivity = options.sensitivity || 0.002;
    this.jumpForce = options.jumpForce || 10;
    this.radius = options.radius || 0.5;
    this.runSpeed = options.runSpeed || this.speed * 2;  // Default run speed is 1.6x normal speed


    // Initialize vectors
    this.position = new THREE.Vector3(0, this.height, 0);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.cameraOffset = new THREE.Vector3(0, this.height, 0);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    // Initialize controls
    this.controls = new PointerLockControls(this.camera, domElement);

    // Initialize movement state
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      run: false
    };

    this.moveDirection = new THREE.Vector3();

    this.setupEventListeners();
  }

  public updateCameraPosition(): void {
    // Update camera position based on player position and camera offset
    this.camera.position.copy(this.position).add(this.cameraOffset);
  }

  public applyInputs(deltaTime: number): void {
    if (this.controls.isLocked) {
      // Reset movement direction
      this.moveDirection.set(0, 0, 0);

      // Calculate movement direction
      const moveX = Number(this.moveState.right) - Number(this.moveState.left);
      const moveZ = Number(this.moveState.forward) - Number(this.moveState.backward);

      if (moveX !== 0 || moveZ !== 0) {
        this.direction.set(moveX, 0, moveZ).normalize();

        // Get camera direction
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        // Calculate movement vector relative to camera direction
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

        this.moveDirection.add(cameraDirection.multiplyScalar(moveZ));
        this.moveDirection.add(rightVector.multiplyScalar(moveX));
        this.moveDirection.normalize();

        // Apply speed to movement (use run speed if running)
        const currentSpeed = this.moveState.run ? this.runSpeed : this.speed;
        this.moveDirection.multiplyScalar(currentSpeed);

        // Update velocity
        this.velocity.x = this.moveDirection.x;
        this.velocity.z = this.moveDirection.z;
      } else {
        // No movement input
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      // Apply velocity to position
      this.position.addScaledVector(this.velocity, deltaTime);

      // Update camera position
      this.updateCameraPosition();
    }
  }

  public jump(): void {
    if (this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.updateCameraPosition();
  }

  public getState(): { position: THREE.Vector3, direction: THREE.Vector3 } {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    return {
      position: this.position.clone(),
      direction: direction
    };
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveState.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveState.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveState.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveState.right = true;
          break;
        case 'Space':
          this.jump();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.moveState.run = true;
          break;
        case 'KeyL':
          if (this.controls.isLocked) {
            this.controls.unlock();
          } else {
            this.controls.lock();
          }
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveState.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveState.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveState.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveState.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.moveState.run = false;
          break;
      }
    });

    // Lock/unlock handlers
    this.controls.addEventListener('lock', () => {
      console.log('Controls locked');
    });

    this.controls.addEventListener('unlock', () => {
      console.log('Controls unlocked');
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): PointerLockControls {
    return this.controls;
  }

  public isLocked(): boolean {
    return this.controls.isLocked;
  }

  public lock(): void {
    this.controls.lock();
  }

  public unlock(): void {
    this.controls.unlock();
  }
}