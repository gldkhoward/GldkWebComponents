'use client'

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { World } from './world';
import { Player } from './player';
import { Physics } from './physics';
import GameUI from './ui';

export default function ExplorePage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<Stats>(null);
  const playerRef = useRef<Player | null>(null);
  const worldRef = useRef<World | null>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  
  const [debug, setDebug] = useState({
    position: { x: 0, y: 0, z: 0 },
    fps: 0,
    chunks: 0
  });
  const [currentBiome, setCurrentBiome] = useState('Unknown');

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x80a0e0, 50, 75);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(scene.fog.color);
    mountRef.current.appendChild(renderer.domElement);

    // Stats
    const stats = new Stats();
    stats.dom.style.position = 'absolute';
    statsRef.current = stats;
    mountRef.current.appendChild(stats.dom);

    // Player setup
    const player = new Player(renderer.domElement, {
      height: 1.5,
      speed: 15,
      sensitivity: 0.002,
      jumpForce: 20,
      radius: 0.5
    });
    player.setPosition(0, 50, 0);
    playerRef.current = player;
    scene.add(player.camera);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(50, 50, 50);
    sun.castShadow = true;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0001;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    scene.add(sun.target);
    sunRef.current = sun;

    // Create world
    const world = new World({
      seed: Math.random() * 10000,
      isDarkMode: false,
      renderDistance: 2,
      chunkSize: 32
    });
    scene.add(world);
    worldRef.current = world;

    // Add biome change listener
    world.addBiomeListener((event) => {
      setCurrentBiome(event.biome);
    });

    // Physics setup
    const physics = new Physics(scene);

    // Animation loop
    const clock = new THREE.Clock();
    let lastTime = performance.now();
    let frame = 0;
    let fps = 0;

    const animate = () => {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();
      physics.update(deltaTime, player, world);

      const playerState = player.getState();
      world.update(playerState);

      if (sunRef.current) {
        sunRef.current.position.copy(player.position);
        sunRef.current.position.sub(new THREE.Vector3(-50, -50, -50));
        sunRef.current.target.position.copy(player.position);
      }

      frame++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        fps = frame;
        frame = 0;
        lastTime = now;

        setDebug({
          position: {
            x: Math.round(player.position.x * 100) / 100,
            y: Math.round(player.position.y * 100) / 100,
            z: Math.round(player.position.z * 100) / 100
          },
          fps: fps,
          chunks: world.getActiveChunkCount()
        });
      }

      renderer.render(scene, player.camera);
    };
    animate();

    const handleResize = () => {
      player.camera.aspect = window.innerWidth / window.innerHeight;
      player.camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      mountRef.current?.removeChild(stats.dom);
      renderer.dispose();
      world.dispose();
      physics.dispose();
    };
  }, []);

  const handleDarkModeToggle = (isDark: boolean) => {
    if (worldRef.current) {
      worldRef.current.setDarkMode(isDark);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div 
        ref={mountRef} 
        className="absolute inset-0"
        style={{ 
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none'
        }}
        onClick={() => {
          playerRef.current?.lock();
        }}
      />
      
      <GameUI 
        debug={debug}
        currentBiome={currentBiome}
        onDarkModeToggle={handleDarkModeToggle}
      />
    </div>
  );
}