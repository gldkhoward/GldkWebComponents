

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

interface DebugInfo {
  position: {
    x: number;
    y: number;
    z: number;
  };
  fps: number;
  chunks: number;
}

interface GameUIProps {
  debug?: DebugInfo;
  currentBiome?: string;
  onDarkModeToggle: (isDark: boolean) => void;
}

const defaultDebug: DebugInfo = {
  position: { x: 0, y: 0, z: 0 },
  fps: 0,
  chunks: 0
};

export default function GameUI({ 
  debug = defaultDebug, 
  currentBiome = 'Unknown', 
  onDarkModeToggle 
}: GameUIProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleDarkModeToggle = () => {
    setIsDarkMode(!isDarkMode);
    onDarkModeToggle(!isDarkMode);
  };

  return (
    <>
      {/* Debug overlay */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded font-mono text-sm space-y-2">
        <div>
          Position: 
          X: {debug.position.x.toFixed(2)} 
          Y: {debug.position.y.toFixed(2)} 
          Z: {debug.position.z.toFixed(2)}
        </div>
        <div>FPS: {debug.fps}</div>
        <div>Active Chunks: {debug.chunks}</div>
        <div>Current Biome: {currentBiome}</div>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={handleDarkModeToggle}
        className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          <Sun className="h-6 w-6" />
        ) : (
          <Moon className="h-6 w-6" />
        )}
      </button>

      {/* Controls help */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded font-mono text-sm space-y-1">
        <div>WASD / Arrows: Move</div>
        <div>Shift: Run</div>
        <div>Space: Jump</div>
        <div>Mouse: Look around</div>
        <div>Click: Lock Pointer</div>
      </div>
    </>
  );
}