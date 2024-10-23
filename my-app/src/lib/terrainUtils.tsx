// src/lib/terrainUtils.ts

import { createNoise2D } from "simplex-noise";
import alea from "alea";

// Calculate height at (x, z) using 2D noise
export const getHeightAt = (x: number, z: number, noise: any) => {
  const scale = 0.05; // Controls frequency of hills
  const amplitude = 6; // Controls hill height
  const noiseValue = noise(x * scale, z * scale);
  return Math.max(Math.floor(amplitude * noiseValue), 1); // Ensure minimum height of 1
};

// Generate a chunk of terrain blocks using noise
export const generateChunk = (
  startX: number,
  startZ: number,
  chunkSize: number,
  blockSize: number,
  seed: string
) => {
  const prng = alea(seed); // Seeded PRNG
  const noise2D = createNoise2D(prng); // Noise function

  const blocks = [];
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = startX + x;
      const worldZ = startZ + z;
      const height = getHeightAt(worldX, worldZ, noise2D);
      blocks.push({
        x: worldX * blockSize,
        y: height * blockSize,
        z: worldZ * blockSize,
        size: blockSize,
      });
    }
  }
  return blocks;
};
