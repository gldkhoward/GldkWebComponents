import * as THREE from 'three';
import { World } from './world';
import { Player } from './player';

interface PhysicsObject {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius?: number;
  height?: number;
  onGround?: boolean;
}

export class Physics {
  private gravity: number = 32;
  private simulationRate: number = 240;
  private stepSize: number = 1 / this.simulationRate;
  private accumulator: number = 0;
  
  private collisionHelpers: THREE.Group;
  private debugMode: boolean = false;

  // Materials for debug visualization
  private readonly collisionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.2
  });
  
  private readonly contactMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true
  });

  constructor(scene: THREE.Scene) {
    this.collisionHelpers = new THREE.Group();
    this.collisionHelpers.visible = false;
    scene.add(this.collisionHelpers);
  }

  public update(dt: number, player: Player, world: World): void {
    this.accumulator += dt;
    
    while (this.accumulator >= this.stepSize) {
      // Apply gravity
      player.velocity.y -= this.gravity * this.stepSize;
      
      // Apply player movement
      player.applyInputs(this.stepSize);
      
      // Detect and resolve collisions
      this.detectCollisions(player, world);
      
      this.accumulator -= this.stepSize;
    }
  }

  private detectCollisions(player: Player, world: World): void {
    if (this.debugMode) {
      this.collisionHelpers.clear();
    }

    player.onGround = false;
    
    // Broad phase - get potentially colliding blocks
    const candidates = this.broadPhase(player, world);
    
    // Narrow phase - determine actual collisions
    const collisions = this.narrowPhase(candidates, player);
    
    // Resolve collisions if any found
    if (collisions.length > 0) {
      this.resolveCollisions(collisions, player);
    }
  }

  private broadPhase(player: Player, world: World): Array<{x: number, y: number, z: number}> {
    const candidates: Array<{x: number, y: number, z: number}> = [];
    
    // Get block extents around player
    const minX = Math.floor(player.position.x - player.radius);
    const maxX = Math.ceil(player.position.x + player.radius);
    const minY = Math.floor(player.position.y - player.height);
    const maxY = Math.ceil(player.position.y);
    const minZ = Math.floor(player.position.z - player.radius);
    const maxZ = Math.ceil(player.position.z + player.radius);

    // Check each block in the range
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = world.getBlock(x, y, z);
          if (block && block.id !== 0) { // 0 is empty block
            candidates.push({ x, y, z });
            if (this.debugMode) {
              this.addCollisionHelper({ x, y, z });
            }
          }
        }
      }
    }

    return candidates;
  }

  private narrowPhase(candidates: Array<{x: number, y: number, z: number}>, player: Player): Array<{
    block: {x: number, y: number, z: number},
    contactPoint: {x: number, y: number, z: number},
    normal: THREE.Vector3,
    overlap: number
  }> {
    const collisions = [];

    for (const block of candidates) {
      // Find closest point on block to player cylinder center
      const closestPoint = {
        x: Math.max(block.x - 0.5, Math.min(player.position.x, block.x + 0.5)),
        y: Math.max(block.y - 0.5, Math.min(player.position.y - (player.height / 2), block.y + 0.5)),
        z: Math.max(block.z - 0.5, Math.min(player.position.z, block.z + 0.5))
      };

      // Check if point is inside player's bounding cylinder
      if (this.pointInPlayerBoundingCylinder(closestPoint, player)) {
        const dx = closestPoint.x - player.position.x;
        const dy = closestPoint.y - (player.position.y - player.height / 2);
        const dz = closestPoint.z - player.position.z;

        // Calculate overlaps
        const overlapY = (player.height / 2) - Math.abs(dy);
        const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

        // Determine collision normal and overlap
        let normal, overlap;
        if (overlapY < overlapXZ) {
          normal = new THREE.Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.onGround = true;
        } else {
          normal = new THREE.Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        collisions.push({
          block,
          contactPoint: closestPoint,
          normal,
          overlap
        });

        if (this.debugMode) {
          this.addContactPointHelper(closestPoint);
        }
      }
    }

    return collisions;
  }

  private resolveCollisions(collisions: Array<any>, player: Player): void {
    // Sort collisions by overlap amount
    collisions.sort((a, b) => a.overlap - b.overlap);

    for (const collision of collisions) {
      // Recheck if still colliding after previous resolutions
      if (!this.pointInPlayerBoundingCylinder(collision.contactPoint, player)) {
        continue;
      }

      // Move player out of collision
      const correction = collision.normal.clone().multiplyScalar(collision.overlap);
      player.position.add(correction);

      // Adjust velocity
      const velocityDot = player.velocity.dot(collision.normal);
      if (velocityDot < 0) {
        const velocityCorrection = collision.normal.clone().multiplyScalar(velocityDot);
        player.velocity.sub(velocityCorrection);
      }
    }
  }

  private pointInPlayerBoundingCylinder(point: {x: number, y: number, z: number}, player: Player): boolean {
    const dx = point.x - player.position.x;
    const dy = point.y - (player.position.y - player.height / 2);
    const dz = point.z - player.position.z;

    return (Math.abs(dy) < player.height / 2) && 
           (dx * dx + dz * dz < player.radius * player.radius);
  }

  private addCollisionHelper(position: {x: number, y: number, z: number}): void {
    const geometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    const mesh = new THREE.Mesh(geometry, this.collisionMaterial);
    mesh.position.set(position.x, position.y, position.z);
    this.collisionHelpers.add(mesh);
  }

  private addContactPointHelper(position: {x: number, y: number, z: number}): void {
    const geometry = new THREE.SphereGeometry(0.1);
    const mesh = new THREE.Mesh(geometry, this.contactMaterial);
    mesh.position.set(position.x, position.y, position.z);
    this.collisionHelpers.add(mesh);
  }

  public toggleDebug(): void {
    this.debugMode = !this.debugMode;
    this.collisionHelpers.visible = this.debugMode;
  }

  public dispose(): void {
    this.collisionHelpers.clear();
  }
}