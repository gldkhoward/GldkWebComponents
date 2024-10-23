// /app/page.tsx
"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import { IconHome } from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ShadCN Logo SVG
const ShadCNLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    className="h-6 w-6"
  >
    <rect width="256" height="256" fill="none" />
    <line
      x1="208"
      y1="128"
      x2="128"
      y2="208"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
    />
    <line
      x1="192"
      y1="40"
      x2="40"
      y2="192"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
    />
  </svg>
);

// Dock Items
const dockItems = [
  { title: "Home", icon: <IconHome />, href: "/" },
  { title: "ShadCN", icon: <ShadCNLogo />, href: "/shadcn" },
  {
    title: "Aceternity UI",
    icon: (
      <Image src="/images/logo.png" alt="Aceternity UI Logo" width={24} height={24} />
    ),
    href: "/aceternity-ui",
  },
];

// Generate random cluster positions
const generateClusters = (count: number) =>
  Array.from({ length: count }, () => ({
    x: Math.random() * 100, // Percentage based
    y: Math.random() * 100,
    size: Math.random() * 20 + 5, // Size between 5-25px
  }));

export default function Home() {
  const [clusters, setClusters] = useState<{ x: number; y: number; size: number }[]>([]);

  useEffect(() => {
    setClusters(generateClusters(20)); // Generate 20 random clusters
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between relative">
      {/* 3D Background */}
      <div className="absolute inset-0 overflow-hidden perspective">
        <div className="background-tilted">
          {clusters.map((cluster, index) => (
            <motion.div
              key={index}
              className="cube"
              style={{
                width: `${cluster.size}px`,
                height: `${cluster.size}px`,
                left: `${cluster.x}%`,
                top: `${cluster.y}%`,
              }}
              initial={{ scale:5, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            />
          ))}
        </div>
      </div>

      {/* Centered Content */}
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-black tracking-wider text-gray-900">RUNO</h1>
          <p className="text-sm text-gray-600 mt-2">Last visit from Sydney, Australia</p>
        </div>
      </div>

      {/* Floating Dock at the Bottom */}
      <div className="w-full max-w-md fixed bottom-4 left-0 right-0 mx-auto">
        <FloatingDock items={dockItems} desktopClassName="shadow-lg" />
      </div>
    </main>
  );
}
