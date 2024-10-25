// Import necessary Three.js modules and hooks
'use client';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import  Stats  from 'three/examples/jsm/libs/stats.module.js';

export default function TorusScene() {
  const mountRef = useRef(null); // Reference to DOM element
  const statsRef = useRef(null); // Reference for the Stats instance

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20); // Position camera to view the torus

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Initialize Stats
    const stats = new Stats();
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0px';
    stats.dom.style.left = '0px';
    mountRef.current.appendChild(stats.dom);
    statsRef.current = stats;

    // Create a torus
    const geometry = new THREE.TorusGeometry(5, 2, 16, 100);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);

    // Add light to the scene
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Orbit controls for interactivity
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movements

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the torus
      torus.rotation.x += 0.01;
      torus.rotation.y += 0.01;

      // Update controls and stats
      controls.update();
      stats.update();

      // Render the scene
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on component unmount
    return () => {
      mountRef.current.removeChild(renderer.domElement);
      mountRef.current.removeChild(stats.dom);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', position: 'relative' }} />;
}
