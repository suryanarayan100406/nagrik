import React, { useEffect, useRef, useState } from "react";
import { Cpu, RotateCcw, ZoomIn, ZoomOut, Activity } from "lucide-react";

interface Hotspot {
  lat: number;
  lng: number;
  category: string;
  riskScore: number;
  reasoning: string;
}

interface RiskTerrain3DProps {
  hotspots: Hotspot[];
}

export default function RiskTerrain3D({ hotspots }: RiskTerrain3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D Navigation angles & Zoom parameters for smooth interaction
  const [angleX, setAngleX] = useState<number>(-0.45); // Soft elegant tilt
  const [angleY, setAngleY] = useState<number>(0.85);  // Azimuth rotation
  const [zoom, setZoom] = useState<number>(1.25);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Animation progress
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [pulseScale, setPulseScale] = useState<number>(1);

  // Drag tracking
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Boot up ease transition
  useEffect(() => {
    let startTime = Date.now();
    const duration = 1400;
    let animFrame: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Quartic out ease for high-end feel
      const ease = 1 - Math.pow(1 - progress, 4);
      setAnimProgress(ease);

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [hotspots]);

  // Orbit rotation loop
  useEffect(() => {
    let animFrame: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      // Rotate azimuth very slowly if enabled
      if (isRotating && !isDragging) {
        setAngleY(prev => (prev + 0.00012 * delta) % (Math.PI * 2));
      }

      // Continuous heartbeat pulse for neon elements
      setPulseScale(1 + 0.04 * Math.sin(now * 0.003));

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isRotating, isDragging]);

  // Handle resizing dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timeout = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, []);

  // Primary 3D Canvas rendering engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Detect light vs dark theme dynamically
    const isDark = document.documentElement.classList.contains("dark");
    
    // Background and base grid color options - clean slate minimalist
    const bgColor = isDark ? "#09090b" : "#fcfcfc";
    const gridLineColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(9, 9, 11, 0.03)";
    const floorCircleColor = isDark ? "rgba(16, 185, 129, 0.05)" : "rgba(5, 150, 105, 0.05)";
    const terrainStrokeColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(9, 9, 11, 0.06)";

    // Deep space clean slate background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Grid resolution parameters (50x50 high resolution mesh)
    const gridSize = 50; 
    const spacing = Math.min(width, height) / (gridSize * 1.4) * zoom;
    const gridOffset = (gridSize * spacing) / 2;

    // 3D Projection with smooth perspective scaling
    const project = (x: number, y: number, z: number) => {
      const cx = width / 2;
      const cy = height / 2 + 60 * dpr;

      // Rotate around Y (Azimuth)
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      // Rotate around X (Elevation/Tilt)
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const ry = y * cosX - rz * sinX;
      const depth = y * sinX + rz * cosX;

      // Semi-perspective scaling based on depth
      const fov = 1200 * dpr;
      const scale = fov / (fov + depth);

      return {
        x: cx + rx * scale,
        y: cy - ry * scale,
        depth: depth
      };
    };

    // Dynamic boundary calibration based on actual hotspots coordinates
    let minLat = 26.8000;
    let maxLat = 26.9000;
    let minLng = 80.9000;
    let maxLng = 81.0000;

    if (hotspots && hotspots.length > 0) {
      const lats = hotspots.map(h => h.lat).filter(l => !isNaN(l));
      const lngs = hotspots.map(h => h.lng).filter(l => !isNaN(l));
      if (lats.length > 0 && lngs.length > 0) {
        const bMinLat = Math.min(...lats);
        const bMaxLat = Math.max(...lats);
        const bMinLng = Math.min(...lngs);
        const bMaxLng = Math.max(...lngs);
        
        const latDiff = Math.max(0.005, bMaxLat - bMinLat);
        const lngDiff = Math.max(0.005, bMaxLng - bMinLng);
        
        minLat = bMinLat - latDiff * 0.3;
        maxLat = bMaxLat + latDiff * 0.3;
        minLng = bMinLng - lngDiff * 0.3;
        maxLng = bMaxLng + lngDiff * 0.3;
      }
    }
    
    const latSpan = maxLat - minLat || 0.0280;
    const lngSpan = maxLng - minLng || 0.0400;

    // Compile smooth heights matrix
    const heights: number[][] = [];
    for (let r = 0; r <= gridSize; r++) {
      heights[r] = [];
      for (let c = 0; c <= gridSize; c++) {
        // Base rolling terrain - extremely smooth and subtle, no jagged waves
        const distFromCenter = Math.sqrt(Math.pow(r - gridSize / 2, 2) + Math.pow(c - gridSize / 2, 2));
        let h = Math.sin(r * 0.12) * Math.cos(c * 0.12) * 2 * dpr;

        // Perfect dome decay
        h -= distFromCenter * 0.4 * dpr;

        // Apply active hotspots with smooth bell curve / Gaussian radial interpolation
        hotspots.forEach(hotspot => {
          // Normalize lat and lng dynamically into grid indices
          const normRow = ((hotspot.lat - minLat) / latSpan) * gridSize;
          const normCol = ((hotspot.lng - minLng) / lngSpan) * gridSize;

          const dist = Math.sqrt(Math.pow(r - normRow, 2) + Math.pow(c - normCol, 2));

          // Premium broad Gaussian sigma for beautifully smooth, non-spiky domes
          const sigma = 6.2;
          const influence = Math.exp(-Math.pow(dist, 2) / (2 * Math.pow(sigma, 2)));

          // Amplitude based on risk score
          const amplitude = (hotspot.riskScore - 25) * 1.6 * dpr;
          h += amplitude * influence * animProgress;
        });

        heights[r][c] = h;
      }
    }

    // 1. Draw floor grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 0.5 * dpr;
    for (let i = 0; i <= gridSize; i += 5) {
      ctx.beginPath();
      const pStart = project(-gridOffset + i * spacing, -30 * dpr, -gridOffset);
      const pEnd = project(-gridOffset + i * spacing, -30 * dpr, gridOffset);
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();

      ctx.beginPath();
      const pStart2 = project(-gridOffset, -30 * dpr, -gridOffset + i * spacing);
      const pEnd2 = project(gridOffset, -30 * dpr, -gridOffset + i * spacing);
      ctx.moveTo(pStart2.x, pStart2.y);
      ctx.lineTo(pEnd2.x, pEnd2.y);
      ctx.stroke();
    }

    // Draw sweep concentric circles
    ctx.strokeStyle = floorCircleColor;
    ctx.lineWidth = 1 * dpr;
    [0.4, 0.7, 1.0].forEach(multiplier => {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2 + 0.1; a += 0.08) {
        const rx = Math.cos(a) * gridOffset * multiplier;
        const rz = Math.sin(a) * gridOffset * multiplier;
        const pt = project(rx, -30 * dpr, rz);
        if (a === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    });

    // 2. Draw 3D Solid, smooth gradient filled terrain
    const stepRow = Math.cos(angleY) > 0 ? 1 : -1;
    const stepCol = Math.sin(angleY) > 0 ? 1 : -1;

    const startRow = stepRow === 1 ? 0 : gridSize - 1;
    const endRow = stepRow === 1 ? gridSize : -1;
    const startCol = stepCol === 1 ? 0 : gridSize - 1;
    const endCol = stepCol === 1 ? gridSize : -1;

    // Standard high-quality light angle for soft shadows
    const Lx = 0.3;
    const Ly = 0.9;
    const Lz = -0.3;

    for (let r = startRow; r !== endRow; r += stepRow) {
      for (let c = startCol; c !== endCol; c += stepCol) {
        const x0 = -gridOffset + c * spacing;
        const z0 = -gridOffset + r * spacing;
        const x1 = x0 + spacing;
        const z1 = z0 + spacing;

        const h00 = heights[r][c];
        const h10 = heights[r][c + 1];
        const h11 = heights[r + 1][c + 1];
        const h01 = heights[r + 1][c];

        const p00 = project(x0, h00, z0);
        const p10 = project(x1, h10, z0);
        const p11 = project(x1, h11, z1);
        const p01 = project(x0, h01, z1);

        // Calculate surface normal
        const dy_right = h10 - h00;
        const dy_down = h01 - h00;

        const Nx = -spacing * dy_right;
        const Ny = spacing * spacing;
        const Nz = -spacing * dy_down;

        const normalLen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1;
        const nx = Nx / normalLen;
        const ny = Ny / normalLen;
        const nz = Nz / normalLen;

        const dot = nx * Lx + ny * Ly + nz * Lz;
        const shade = Math.max(0.3, Math.min(1.0, dot));

        const avgH = (h00 + h10 + h11 + h01) / (4 * dpr);

        // Premium high-contrast minimalist gradient colors (Teal to emerald)
        let rVal = 16, gVal = 185, bVal = 129; // emerald-500
        let opacity = 0.08;

        if (avgH > 25) {
          // Critical: Vibrant coral rose
          rVal = 244; gVal = 63; bVal = 94; // rose-500
          opacity = 0.28;
        } else if (avgH > 10) {
          // Warn: Gold amber
          rVal = 245; gVal = 158; bVal = 11; // amber-500
          opacity = 0.18;
        } else if (avgH > 2) {
          // Normal: Cyan
          rVal = 6; gVal = 182; bVal = 212; // cyan-500
          opacity = 0.12;
        }

        const finalR = Math.floor(rVal * shade);
        const finalG = Math.floor(gVal * shade);
        const finalB = Math.floor(bVal * shade);

        // Draw smooth filled cell face
        ctx.fillStyle = `rgba(${finalR}, ${finalG}, ${finalB}, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fill();

        // Draw super-fine minimalist mesh wires - very subtle opacity to look elegant
        ctx.strokeStyle = terrainStrokeColor;
        ctx.lineWidth = 0.4 * dpr;
        ctx.stroke();

        // Draw beautiful glowing neon topographic contour lines occasionally
        if (avgH > 5 && Math.floor(avgH) % 12 === 0) {
          ctx.strokeStyle = `rgba(${rVal}, ${gVal}, ${bVal}, 0.4)`;
          ctx.lineWidth = 0.8 * dpr;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.stroke();
        }
      }
    }

    // 3. Render tactical indicators and neon beacon points
    hotspots.forEach(hotspot => {
      const normRow = ((hotspot.lat - minLat) / latSpan) * gridSize;
      const normCol = ((hotspot.lng - minLng) / lngSpan) * gridSize;

      const rInt = Math.floor(Math.max(0, Math.min(gridSize, normRow)));
      const cInt = Math.floor(Math.max(0, Math.min(gridSize, normCol)));
      const peakH = heights[rInt]?.[cInt] || 15;

      const x = -gridOffset + normCol * spacing;
      const z = -gridOffset + normRow * spacing;

      const pBase = project(x, -30 * dpr, z);
      const pPeak = project(x, peakH, z);

      const isCritical = hotspot.riskScore >= 80;
      const color = isCritical ? "#f43f5e" : "#eab308";

      // Glow effect on floor base
      const floorGrad = ctx.createRadialGradient(pBase.x, pBase.y, 1, pBase.x, pBase.y, 25 * dpr);
      floorGrad.addColorStop(0, `${color}25`);
      floorGrad.addColorStop(1, "transparent");
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.ellipse(pBase.x, pBase.y, 25 * dpr * pulseScale, 10 * dpr * pulseScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft vertical laser projection line
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(pBase.x, pBase.y);
      ctx.lineTo(pPeak.x, pPeak.y);
      ctx.stroke();

      // Smooth glow dome on peak (No rough lines!)
      const peakGrad = ctx.createRadialGradient(pPeak.x, pPeak.y, 1, pPeak.x, pPeak.y, 14 * dpr);
      peakGrad.addColorStop(0, "#ffffff");
      peakGrad.addColorStop(0.3, color);
      peakGrad.addColorStop(1, "transparent");
      ctx.fillStyle = peakGrad;
      ctx.beginPath();
      ctx.arc(pPeak.x, pPeak.y, 14 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Floating telemetry label overlay
      if (pPeak.x > 30 && pPeak.x < width - 30 && pPeak.y > 40 && pPeak.y < height - 20) {
        const text = `${hotspot.category.toUpperCase()} • RISK ${hotspot.riskScore}%`;
        ctx.font = `bold ${8 * dpr}px var(--font-mono, monospace)`;
        const textW = ctx.measureText(text).width;

        const bx = pPeak.x - textW / 2 - 8 * dpr;
        const by = pPeak.y - 28 * dpr;
        const bw = textW + 16 * dpr;
        const bh = 14 * dpr;

        // Custom cyber-pill
        ctx.fillStyle = isDark ? "rgba(15, 15, 18, 0.95)" : "rgba(255, 255, 255, 0.95)";
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(9, 9, 11, 0.08)";
        ctx.lineWidth = 0.5 * dpr;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6 * dpr);
        ctx.fill();
        ctx.stroke();

        // Print text
        ctx.fillStyle = isDark ? "#e4e4e7" : "#09090b";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(text, pPeak.x, by + bh / 2 + 0.5 * dpr);
      }
    });

  }, [hotspots, angleX, angleY, zoom, animProgress, pulseScale]);

  // Mouse handlers for dragging 3D orbit
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setAngleY(prev => (prev - dx * 0.005) % (Math.PI * 2));
    setAngleX(prev => Math.min(-0.2, Math.max(-1.0, prev - dy * 0.005)));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative select-none cursor-grab active:cursor-grabbing flex flex-col justify-end overflow-hidden rounded-2xl bg-surface-900/40"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top HUD bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-hairline shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <Cpu className="w-3.5 h-3.5 text-primary" />
        <span className="text-[9px] font-mono font-medium tracking-wider text-text-secondary uppercase">
          Predictive Terrain Model <span className="opacity-40">|</span> <span className="text-primary font-bold">Active Map projection</span>
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 bg-card/90 backdrop-blur-md p-1.5 rounded-2xl border border-hairline shadow-lg">
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(2.0, z + 0.15)); }}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-700/50 rounded-xl transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.5, z - 0.15)); }}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-700/50 rounded-xl transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsRotating(!isRotating); }}
          className={`p-1.5 rounded-xl transition cursor-pointer ${isRotating ? "text-primary bg-primary/10" : "text-text-secondary hover:text-text-primary hover:bg-surface-700/50"}`}
          title="Toggle Auto Rotation"
        >
          <RotateCcw className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} style={{ animationDuration: "16s" }} />
        </button>
      </div>

      {/* Dynamic HUD tip */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex gap-1.5 items-center bg-card/85 backdrop-blur-md border border-hairline px-3 py-1 rounded-full text-[9px] font-mono text-text-secondary shadow-sm">
        <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        <span>Drag map canvas to rotate perspective • scroll hotspots to reveal risk terrain</span>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block z-[1]" />
    </div>
  );
}
