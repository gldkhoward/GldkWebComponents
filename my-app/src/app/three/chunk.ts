import * as THREE from 'three';
import { createNoise2D, NoiseFunction2D } from 'simplex-noise';
import alea from 'alea';
import { BlockType, BlockMaterials, createBlockMaterials } from './blocks';

interface ChunkSize {
  width: number;
  height: number;
}

interface ChunkParams {
  seed: number;
  isDarkMode: boolean;
  biomeScale: number;
  portfolioScale: number;
  terrainScale: number;
  heightScale: number;
  maxHeight: number;
  groundLevel: number;
  minHeight: number;
}

interface BlockData {
  id: number;
  instanceId: number | null;
}

type BiomeType = 'grid' | 'city' | 'sea' | 'lightcycle' | 'outlands';

interface ChunkPosition {
  x: number;
  y: number;
  z: number;
}

interface ChunkBase extends THREE.Object3D {
  position: THREE.Vector3;
  generate(): void;
  dispose(): void;
}

interface ChunkWithPosition extends ChunkBase {
  getIsPortfolioChunk(): boolean;
}

interface PortfolioChunk extends ChunkWithPosition {}

export class Chunk extends THREE.Group {
  private size: ChunkSize;
  private params: ChunkParams;
  private blocks: BlockData[][][];
  private loaded: boolean;
  private _isPortfolioChunk: boolean;
  private biomeType: BiomeType | null;
  private noise2D: NoiseFunction2D;
  private static geometryCache = {
    block: new THREE.BoxGeometry(1, 1, 1)
  };
  private materials: BlockMaterials;
  private instancedMeshes: Map<number, THREE.InstancedMesh>;

  constructor(size: number = 32, params: ChunkParams) {
    super();

    this.size = {
      width: size,
      height: params.maxHeight, // Use maxHeight for chunk height
    };

    this.params = {
      ...params,
      maxHeight: params.maxHeight || 64,
      groundLevel: params.groundLevel || 32,
      minHeight: params.minHeight || 5
    };
    this.loaded = false;
    this._isPortfolioChunk = false;
    this.biomeType = null;
    this.position.set(0, 0, 0);
    this.updateMatrixWorld();

    // Initialize noise with seed and position
    const prng = alea(this.params.seed + this.position.x + this.position.z);
    this.noise2D = createNoise2D(prng);

    this.materials = createBlockMaterials(this.params.isDarkMode);
    this.instancedMeshes = new Map();
    this.blocks = [];
  }

  public generate(): void {
    const start = performance.now();

    this.initializeChunk();
    this.determineBiomeAndType();
    this.generateTerrain();

    if (this._isPortfolioChunk) {
      this.generatePortfolioElements();
    }

    this.generateBiomeStructures();
    this.generateMeshes();

    this.loaded = true;
    console.log(`Chunk generated in ${performance.now() - start}ms`);
  }

  public getIsPortfolioChunk(): boolean {
    return this._isPortfolioChunk;
  }

  public setIsPortfolioChunk(value: boolean): void {
    this._isPortfolioChunk = value;
  }

  private initializeChunk(): void {
    // Initialize blocks array with maxHeight
    this.blocks = Array(this.size.width)
      .fill(null)
      .map(() =>
        Array(this.params.maxHeight) // Use maxHeight here
          .fill(null)
          .map(() =>
            Array(this.size.width)
              .fill(null)
              .map(() => ({
                id: BlockType.Empty,
                instanceId: null,
              }))
          )
      );
  }

  private determineBiomeAndType(): void {
    const biomeValue = this.noise2D(
      this.position.x / this.params.biomeScale,
      this.position.z / this.params.biomeScale
    );

    if (biomeValue < -0.5) {
      this.biomeType = 'grid';
    } else if (biomeValue < 0) {
      this.biomeType = 'city';
    } else if (biomeValue < 0.5) {
      this.biomeType = 'sea';
    } else {
      this.biomeType = 'lightcycle';
    }

    // Determine if this is a portfolio chunk using a different seed
    const portfolioPrng = alea(this.params.seed + 1000);
    const portfolioNoise = createNoise2D(portfolioPrng);
    const portfolioValue = portfolioNoise(
      this.position.x / this.params.portfolioScale,
      this.position.z / this.params.portfolioScale
    );

    this._isPortfolioChunk = portfolioValue > 0.8;
  }

  private generateTerrain(): void {
    const worldX = this.position.x;
    const worldZ = this.position.z;

    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        // Convert to world coordinates for consistent noise sampling
        const globalX = worldX + x;
        const globalZ = worldZ + z;
        
        const height = this.calculateTerrainHeight(globalX, globalZ);
        
        // Fill from bottom to height
        for (let y = 0; y < height; y++) {
          const blockType = this.getBlockTypeForHeight(y, height);
          this.setBlock(x, y, z, blockType);
        }
      }
    }
  }

  private calculateTerrainHeight(globalX: number, globalZ: number): number {
    // Get the biome value for this position
    const biomeValue = this.getBiomeInfluence(globalX, globalZ);
    
    // Base terrain noise using world coordinates
    const baseNoise = this.noise2D(
      globalX / this.params.terrainScale,
      globalZ / this.params.terrainScale
    );

    // Additional noise layers for detail
    const detailNoise = this.noise2D(
      globalX / (this.params.terrainScale * 0.5),
      globalZ / (this.params.terrainScale * 0.5)
    ) * 0.5;

    // Combine noises and center around ground level
    let height = baseNoise + detailNoise;
    
    // Scale noise to be centered around ground level
    height = this.params.groundLevel + (height * this.params.heightScale);

    // Apply biome-specific modifications
    switch(this.biomeType) {
      case 'grid':
        // Very flat terrain near ground level
        const gridHeight = this.LerpCalc(
          this.params.groundLevel,
          height,
          0.1 // Minimal variation for grid
        );
        height = this.LerpCalc(height, gridHeight, biomeValue.transitionFactor);
        break;
        
      case 'city':
        // Dramatic variations above ground level
        const cityVariation = Math.abs(this.noise2D(
          globalX / (this.params.terrainScale * 0.7),
          globalZ / (this.params.terrainScale * 0.7)
        )) * this.params.heightScale;
        height = this.LerpCalc(
          height,
          this.params.groundLevel + cityVariation,
          biomeValue.transitionFactor
        );
        break;
        
      case 'sea':
        // Mostly below ground level with occasional pillars
        const pillarNoise = this.noise2D(
          globalX / (this.params.terrainScale * 0.2),
          globalZ / (this.params.terrainScale * 0.2)
        );
        const seaHeight = pillarNoise > 0.7
          ? this.params.groundLevel + (this.params.heightScale * 0.5)
          : this.params.groundLevel * 0.7;
        height = this.LerpCalc(height, seaHeight, biomeValue.transitionFactor);
        break;
        
      case 'lightcycle':
        // Smooth rolling terrain around ground level
        const cycleHeight = this.LerpCalc(
          this.params.groundLevel * 0.8,
          this.params.groundLevel * 1.2,
          (height / this.params.maxHeight)
        );
        height = this.LerpCalc(height, cycleHeight, biomeValue.transitionFactor);
        break;
    }

    // Clamp height between minHeight and maxHeight
    return Math.max(
      this.params.minHeight,
      Math.min(this.params.maxHeight, Math.floor(height))
    );
  }

  private getBiomeInfluence(globalX: number, globalZ: number): {
    primaryBiome: string;
    transitionFactor: number;
  } {
    // Sample biome values in a small radius
    const samplePoints = [
      { x: globalX, z: globalZ },
      { x: globalX + 1, z: globalZ },
      { x: globalX - 1, z: globalZ },
      { x: globalX, z: globalZ + 1 },
      { x: globalX, z: globalZ - 1 }
    ];

    // Get biome values for each point
    const biomeValues = samplePoints.map(point => {
      const biomeNoise = this.noise2D(
        point.x / (this.params.biomeScale),
        point.z / (this.params.biomeScale)
      );
      
      return {
        value: biomeNoise,
        biome: this.getBiomeTypeFromNoise(biomeNoise)
      };
    });

    // Calculate primary biome and transition factor
    const centerBiome = biomeValues[0].biome;
    const transitionCount = biomeValues.filter(b => b.biome !== centerBiome).length;
    
    return {
      primaryBiome: centerBiome,
      transitionFactor: transitionCount / (samplePoints.length - 1)
    };
  }

  private getBiomeTypeFromNoise(noise: number): string {
    if (noise < -0.5) return 'grid';
    if (noise < 0) return 'city';
    if (noise < 0.5) return 'sea';
    return 'lightcycle';
  }

  private LerpCalc(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  private getBlockTypeForHeight(y: number, maxHeight: number): number {
    // Implement block type selection logic based on height and biome
    return BlockType.Ground; // Default block type
  }

  private generateBiomeStructures(): void {
    switch (this.biomeType) {
      case 'city':
        this.generateCityStructures();
        break;
      case 'grid':
        this.generateGridStructures();
        break;
      case 'sea':
        this.generateSeaStructures();
        break;
      case 'lightcycle':
        this.generateLightCycleGrid();
        break;
    }
  }

  private generateCityStructures(): void {
    // Implement city structure generation
  }

  private generateGridStructures(): void {
    // Implement grid structure generation
  }

  private generateSeaStructures(): void {
    // Implement sea structure generation
  }

  private generateLightCycleGrid(): void {
    // Implement light cycle grid generation
  }

  private generatePortfolioElements(): void {
    if (!this.getIsPortfolioChunk()) return;

    const prng = alea(this.params.seed + 2000);
    const noise2D = createNoise2D(prng);
    const elementType = Math.floor(
      noise2D(this.position.x, this.position.z) * 4
    );

    const centerX = Math.floor(this.size.width / 2);
    const centerZ = Math.floor(this.size.width / 2);
    const baseHeight = this.getHighestPoint(centerX, centerZ);

    this.generatePortfolioStructure(centerX, baseHeight, centerZ, elementType);
  }

  private generatePortfolioStructure(
    x: number,
    y: number,
    z: number,
    type: number
  ): void {
    // Implement portfolio structure generation
  }

  private getHighestPoint(x: number, z: number): number {
    for (let y = this.size.height - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z)?.id !== BlockType.Empty) {
        return y + 1;
      }
    }
    return 0;
  }

  public generateMeshes(): void {
    // Dispose of previous instanced meshes
    this.instancedMeshes.forEach(mesh => {
      this.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.instancedMeshes.clear();

    const matrix = new THREE.Matrix4();
    const maxInstances = this.size.width * this.size.height * this.size.width;

    // Create instanced meshes for each block type
    Object.entries(this.materials).forEach(([id, material]) => {
      if (id !== BlockType.Empty.toString()) {
        const instancedMesh = new THREE.InstancedMesh(
          Chunk.geometryCache.block,
          material.blockMaterial,
          maxInstances
        );
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        instancedMesh.count = 0;
        this.instancedMeshes.set(Number(id), instancedMesh);
      }
    });

    // Set instances
    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const block = this.getBlock(x, y, z);
          if (!block || block.id === BlockType.Empty || this.isBlockObscured(x, y, z)) continue;

          const mesh = this.instancedMeshes.get(block.id);
          if (!mesh) continue;

          const count = mesh.count;
          matrix.setPosition(x, y, z);
          mesh.setMatrixAt(count, matrix);
          block.instanceId = count;
          mesh.count++;
        }
      }
    }

    // Update and add meshes
    this.instancedMeshes.forEach(mesh => {
      if (mesh.count > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        this.add(mesh);
      }
    });
  }

  public setBlock(x: number, y: number, z: number, blockId: number): void {
    if (this.isInBounds(x, y, z)) {
      this.blocks[x][y][z].id = blockId;
    }
  }

  public getBlock(x: number, y: number, z: number): BlockData | null {
    if (this.isInBounds(x, y, z)) {
      return this.blocks[x][y][z];
    }
    return null;
  }

  private isInBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < this.size.width &&
      y >= 0 &&
      y < this.size.height &&
      z >= 0 &&
      z < this.size.width
    );
  }

  public updateMaterials(isDarkMode: boolean): void {
    // Update the params
    this.params.isDarkMode = isDarkMode;

    // Dispose of old materials
    Object.values(this.materials).forEach(material => {
      if (material.blockMaterial instanceof THREE.MeshLambertMaterial) {
        if (material.blockMaterial.map) {
          material.blockMaterial.map.dispose();
        }
        material.blockMaterial.dispose();
      }
    });

    // Create new materials
    this.materials = createBlockMaterials(isDarkMode);

    // Update all instanced meshes with new materials
    this.instancedMeshes.forEach((mesh, blockType) => {
      const newMaterial = this.materials[blockType].blockMaterial;
      mesh.material = newMaterial;
    });

    // Regenerate meshes to apply new materials
    this.generateMeshes();
  }

  

  private isBlockObscured(x: number, y: number, z: number): boolean {
    if (!this.isInBounds(x, y, z)) return false;

    const directions: [number, number, number][] = [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    return directions.every(([dx, dy, dz]) => {
      const block = this.getBlock(x + dx, y + dy, z + dz);
      return block && block.id !== BlockType.Empty;
    });
  }

  public dispose(): void {
    this.instancedMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.clear();

    // Clean up materials
    Object.values(this.materials).forEach(material => {
      if (material.blockMaterial) {
        if (material.blockMaterial instanceof THREE.MeshBasicMaterial) {
          if (material.blockMaterial.map) {
            material.blockMaterial.map.dispose();
          }
        }
        material.blockMaterial.dispose();
      }
    });
  }
}