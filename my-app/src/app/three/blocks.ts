import * as THREE from 'three';

export enum BlockType {
  Empty = 0,
  Ground = 1,
  Grid = 2,
  City = 3,
  Sea = 4,
  Portfolio = 5,
}

interface BlockMaterial {
  blockMaterial: THREE.Material;
}

interface BlockMaterials {
  [key: number]: BlockMaterial;
}

// Texture loading utility
const textureLoader = new THREE.TextureLoader();

const loadTexture = (path: string): THREE.Texture => {
  const texture = textureLoader.load(
    path,
    (tex) => {
      console.log(`Texture loaded: ${path}`);
    },
    undefined,
    (err) => {
      console.error(`Failed to load texture: ${path}`, err);
    }
  );

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};


export const createBlockMaterials = (isDarkMode: boolean): BlockMaterials => {
  const materials: BlockMaterials = {};

  // Create materials for each block type
  Object.values(BlockType).forEach(type => {
    if (typeof type === 'number' && type !== BlockType.Empty) {
      materials[type] = {
        blockMaterial: createMaterialForBlock(type, isDarkMode)
      };
    }
  });

  return materials;
};

export const createBlock = (
  material: BlockMaterial,
  position: { x: number; y: number; z: number },
  size: number = 1
): THREE.Group => {
  const blockGroup = new THREE.Group();

  // Create main block with texture
  const geometry = new THREE.BoxGeometry(size, size, size);
  const blockMesh = new THREE.Mesh(geometry, material.blockMaterial);
  
  // Add shadow support
  blockMesh.castShadow = true;
  blockMesh.receiveShadow = true;

  blockGroup.add(blockMesh);

  // Position the group
  blockGroup.position.set(
    position.x * size,
    position.y * size,
    position.z * size
  );

  return blockGroup;
};

// Helper function to update texture based on mode
export const updateBlockTextures = (
  materials: BlockMaterials,
  isDarkMode: boolean
): void => {
  const newTexture = loadTexture(
    isDarkMode ? '/blocks/default-light.png' : '/blocks/default-light.png'
  );

  Object.values(materials).forEach(material => {
    if (material.blockMaterial instanceof THREE.MeshLambertMaterial) {
      material.blockMaterial.map = newTexture;
      material.blockMaterial.needsUpdate = true;
    }
  });
};

// Helper to dispose of materials and textures
export const disposeBlockMaterials = (materials: BlockMaterials): void => {
  Object.values(materials).forEach(material => {
    if (material.blockMaterial instanceof THREE.MeshLambertMaterial) {
      if (material.blockMaterial.map) {
        material.blockMaterial.map.dispose();
      }
      material.blockMaterial.dispose();
    }
  });
};

const getTextureForBlock = (type: BlockType, isDarkMode: boolean): THREE.Texture => {
  // For now using same texture, but you can expand this to use different textures
  const path = isDarkMode ? '/blocks/default-dark.png' : '/blocks/default-light.png';
  return loadTexture(path);
};

export const createMaterialForBlock = (type: BlockType, isDarkMode: boolean): THREE.Material => {
  const texture = getTextureForBlock(type, isDarkMode);
  return new THREE.MeshLambertMaterial({
    map: texture,
    transparent: false,
    side: THREE.FrontSide,
  });
};

