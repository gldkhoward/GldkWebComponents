import * as THREE from 'three';

export class Engine {
    private world: World;
    private player: Player;
    private physics: Physics;
    private renderer: THREE.WebGLRenderer;
    private entityManager: EntityManager;

    public update(deltaTime: number): void {
        this.physics.update(deltaTime, this.player, this.world);
        this.player.update(deltaTime);
        this.world.update(deltaTime);
        this.entityManager.update(deltaTime);
    }
}

