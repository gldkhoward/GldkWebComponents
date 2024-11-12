"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import { IconHome } from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useState } from "react";

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
 {
   title: "ThreeJS",
   icon: (
     <Image src="/images/three.ico" alt="ThreeJS Logo" width={24} height={24} />
   ),
   href: "/threejs",
 },
];

const generateCheckerboard = (rows: number, cols: number) => {
 const board = Array(rows).fill(null).map(() => Array(cols).fill(0));
 const clumpCount = Math.floor(rows * cols * 0.2); // 20% of tiles will be clumps

 for (let i = 0; i < clumpCount; i++) {
   const x = Math.floor(Math.random() * rows);
   const y = Math.floor(Math.random() * cols);
   const clumpSize = Math.floor(Math.random() * 3) + 2;
   const value = Math.random() > 0.5 ? 1 : 2; // 1 for white, 2 for grey

   for (let dx = -clumpSize; dx <= clumpSize; dx++) {
     for (let dy = -clumpSize; dy <= clumpSize; dy++) {
       const newX = x + dx;
       const newY = y + dy;
       if (
         newX >= 0 && newX < rows && 
         newY >= 0 && newY < cols && 
         Math.random() > 0.5
       ) {
         board[newX][newY] = value;
       }
     }
   }
 }

 return board;
};

export default function Home() {
 const [board, setBoard] = useState<number[][]>([]);
 const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
 const baseTileSize = 32; // Base tile size in pixels

 useEffect(() => {
   const updateDimensions = () => {
     const width = window.innerWidth;
     const height = window.innerHeight;
     
     // Calculate number of rows and columns based on screen size
     const cols = Math.ceil(width / baseTileSize);
     const rows = Math.ceil(height / baseTileSize);
     
     setDimensions({ rows, cols });
     setBoard(generateCheckerboard(rows, cols));
   };

   // Initial calculation
   updateDimensions();

   // Update on window resize
   window.addEventListener('resize', updateDimensions);
   
   return () => window.removeEventListener('resize', updateDimensions);
 }, []);

 return (
   <main className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden">
     {/* Checkerboard Background */}
     <div className="absolute inset-0">
       <div 
         className="grid w-screen h-screen"
         style={{
           gridTemplateColumns: `repeat(${dimensions.cols}, 1fr)`,
           gridTemplateRows: `repeat(${dimensions.rows}, 1fr)`,
           gap: '1px'
         }}
       >
         {board.map((row, i) =>
           row.map((cell, j) => (
             <div
               key={`${i}-${j}`}
               className={`
                 transition-colors duration-300
                 ${cell === 0 ? 'bg-gray-200' : 
                   cell === 1 ? 'bg-white' : 'bg-gray-200'}
               `}
             />
           ))
         )}
       </div>
     </div>

     {/* Centered Content */}
     <div className="flex-grow flex items-center justify-center relative z-10">
       <div className="text-center">
         <h1 className="text-6xl font-black tracking-wider text-gray-900">GLDK CMPTs</h1>
         <p className="text-sm text-gray-600 mt-2">Last visit from Sydney, Australia</p>
       </div>
     </div>

     {/* Floating Dock */}
     <div className="w-full max-w-md fixed bottom-4 left-0 right-0 mx-auto z-20">
       <FloatingDock items={dockItems} desktopClassName="shadow-lg" />
     </div>
   </main>
 );
}