//Good seeds:
//uae5tz2dj


"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { createNoise2D } from "simplex-noise";
import alea from "alea"; // PRNG for seeded randomness

const CHUNK_SIZE = 20; // Each chunk is 20x20 blocks
const BLOCK_SIZE = 5; // Each block is 5 units in size

export default function TerrainGridWorld() {
  const mountRef = useRef(null);
  const iframeRef = useRef(null); // Reference for YouTube iframe
  const [seed, setSeed] = useState(generateRandomSeed());
  const [inputSeed, setInputSeed] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode state
  const [blocks, setBlocks] = useState([]); // Store all blocks

  function generateRandomSeed() {
    return Math.random().toString(36).substr(2, 9);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputSeed.trim() !== "") {
      setSeed(inputSeed.trim());
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Play YouTube video
  const playVideo = () => {
    iframeRef.current.contentWindow.postMessage(
      '{"event":"command","func":"playVideo","args":""}',
      "*"
    );
  };

  // Pause YouTube video
  const pauseVideo = () => {
    iframeRef.current.contentWindow.postMessage(
      '{"event":"command","func":"pauseVideo","args":""}',
      "*"
    );
  };

  const generateChunk = (startX, startZ, size, noise) => {
    const blocks = [];
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;
        const height = getHeightAt(worldX, worldZ, noise);
        blocks.push({
          x: worldX * BLOCK_SIZE,
          y: height * BLOCK_SIZE,
          z: worldZ * BLOCK_SIZE,
          size: BLOCK_SIZE,
        });
      }
    }
    return blocks;
  };

  const getHeightAt = (x, z, noise) => {
    const scale = 0.05;
    const amplitude = 13;
    const noiseValue = noise(x * scale, z * scale);
    const minHeight = 2;
    const height = Math.floor(amplitude * noiseValue);
    return Math.max(height, minHeight);
  };

  useEffect(() => {
    const prng = alea(seed);
    const noise2D = createNoise2D(prng);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x000000 : 0xffffff);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 80, 200);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current?.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 300, 100);
    scene.add(directionalLight);

    const blockMaterial = new THREE.MeshBasicMaterial({
      color: isDarkMode ? 0x000000 : 0xffffff,
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: isDarkMode ? 0x90d3d5 : 0xa3a3a3,
    });

    const createBlock = (x, y, z, size, isFloor) => {
      const geometry = new THREE.BoxGeometry(size, size, size);
      const block = new THREE.Mesh(geometry, blockMaterial);
    
      const edges = new THREE.EdgesGeometry(geometry);
      
      // Use orange outline for floor blocks
      const edgeColor = isFloor ? 0xffa500 : (isDarkMode ? 0x90d3d5 : 0xa3a3a3);
      const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor }));
    
      const blockGroup = new THREE.Group();
      blockGroup.add(block);
      blockGroup.add(edgeLines);
      blockGroup.position.set(x, y - size / 2, z);
      scene.add(blockGroup);
    
      return block; // Return the block for flashing purposes
    };

    const loadChunks = () => {
      const allBlocks = [];
      const range = 3;
    
      for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
          const startX = i * CHUNK_SIZE;
          const startZ = j * CHUNK_SIZE;
          const blocks = generateChunk(startX, startZ, CHUNK_SIZE, noise2D);
    
          blocks.forEach(({ x, y, z, size }) => {
            // Check if the block is at the floor level
            const isFloor = y === 2 * BLOCK_SIZE; // Assuming minHeight = 2
            const block = createBlock(x, y, z, size, isFloor);
            allBlocks.push(block); // Store blocks for flashing
          });
        }
      }
    
      setBlocks(allBlocks); // Save blocks to state
    };
    

    loadChunks();

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [seed, isDarkMode]);





  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 bg-white bg-opacity-80 p-4 rounded shadow">
        <p>
          <strong>Current Seed:</strong> {seed}
        </p>
        <button
          onClick={() => navigator.clipboard.writeText(seed)}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
        >
          Copy Seed
        </button>
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="seedInput" className="block text-sm font-medium text-gray-700">
            Enter Seed:
          </label>
          <input
            type="text"
            id="seedInput"
            value={inputSeed}
            onChange={(e) => setInputSeed(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded w-full"
            placeholder="Enter seed here"
          />
          <button
            type="submit"
            className="mt-2 px-3 py-1 bg-green-500 text-white rounded"
          >
            Generate Terrain
          </button>
        </form>
        <button
          onClick={toggleDarkMode}
          className="mt-4 px-3 py-1 bg-gray-800 text-white rounded"
        >
          Toggle Dark Mode
        </button>
        <div className="mt-4">
          <button onClick={playVideo} className="px-3 py-1 bg-blue-500 text-white rounded">
            Play Music
          </button>
          <button onClick={pauseVideo} className="ml-2 px-3 py-1 bg-red-500 text-white rounded">
            Pause Music
          </button>
        </div>
      </div>

      <div ref={mountRef} className="absolute inset-0 -z-10" />

      {/* Hidden YouTube iframe for background music */}
      <iframe
        ref={iframeRef}
        className="hidden"
        src="https://www.youtube.com/embed/GRgA_FmAEgU?enablejsapi=1"
        frameBorder="0"
        allow="autoplay"
      />
    </div>
  );
}
