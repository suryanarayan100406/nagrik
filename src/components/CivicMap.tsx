import React, { useState, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Issue, GeoLocation } from "../types";
import { CENTER_LAT, CENTER_LNG } from "../data";
import { Compass, MapPin } from "lucide-react";

export const SEVERITY_COLORS = {
  low: "#6FCF97",       // green
  medium: "#F2C94C",    // gold
  high: "#FF7A18",      // orange
  critical: "#E4572E"   // red
};

interface CivicMapProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  selectedIssue: Issue | null;
  predictiveMode?: boolean; // If true, render hotspots predicted by agent
  predictedHotspots?: Array<{ lat: number; lng: number; category: string; riskScore: number; reasoning: string }>;
  reportCoordinates?: GeoLocation | null;
  onReportCoordinatesChange?: (coords: GeoLocation) => void;
  interactiveReportSelection?: boolean; // if true, user is positioning their report pin
  focusKey?: number;
}

export default function CivicMap({
  issues,
  onSelectIssue,
  selectedIssue,
  predictiveMode = false,
  predictedHotspots = [],
  reportCoordinates,
  onReportCoordinatesChange,
  interactiveReportSelection = false,
  focusKey
}: CivicMapProps) {
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<"osm" | "dark">("osm");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    
    // Safety check to handle double mounts or hot-reloading smoothly
    if (container && (container as any)._leaflet_id) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet map removal warning:", e);
        }
        mapInstanceRef.current = null;
      }
      delete (container as any)._leaflet_id;
      container.innerHTML = "";
    }

    if (!mapInstanceRef.current) {
      const map = L.map(container, {
        center: [CENTER_LAT, CENTER_LNG],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Force call invalidateSize so that the map redraws when loaded inside dynamically rendering components or tabs
    const resizeTimeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(resizeTimeout);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet clean-up warning:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Map Style
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapStyle === "dark") {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
      attribution: attribution
    }).addTo(map);
  }, [mapStyle]);

  // Geocoding Search using OpenStreetMap's free Nominatim service
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.5 });
          }

          if (interactiveReportSelection && onReportCoordinatesChange) {
            onReportCoordinatesChange({ lat: latitude, lng: longitude });
          }
        } else {
          alert("No matching locations found for: " + searchQuery);
        }
      }
    } catch (err) {
      console.error("Geocoding lookup failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle map clicks for reporting coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (interactiveReportSelection && onReportCoordinatesChange) {
        onReportCoordinatesChange({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [interactiveReportSelection, onReportCoordinatesChange]);

  // Sync Active Map Elements (Markers, Pins)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers completely
    Object.keys(markersRef.current).forEach(key => {
      markersRef.current[key]?.remove();
    });
    markersRef.current = {};

    if (predictiveMode) {
      // Dynamic Predictive Hotspots Overlay
      predictedHotspots.forEach((hotspot, idx) => {
        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center w-full h-full";
        el.innerHTML = `
          <div class="absolute w-12 h-12 bg-indigo-500/25 border border-indigo-500/50 rounded-full animate-ping" style="animation-duration: 2s"></div>
          <div class="relative w-9 h-9 rounded-full bg-slate-950 border-2 border-indigo-400 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-300 shadow-xl">
            ${hotspot.riskScore}%
          </div>
        `;

        const marker = L.marker([hotspot.lat, hotspot.lng], {
          icon: L.divIcon({
            html: el,
            className: "custom-predictive-marker",
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-xl max-w-[220px] text-white">
            <h4 class="font-bold text-indigo-400 text-[10px] mb-1 font-mono tracking-wider">AI PREDICTIVE INSIGHT</h4>
            <div class="text-[11px] text-slate-200 leading-normal mb-1 font-sans">${hotspot.category} Risk Spot</div>
            <p class="text-[10px] text-slate-400 font-sans">${hotspot.reasoning}</p>
            <div class="mt-2 text-[9px] font-mono text-indigo-300 bg-indigo-500/10 inline-block px-1.5 py-0.5 rounded">Risk Index: ${hotspot.riskScore}%</div>
          </div>
        `, {
          closeButton: false,
          className: "custom-leaflet-popup"
        });

        markersRef.current[`predictive-${idx}`] = marker;
      });
    } else if (interactiveReportSelection && reportCoordinates) {
      // Pin for Reports - themed with Emerald
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center w-full h-full";
      el.innerHTML = `
        <div class="absolute w-12 h-12 bg-[#059669]/30 rounded-full animate-pulse"></div>
        <div class="relative w-9 h-9 rounded-full bg-[#059669] border-2 border-white flex items-center justify-center shadow-xl text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;

      const marker = L.marker([reportCoordinates.lat, reportCoordinates.lng], {
        draggable: true,
        icon: L.divIcon({
          html: el,
          className: "custom-report-pin",
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      }).addTo(map);

      marker.on("dragend", (e: any) => {
        const latlng = e.target.getLatLng();
        if (onReportCoordinatesChange) {
          onReportCoordinatesChange({ lat: latlng.lat, lng: latlng.lng });
        }
      });

      markersRef.current["report-target"] = marker;
      map.panTo([reportCoordinates.lat, reportCoordinates.lng]);
    } else {
      // Standard Civic Issues Pins - Sized by Severity with thin white stroke and drop shadow
      issues.forEach((issue) => {
        const isSelected = selectedIssue?.id === issue.id;
        const color = SEVERITY_COLORS[issue.severity] || "#059669";

        // Size by severity: Low = 12px, Medium = 16px, High = 20px, Critical = 24px
        const sizes = { low: 14, medium: 18, high: 22, critical: 26 };
        const baseSize = sizes[issue.severity] || 18;
        const size = isSelected ? baseSize + 4 : baseSize;

        // Pulse glow ring sized by witness count (more witnesses = bigger/brighter ring)
        const witnessCount = issue.verifications || 0;
        const glowRadius = Math.min(50, 20 + witnessCount * 6);

        const el = document.createElement("div");
        el.className = "relative flex items-center justify-center w-full h-full";
        el.innerHTML = `
          <!-- Sized witness glowing pulse ring -->
          <div class="absolute rounded-full animate-pulse transition-all duration-500" 
               style="width: ${glowRadius}px; height: ${glowRadius}px; background: radial-gradient(circle, ${color}25 0%, ${color}00 75%); border: 1.5px solid ${color}30; box-shadow: 0 0 14px ${color}20"></div>
          
          <!-- Inner core dot -->
          <div class="relative rounded-full flex items-center justify-center transition-all duration-300 border border-white/80 shadow-lg" 
               style="width: ${size}px; height: ${size}px; background-color: ${color}; transform: ${isSelected ? "scale(1.2)" : "scale(1)"}; box-shadow: 0 0 8px ${color}60">
            <div class="w-1.5 h-1.5 rounded-full bg-white shadow-inner"></div>
          </div>
        `;

        const marker = L.marker([issue.geo.lat, issue.geo.lng], {
          icon: L.divIcon({
            html: el,
            className: "custom-glowing-issue",
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            popupAnchor: [0, -15]
          })
        }).addTo(map);

        // Bind stylized popup detailing the civic report
        marker.bindPopup(`
          <div class="p-3 bg-surface-800 text-text-primary rounded-xl max-w-[240px] shadow-xl border border-hairline font-sans">
            <div class="flex items-center gap-1.5 mb-1.5 justify-between">
              <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-mono uppercase font-black tracking-wider">${issue.category}</span>
              <span class="text-[9px] font-mono text-text-tertiary">Severity: <span class="font-bold capitalize" style="color: ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS] || '#fff'}">${issue.severity}</span></span>
            </div>
            <h4 class="font-bold text-xs mb-1 text-text-primary leading-snug truncate">${issue.title}</h4>
            <p class="text-[10px] text-text-secondary leading-normal mb-1.5 truncate">${issue.address}</p>
            <div class="flex items-center justify-between border-t border-hairline pt-1.5 mt-1">
              <span class="px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase font-black bg-primary/5 text-primary">Status: ${issue.status}</span>
              <span class="text-[9px] font-mono text-text-tertiary font-bold">${issue.verifications} witnesses</span>
            </div>
          </div>
        `, {
          closeButton: false,
          className: "custom-leaflet-popup",
          autoPan: false
        });

        marker.on("click", () => {
          onSelectIssue(issue);
        });

        markersRef.current[issue.id] = marker;
      });
    }
  }, [issues, selectedIssue, predictiveMode, predictedHotspots, reportCoordinates, interactiveReportSelection]);

  // Separate effect to handle flyTo focus transitions and popups cleanly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIssue || predictiveMode || interactiveReportSelection) return;

    const targetCoords: [number, number] = [selectedIssue.geo.lat, selectedIssue.geo.lng];

    // Delay invalidating size and flying to the point slightly to allow DOM layouts/transitions to finish.
    // This completely resolves Leaflet offset/centering bugs when container sizes dynamically change.
    const timer = setTimeout(() => {
      const currentMap = mapInstanceRef.current;
      if (!currentMap) return;

      currentMap.invalidateSize();

      // flyTo is extremely robust for precise, smooth zoom-in (level 18) at the exact target coordinates
      currentMap.flyTo(targetCoords, 18, {
        animate: true,
        duration: 1.0
      });

      // Open the marker's popup exactly after the flyTo flight animation finishes
      const popupTimer = setTimeout(() => {
        if (markersRef.current[selectedIssue.id]) {
          markersRef.current[selectedIssue.id].openPopup();
        }
      }, 1050);

      return () => clearTimeout(popupTimer);
    }, 60);

    return () => clearTimeout(timer);
  }, [selectedIssue, focusKey, predictiveMode, interactiveReportSelection]);

  return (
    <div className="relative w-full h-[480px] md:h-full min-h-[445px] rounded-2xl overflow-hidden border border-hairline bg-surface-800 shadow-2xl flex flex-col premium-card">
      {/* Top Map Label */}
      {!interactiveReportSelection && (
        <div className="absolute top-4 left-4 z-[1000] hidden sm:flex gap-2 items-center bg-surface-800/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-hairline shadow-lg">
          <Compass className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold text-text-primary">
            {predictiveMode ? "AI Spatial Hotspots Map" : "Neighborhood Reports Map"}
          </span>
        </div>
      )}

      {/* Search & Style Controls Panel */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col sm:flex-row gap-2 max-w-full">
        <form onSubmit={handleSearch} className="flex bg-surface-800/95 backdrop-blur-md p-1 rounded-xl border border-hairline shadow-lg">
          <input
            type="text"
            placeholder="Search city/address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-text-primary px-3 py-1.5 focus:outline-none w-36 sm:w-48 placeholder-text-tertiary font-sans"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-3 py-1.5 bg-primary hover:bg-primary/80 disabled:bg-surface-700 rounded-lg text-[10px] font-bold text-white transition cursor-pointer flex items-center gap-1 font-sans shrink-0"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </form>

        <div className="bg-surface-800/95 backdrop-blur-md p-1 rounded-xl border border-hairline shadow-lg flex gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setMapStyle("osm")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              mapStyle === "osm" 
                ? "bg-primary text-white font-bold" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => setMapStyle("dark")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              mapStyle === "dark" 
                ? "bg-primary text-white font-bold" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Floating status label */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-surface-800/95 backdrop-blur border border-hairline px-3 py-1.5 rounded-xl text-[10px] font-mono text-text-secondary flex items-center gap-2 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <span>LIVE COMMUNITY INCIDENTS ACTIVE</span>
        </div>
      </div>

      {/* Active Selection Details Box overlay */}
      {selectedIssue && !interactiveReportSelection && (
         <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-96 z-[1000] bg-surface-800/95 backdrop-blur-lg border border-hairline p-4 rounded-xl shadow-lg flex gap-3 text-text-primary">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-hairline bg-surface-900">
            <img 
              src={selectedIssue.photoBefore} 
              alt={selectedIssue.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary font-bold">
                {selectedIssue.category}
              </span>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                style={{ 
                  backgroundColor: `${SEVERITY_COLORS[selectedIssue.severity]}25`, 
                  color: SEVERITY_COLORS[selectedIssue.severity],
                  border: `1px solid ${SEVERITY_COLORS[selectedIssue.severity]}40`
                }}
              >
                {selectedIssue.severity}
              </span>
            </div>
            <h4 className="text-sm font-semibold truncate hover:text-primary cursor-pointer" onClick={() => onSelectIssue(selectedIssue)}>
              {selectedIssue.title}
            </h4>
            <p className="text-xs text-text-secondary truncate mt-0.5">{selectedIssue.address}</p>
          </div>
          <button 
            onClick={() => onSelectIssue(selectedIssue)}
            className="self-center px-3.5 py-2 rounded-xl bg-primary hover:opacity-90 text-xs font-bold text-white transition shadow-md shrink-0 cursor-pointer"
          >
            View Details
          </button>
        </div>
      )}

      {/* Report Mode Helper */}
      {interactiveReportSelection && (
        <div className="absolute top-16 left-4 z-[1000] max-w-xs bg-surface-800/95 backdrop-blur border border-hairline p-3.5 rounded-xl text-xs text-text-secondary shadow-lg font-sans">
          <div className="flex gap-2 items-center mb-1">
            <MapPin className="w-4 h-4 text-primary animate-bounce" />
            <span className="font-bold text-text-primary">Target Geolocation</span>
          </div>
          <p className="text-[11px] text-text-secondary mb-2">Drag the pin or click on the map to specify the exact issue location.</p>
          <div className="bg-surface-900 p-2.5 rounded text-[10px] font-mono space-y-1 text-text-secondary border border-hairline">
            <div>Latitude: <span className="text-primary font-bold">{reportCoordinates?.lat.toFixed(6) || "0.00"}</span></div>
            <div>Longitude: <span className="text-primary font-bold">{reportCoordinates?.lng.toFixed(6) || "0.00"}</span></div>
          </div>
        </div>
      )}

      {/* Pure, Fullscreen Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] bg-surface-900 flex-grow z-[1]" />
    </div>
  );
}
