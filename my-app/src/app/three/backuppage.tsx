"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const CHUNK_SIZE = 20;
const BLOCK_SIZE = 5;

export default function TerrainGridWorld() {
  const mountRef = useRef(null);
  const iframeRef = useRef(null);
  const statsRef = useRef(null);
  const controlsRef = useRef(null);
  const [seed, setSeed] = useState(generateRandomSeed());
  const [inputSeed, setInputSeed] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [blocks, setBlocks] = useState([]);

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

  const playVideo = () => {
    iframeRef.current.contentWindow.postMessage(
      '{"event":"command","func":"playVideo","args":""}',
      "*"
    );
  };

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

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    mountRef.current?.appendChild(renderer.domElement);

    // Initialize OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Add smooth damping
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Post-processing setup
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // Bloom strength
      0.4,  // Radius
      0.85  // Threshold
    );
    composer.addPass(bloomPass);

    const stats = new Stats();
    stats.dom.style.position = "absolute";
    stats.dom.style.top = "0px";
    stats.dom.style.left = "0px";
    mountRef.current?.appendChild(stats.dom);
    statsRef.current = stats;

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
      ...(isDarkMode && {
        emissive: 0x90d3d5,
        emissiveIntensity: 2.0,
      })
    });

    const createBlock = (x, y, z, size, isFloor) => {
      const geometry = new THREE.BoxGeometry(size, size, size);
      const block = new THREE.Mesh(geometry, blockMaterial);

      const edges = new THREE.EdgesGeometry(geometry);
      const edgeColor = isFloor ? 0xffa500 : edgeMaterial.color;
      const customEdgeMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        ...(isDarkMode && {
          emissive: edgeColor,
          emissiveIntensity: isFloor ? 3.0 : 2.0,
        })
      });
      
      const edgeLines = new THREE.LineSegments(edges, customEdgeMaterial);

      const blockGroup = new THREE.Group();
      blockGroup.add(block);
      blockGroup.add(edgeLines);
      blockGroup.position.set(x, y - size / 2, z);
      scene.add(blockGroup);

      return block;
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
            const isFloor = y === 2 * BLOCK_SIZE;
            const block = createBlock(x, y, z, size, isFloor);
            allBlocks.push(block);
          });
        }
      }

      setBlocks(allBlocks);
    };

    loadChunks();

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls in animation loop
      stats.update();
      composer.render();
    };
    animate();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      mountRef.current?.removeChild(stats.dom);
      renderer.dispose();
      controls.dispose();
    };
  }, [seed, isDarkMode]);
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Main container for Three.js canvas - now with proper pointer events */}
      <div 
        ref={mountRef} 
        className="absolute inset-0"
        style={{ 
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',  // Ensure pointer events work
          touchAction: 'none'     // Prevent default touch actions
        }}
      />

      {/* UI Overlay - now with proper z-indexing */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white bg-opacity-80 p-4 rounded shadow">
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
      </div>

      {/* Hidden iframe for music */}
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