import * as THREE from 'three';
import { Chunk } from './chunk';
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';
import { EventDispatcher } from 'three';
import { BlockType } from './blocks';

interface WorldParams {
  seed?: number;
  isDarkMode?: boolean;
  chunkSize?: number;
  renderDistance?: number;
  minBiomeSize?: number;
  biomeTransitionSize?: number;
  portfolioSpacing?: number;
  biomePersistence?: number;
  maxCachedChunks?: number;
  maxHeight?: number;
  groundLevel?: number;
}

interface ExtendedWorldParams extends Required<WorldParams> {
  biomeScale: number;
  portfolioScale: number;
  terrainScale: number;
  heightScale: number;
}

interface ChunkCoords {
  x: number;
  z: number;
}

interface BlockCoords {
  x: number;
  y: number;
  z: number;
}

interface WorldToChunkResult {
  chunk: ChunkCoords;
  block: BlockCoords;
}

interface PlayerState {
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

interface BiomeChangedEvent {
  type: 'biomeChanged';
  biome: string;
}

interface Block {
  id: number;
  instanceId: number | null;
}

export class World extends THREE.Group {
  private params: ExtendedWorldParams;
  private chunks: Map<string, Chunk>;
  private chunkCache: Map<string, Chunk>;
  private chunksToLoad: Set<any>;
  private currentBiome: string | null;
  private worker: Worker | null = null;
  private isWorkerInitialized: boolean = false;
  private noise2D: ReturnType<typeof createNoise2D>;
  private prng: ReturnType<typeof alea>;
  private eventDispatcher: EventDispatcher;
  private biomeEventListeners: Map<string, Set<(event: BiomeChangedEvent) => void>>;
  private chunkLoadQueue: Map<string, {x: number, z: number, priority: number}>;
  private lastChunkLoad: number = 0;
  private readonly CHUNK_LOAD_THROTTLE = 1;

  constructor(params: WorldParams = {}) {
    super();
    
    this.eventDispatcher = new EventDispatcher();
    this.biomeEventListeners = new Map();
    
    this.params = {
      seed: params.seed || Math.random() * 10000,
      isDarkMode: params.isDarkMode || false,
      chunkSize: params.chunkSize || 32,
      renderDistance: params.renderDistance || 6,
      minBiomeSize: params.minBiomeSize || 10,
      biomeTransitionSize: params.biomeTransitionSize || 2,
      portfolioSpacing: params.portfolioSpacing || 4,
      biomePersistence: params.biomePersistence || 0.5,
      maxCachedChunks: params.maxCachedChunks || 16,
      maxHeight: params.maxHeight || 32,
      groundLevel: params.groundLevel || 16,
      biomeScale: 500,
      portfolioScale: 1000,
      terrainScale: 200,
      heightScale: 30
    };
    
    this.prng = alea(this.params.seed);
    this.noise2D = createNoise2D(this.prng);
    this.chunks = new Map();
    this.chunkCache = new Map();
    this.chunksToLoad = new Set();
    this.currentBiome = null;
    this.chunkLoadQueue = new Map();
    
  }

  public getBlock(x: number, y: number, z: number): Block | null {
    const coords = this.worldToChunkCoords(new THREE.Vector3(x, y, z));
    const chunk = this.getChunkByCoords(coords.x, coords.z);
    
    if (!chunk) {
      return null;
    }

    const localCoords = this.getBlockLocalCoords(x, y, z);
    return chunk.getBlock(localCoords.x, localCoords.y, localCoords.z);
  }

  public setBlock(x: number, y: number, z: number, blockId: number): boolean {
    const coords = this.worldToChunkCoords(new THREE.Vector3(x, y, z));
    const chunk = this.getChunkByCoords(coords.x, coords.z);
    
    if (!chunk) {
      return false;
    }

    const localCoords = this.getBlockLocalCoords(x, y, z);
    chunk.setBlock(localCoords.x, localCoords.y, localCoords.z, blockId);
    
    // Update neighboring chunks if block is on border
    if (this.isBlockOnChunkBorder(localCoords)) {
      this.updateNeighboringChunks(coords);
    }

    return true;
  }

  private getChunkByCoords(chunkX: number, chunkZ: number): Chunk | null {
    return this.chunks.get(`${chunkX},${chunkZ}`) || null;
  }

  private getBlockLocalCoords(x: number, y: number, z: number): BlockCoords {
    return {
      x: mod(x, this.params.chunkSize),
      y: y,
      z: mod(z, this.params.chunkSize)
    };
  }

  private isBlockOnChunkBorder(blockCoords: BlockCoords): boolean {
    return blockCoords.x === 0 || 
           blockCoords.x === this.params.chunkSize - 1 ||
           blockCoords.z === 0 || 
           blockCoords.z === this.params.chunkSize - 1;
  }

  private updateNeighboringChunks(chunkCoords: ChunkCoords): void {
    const directions = [
      { x: -1, z: 0 }, { x: 1, z: 0 },
      { x: 0, z: -1 }, { x: 0, z: 1 }
    ];

    for (const dir of directions) {
      const neighborChunk = this.getChunkByCoords(
        chunkCoords.x + dir.x,
        chunkCoords.z + dir.z
      );
      if (neighborChunk) {
        neighborChunk.generateMeshes();
      }
    }
  }


  // ... Existing update and chunk management methods ...
  public update(playerState: PlayerState): void {
    if (!playerState || !playerState.position || !playerState.direction) {
      return;
    }

    const playerChunkCoords = this.worldToChunkCoords(playerState.position);
    const playerDirection = playerState.direction;

    // Convert chunk coords to world position for queue update
    const playerWorldPos = new THREE.Vector3(
      playerChunkCoords.x * this.params.chunkSize,
      0,
      playerChunkCoords.z * this.params.chunkSize
    );

    this.updateChunkQueue(playerWorldPos, playerDirection);
    this.processQueue();
    this.checkBiomeChange(playerChunkCoords);
    this.cleanupInactiveChunks(playerChunkCoords);
  }

  private updateChunkQueue(playerPos: THREE.Vector3, viewDir: THREE.Vector3): void {
    this.chunkLoadQueue.clear();
    
    // Calculate player's chunk coordinates
    const playerChunkX = Math.floor(playerPos.x / this.params.chunkSize);
    const playerChunkZ = Math.floor(playerPos.z / this.params.chunkSize);
    
    // Calculate view direction in chunk space
    const viewXZ = new THREE.Vector2(viewDir.x, viewDir.z).normalize();
    
    // For 25 chunks, we need a radius of 2 (5x5 grid)
    const renderRadius = 2;
    
    // Iterate through a square area around the player
    for (let dx = -renderRadius; dx <= renderRadius; dx++) {
      for (let dz = -renderRadius; dz <= renderRadius; dz++) {
        const chunkX = playerChunkX + dx;
        const chunkZ = playerChunkZ + dz;
        const key = `${chunkX},${chunkZ}`;
        
        // Skip if chunk already exists
        if (this.chunks.has(key)) continue;
        
        // Calculate distance from player in chunk coordinates
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Skip if outside our circular radius
        if (distance > renderRadius + 0.5) continue;
        
        // Calculate direction to this chunk
        const chunkDir = new THREE.Vector2(dx, dz);
        if (chunkDir.length() > 0) chunkDir.normalize();
        
        // Calculate priority based on view direction alignment and distance
        // Chunks in front of player get higher priority
        const alignment = chunkDir.dot(viewXZ);
        const priority = (1 + alignment) / (1 + distance);
        
        this.chunkLoadQueue.set(key, {
          x: chunkX,
          z: chunkZ,
          priority
        });
      }
    }
  }
 
  public setDarkMode(isDark: boolean): void {
    this.params.isDarkMode = isDark;
    // Update all chunks
    this.chunks.forEach(chunk => {
      chunk.updateMaterials(isDark);
    });
  }

  private processQueue(): void {
    const now = performance.now();
    if (now - this.lastChunkLoad < this.CHUNK_LOAD_THROTTLE) return;

    // Sort chunks by priority
    const sortedChunks = Array.from(this.chunkLoadQueue.entries())
      .sort((a, b) => b[1].priority - a[1].priority);

    // Process the highest priority chunk
    if (sortedChunks.length > 0) {
      const [key, chunk] = sortedChunks[0];
      this.generateChunk(chunk.x, chunk.z);
      this.chunkLoadQueue.delete(key);
      this.lastChunkLoad = now;
    }
  }

  private addChunkToWorld(key: string, chunk: Chunk): void {
    this.chunks.set(key, chunk);
    super.add(chunk);
  }

  private cleanupInactiveChunks(playerChunkCoords: ChunkCoords): void {
    const renderRadius = 2; // Match the radius from updateChunkQueue

    for (const [key, chunk] of this.chunks.entries()) {
      const [x, z] = key.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(x - playerChunkCoords.x, 2) +
        Math.pow(z - playerChunkCoords.z, 2)
      );

      if (distance > renderRadius + 0.5) {
        // Cache the chunk if possible
        if (this.chunkCache.size < this.params.maxCachedChunks) {
          this.chunkCache.set(key, chunk);
        } else {
          chunk.dispose();
        }
        this.chunks.delete(key);
        super.remove(chunk);
      }
    }
  }

  public generateChunk(x: number, z: number): void {
    const key = `${x},${z}`;
    
    // Check cache first
    if (this.chunkCache.has(key)) {
      const chunk = this.chunkCache.get(key)!;
      this.chunks.set(key, chunk);
      this.chunkCache.delete(key);
      super.add(chunk);
      return;
    }
  
    // Generate new chunk with world parameters
    const chunk = new Chunk(this.params.chunkSize, {
      seed: this.params.seed,
      isDarkMode: this.params.isDarkMode,
      biomeScale: this.params.biomeScale,
      portfolioScale: this.params.portfolioScale,
      terrainScale: this.params.terrainScale,
      heightScale: this.params.heightScale,
      maxHeight: 64,        // Maximum height for any terrain
      groundLevel: 32,      // Base level where most terrain centers around
      minHeight: 5         // Minimum height to ensure no holes
    });

    // Set chunk position in world space
    chunk.position.set(
      x * this.params.chunkSize,
      0,
      z * this.params.chunkSize
    );
    
    chunk.generate();
    this.addChunkToWorld(key, chunk);
  }

  // ... Existing biome methods ...
  public getBiomeAt(x: number, z: number): string {
    const baseNoise = this.noise2D(
      x / (this.params.minBiomeSize * this.params.chunkSize),
      z / (this.params.minBiomeSize * this.params.chunkSize)
    );
    
    const transitionNoise = this.noise2D(
      x / (this.params.biomeTransitionSize * this.params.chunkSize),
      z / (this.params.biomeTransitionSize * this.params.chunkSize)
    ) * this.params.biomePersistence;
    
    const biomeValue = baseNoise + transitionNoise;
    
    if (biomeValue < -0.5) return 'grid';
    if (biomeValue < 0) return 'city';
    if (biomeValue < 0.5) return 'sea';
    return 'lightcycle';
  }

  public checkBiomeChange(playerChunkCoords: ChunkCoords): void {
    const currentBiome = this.getBiomeAt(
      playerChunkCoords.x * this.params.chunkSize,
      playerChunkCoords.z * this.params.chunkSize
    );
    
    if (currentBiome !== this.currentBiome) {
      this.currentBiome = currentBiome;
      this.emitBiomeEvent({
        type: 'biomeChanged',
        biome: currentBiome
      });
    }
  }

  private generateTerrainHeight(x: number, z: number, biome: string): number {
    const worldX = x;
    const worldZ = z;
    
    // Base terrain noise
    const baseNoise = this.noise2D(
      worldX / this.params.terrainScale,
      worldZ / this.params.terrainScale
    );
    
    // Add some variation based on biome
    let height = 0;
    switch(biome) {
      case 'grid':
        // Flatter terrain with occasional rises
        height = (baseNoise * 0.3 + 0.7) * (this.params.groundLevel - 5);
        break;
        
      case 'city':
        // More dramatic height variations
        const cityNoise = this.noise2D(
          worldX / (this.params.terrainScale * 0.5),
          worldZ / (this.params.terrainScale * 0.5)
        );
        height = (baseNoise + Math.abs(cityNoise)) * this.params.groundLevel * 1.5;
        break;
        
      case 'sea':
        // Lower terrain with occasional pillars
        const pillarNoise = this.noise2D(
          worldX / (this.params.terrainScale * 0.3),
          worldZ / (this.params.terrainScale * 0.3)
        );
        height = pillarNoise > 0.7 
          ? this.params.groundLevel * 2 
          : this.params.groundLevel * 0.3;
        break;
        
      case 'lightcycle':
        // Smooth rolling terrain
        height = (baseNoise * 0.5 + 0.5) * this.params.groundLevel;
        break;
    }
    
    // Ensure minimum height and cap at max height
    return Math.max(5, Math.min(this.params.maxHeight, Math.floor(height)));
  }

  public worldToChunkCoords(position: THREE.Vector3): ChunkCoords {
    return {
      x: Math.floor(position.x / this.params.chunkSize),
      z: Math.floor(position.z / this.params.chunkSize)
    };
  }

  public getActiveChunkCount(): number {
    return this.chunks.size;
  }

  // Portfolio element placement
  public isPortfolioChunkLocation(x: number, z: number): boolean {
    // Create a new seeded noise for portfolio generation
    const portfolioPrng = alea(this.params.seed + 1000);
    const portfolioNoise = createNoise2D(portfolioPrng);
    
    const portfolioValue = portfolioNoise(
      x / this.params.portfolioSpacing,
      z / this.params.portfolioSpacing
    );
    
    return (
      portfolioValue > 0.8 &&
      this.isValidPortfolioDistance(x, z) &&
      !this.isInBiomeTransition(x, z)
    );
  }

  public isValidPortfolioDistance(x: number, z: number): boolean {
    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.getIsPortfolioChunk()) {
        const [chunkX, chunkZ] = key.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(x - chunkX, 2) +
          Math.pow(z - chunkZ, 2)
        );
        if (distance < this.params.portfolioSpacing) {
          return false;
        }
      }
    }
    return true;
  }

  
  public isInBiomeTransition(x: number, z: number): boolean {
    const centerBiome = this.getBiomeAt(
      x * this.params.chunkSize,
      z * this.params.chunkSize
    );
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const biome = this.getBiomeAt(
          (x + dx) * this.params.chunkSize,
          (z + dz) * this.params.chunkSize
        );
        if (biome !== centerBiome) {
          return true;
        }
      }
    }
    return false;
  }

  public addBiomeListener(listener: (event: BiomeChangedEvent) => void): void {
    if (!this.biomeEventListeners.has('biomeChanged')) {
      this.biomeEventListeners.set('biomeChanged', new Set());
    }
    this.biomeEventListeners.get('biomeChanged')?.add(listener);
  }

  public removeBiomeListener(listener: (event: BiomeChangedEvent) => void): void {
    this.biomeEventListeners.get('biomeChanged')?.delete(listener);
  }

  private emitBiomeEvent(event: BiomeChangedEvent): void {
    this.biomeEventListeners.get('biomeChanged')?.forEach(listener => {
      listener(event);
    });
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
    }
    
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    
    for (const chunk of this.chunkCache.values()) {
      chunk.dispose();
    }
    this.chunkCache.clear();
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}