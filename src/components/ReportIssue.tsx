import React, { useState, useEffect } from "react";
import { GeoLocation, Issue, AgentStep, UserProfile, Ward } from "../types";
import { DEPARTMENTS, getWardByGeo, CENTER_LAT, CENTER_LNG } from "../data";
import CivicMap from "./CivicMap";
import { Compass, Camera, Upload, AlertCircle, Sparkles, Loader2, CheckCircle, LogIn, Lock } from "lucide-react";

interface ReportIssueProps {
  onIssueCreated: (newIssue: Issue) => void;
  onNavigateToDetail: (issueId: string) => void;
  user: UserProfile | null;
  onNavigateToProfile: () => void;
  wards: Ward[];
}

export default function ReportIssue({ onIssueCreated, onNavigateToDetail, user, onNavigateToProfile, wards }: ReportIssueProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [categoryHint, setCategoryHint] = useState<string>("");
  const submittingRef = React.useRef(false);
  const [geo, setGeo] = useState<GeoLocation>({ lat: CENTER_LAT, lng: CENTER_LNG });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  
  // Dynamic Reverse Geocoding using free OpenStreetMap Nominatim API
  useEffect(() => {
    let active = true;
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${geo.lat}&lon=${geo.lng}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data && data.display_name) {
            setAddressLine(data.display_name);
          }
        }
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
      }
    };
    fetchAddress();
    return () => {
      active = false;
    };
  }, [geo.lat, geo.lng]);

  // High fidelity step-by-step diagnostic logging
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [currentStepName, setCurrentStepName] = useState("");

  // Grab user's geolocation smoothly
  const triggerGeolocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        setAddressLine(`GPS Fixed: near Latitude ${position.coords.latitude.toFixed(4)}, Longitude ${position.coords.longitude.toFixed(4)}`);
      },
      (error) => {
        console.warn("Geolocation failed, falling back to default centerpiece coordinates:", error);
        setIsLocating(false);
        setAddressLine("Centered on Bengaluru Core Sector (fallback)");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Helper to downscale base64 image on client so the payload is light and never hangs
  const compressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          callback(compressedBase64);
        } else {
          callback(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Convert uploaded image file to tidy Base64 (with real-time canvas compression)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name || "uploaded_image.jpg");
    compressImage(file, (compressedBase64) => {
      setPhoto(compressedBase64);
    });
  };

  // Drag and Drop files support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoName(file.name || "dropped_image.jpg");
      compressImage(file, (compressedBase64) => {
        setPhoto(compressedBase64);
      });
    }
  };

  // Trigger Triage + Routing swarm
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!photo) {
      alert("Please upload or capture a photo first");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setAgentSteps([]);

    const addLogLine = (agent: string, line: string, msToWait = 1200) => {
      setCurrentStepName(agent);
      setAgentSteps(prev => [...prev, `[${agent.toUpperCase()}] — ${line}`]);
      const actualWait = Math.min(msToWait, 80); // Quick micro-delay for terminal effect without holding up the user
      return new Promise(resolve => setTimeout(resolve, actualWait));
    };

    try {
      // 1. Swarm boot
      await addLogLine("Nagrik Core", "Initializing report parameters...", 1000);
      await addLogLine("Nagrik Core", "Initiating classification models...", 1000);

      // 2. Call Triage agent API
      await addLogLine("Auditor Agent", "Evaluating uploaded photograph for category and severity...", 800);
      await addLogLine("Auditor Agent", "Calling image detection core to evaluate public hazards...", 1200);

      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoBefore: photo, geo, fileName: photoName, categoryHint })
      });

      if (!triageRes.ok) {
        throw new Error("Triage Agent failed during vision classification");
      }

      const triageData = await triageRes.json();
      await addLogLine(
        "Auditor Agent", 
        `Results: Category='${triageData.category}', Severity='${triageData.severity}' (Hazard: ${triageData.dangerScore}/100)`,
        1500
      );
      await addLogLine("Auditor Agent", `Identified Title: "${triageData.title}"`, 1000);

      // 3. Routing Agent
      await addLogLine("Routing Agent", "Resolving municipal jurisdiction and Ward boundaries...", 1200);
      
      const resolvedWard = getWardByGeo(geo.lat, geo.lng, wards);
      // Map category to department
      const matchDept = DEPARTMENTS[triageData.category as keyof typeof DEPARTMENTS] || DEPARTMENTS["Other"];

      await addLogLine(
        "Routing Agent",
        `Resolved coordinates to: ${resolvedWard.name}. Administrative Chief: ${resolvedWard.officer}`,
        1400
      );

      await addLogLine("Routing Agent", `Generating candidate complaint citation via Gemini draft tools...`, 1200);

      const routingRes = await fetch("/api/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: triageData.category,
          geo,
          department: matchDept.name,
          officer: resolvedWard.officer
        })
      });

      if (!routingRes.ok) {
        throw new Error("Routing Agent failed to draft official citation");
      }

      const routingData = await routingRes.json();
      await addLogLine("Routing Agent", "Polite, citation-style complaint drafted and formatted successfully.", 1000);

      // 4. Create local Issue Object
      const issueId = "issue-" + Date.now();
      const dnaId = `NAG-2026-${Math.floor(100 + Math.random() * 900)}`;

      // Construct Initial Logs
      const steps: AgentStep[] = [
        {
          id: "step-1",
          agent: "Triage Agent",
          action: "Vision Diagnosis & Classification",
          reasoning: `Successfully analyzed snapshot. Decided on class: ${triageData.category}, Severity level: ${triageData.severity}, Hazard score indicator: ${triageData.dangerScore}/100. ${triageData.description}`,
          timestamp: new Date().toISOString()
        },
        {
          id: "step-2",
          agent: "Routing Agent",
          action: "Resolution & SLA Allocation",
          toolCall: "resolveJurisdiction(lat, lng)",
          args: geo,
          reasoning: `Mapped coordinates to ${resolvedWard.name}. Dispatched automated ticket and official complaint pack to Senior Officer ${resolvedWard.officer}. Assigned department: ${matchDept.name}. Set standard 7-day SLA.`,
          timestamp: new Date(Date.now() + 1000).toISOString()
        }
      ];

      const newIssue: Issue = {
        id: issueId,
        dnaId,
        title: triageData.title,
        description: triageData.description,
        category: triageData.category,
        severity: triageData.severity,
        dangerScore: triageData.dangerScore,
        photoBefore: photo,
        photoAfter: null,
        geo,
        address: addressLine || `Sector Road, ${resolvedWard.name.split("-")[1]?.trim() || "Indiranagar"}`,
        wardId: resolvedWard.id,
        departmentId: matchDept.id,
        status: "routed",
        slaDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Exactly 7 days from now
        escalationLevel: 0,
        verifications: 1,
        complaintText: routingData.complaintText,
        rtiText: "",
        socialPostText: "",
        agentLog: steps,
        createdAt: new Date().toISOString()
      };

      await addLogLine("Nagrik Core", "Writing report to database...", 800);
      
      // Save it
      onIssueCreated(newIssue);
      await addLogLine("Nagrik Core", "Successfully saved. Redirecting to details...", 800);

      submittingRef.current = false;
      setIsSubmitting(false);
      onNavigateToDetail(issueId);

    } catch (err: any) {
      console.error(err);
      alert("Submission agent failed: " + err.message);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!user || !user.email) {
    return (
      <div className="w-full max-w-md mx-auto py-24 px-4 text-center animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight text-slate-800 font-sans">Citizenship Log In Required</h2>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Filing municipal grievances requires an active authenticated citizen profile. Please log in or register your account to continue.
            </p>
          </div>
          <button
            onClick={onNavigateToProfile}
            className="w-full py-2.5 px-4 bg-civic-primary hover:opacity-95 transition rounded-xl font-mono font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            Go to Profile Login Portal
          </button>
        </div>
      </div>
    );
  }  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-2 pb-12 animate-fade-in px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2 font-display">
            File New Civic Incident
          </h2>
          <p className="text-text-secondary text-sm mt-1.5 font-sans leading-relaxed">
            Upload a snapshot. Our system triages, routes, and formats standard complaints instantly.
          </p>
        </div>
      </div>

      {isSubmitting ? (
        /* MULTI-AGENT SWARM PROGRESS CONSOLE */
        <div className="bg-civic-card p-6 rounded-2xl border border-civic-muted/20 flex flex-col items-center justify-center min-h-[400px] text-center shadow-sm">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-civic-accent/10 blur-xl rounded-full"></div>
            <Loader2 className="w-16 h-16 text-civic-accent animate-spin relative" />
          </div>
          
          <h3 className="text-lg font-bold text-civic-text mb-2 animate-pulse uppercase tracking-widest font-mono">
            {currentStepName || "Processing"} RUNNING
          </h3>
          <p className="text-civic-muted text-sm max-w-md mb-8">
            Please keep this tab open. Classifier models are evaluating the visual report and verifying routing criteria.
          </p>

          <div className="w-full max-w-xl bg-civic-bg border border-civic-muted/20 rounded-xl p-4 text-left font-mono text-xs text-civic-accent space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
            {agentSteps.map((step, idx) => (
              <div key={idx} className="flex gap-2 items-start border-l border-civic-accent/20 pl-2 leading-relaxed text-civic-text">
                <span className="text-civic-accent select-none font-bold">&gt;</span>
                <span>{step}</span>
              </div>
            ))}
            <div className="flex gap-2 items-center text-civic-muted animate-pulse pl-2">
              <span>&gt;</span>
              <span>Awaiting telemetry stream...</span>
            </div>
          </div>
        </div>
      ) : (
        /* FORM COMPONENT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Photo upload */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-5 flex flex-col flex-1 shadow-sm">
              <span className="text-xs font-mono font-semibold text-civic-accent uppercase tracking-widest block mb-3">
                Step 1: Visual Evidence
              </span>
              
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-civic-muted/20 hover:border-civic-primary/50 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all bg-civic-bg/50 aspect-square min-h-[220px]"
              >
                {photo ? (
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <img 
                      src={photo} 
                      alt="Civic Issue Snapshot" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhoto(null);
                      }}
                      className="absolute bottom-3 right-3 bg-civic-accent hover:bg-civic-accent/95 hover:scale-105 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-civic-bg border border-civic-muted/20 flex items-center justify-center mx-auto text-civic-primary shadow-sm">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-civic-text">Drag & drop your photo</p>
                      <p className="text-xs text-civic-muted mt-1">or click to browse local files</p>
                    </div>
                    <label className="inline-block px-4 py-2 bg-civic-primary hover:bg-civic-primary/90 text-xs font-bold text-white rounded-lg cursor-pointer shadow transition mt-2">
                      <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                      Select Image File
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Optional Category Hint selector */}
              <div className="mt-4 space-y-1.5">
                <label className="text-xs font-semibold text-civic-text flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-civic-accent" />
                  <span>Category Hint (Recommended)</span>
                </label>
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="w-full bg-civic-bg border border-civic-muted/20 focus:border-civic-primary rounded-lg p-2.5 text-xs text-civic-text focus:outline-none focus:ring-1 focus:ring-civic-primary cursor-pointer"
                >
                  <option value="">-- Let AI Auto-detect from image --</option>
                  <option value="Roads">Roads (Potholes, surface cracks, sidewalk damage)</option>
                  <option value="Drainage">Drainage (Clogged storm drains, open sewer lines)</option>
                  <option value="Electricity/Streetlights">Electricity / Streetlights (Dark streets, broken poles)</option>
                  <option value="Sanitation">Sanitation (Trash piles, litter, garbage dumps)</option>
                  <option value="Water">Water (Active leak, pipe bursts, distribution issue)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mt-4 flex gap-2 text-[11px] text-civic-muted leading-relaxed bg-civic-bg p-3 rounded-lg border border-civic-muted/15">
                <AlertCircle className="w-4 h-4 text-civic-accent shrink-0 mt-0.5" />
                <span>Photos of the hazard assist in identifying pothole sizes, garbage pile weight, or electrical danger to optimize response.</span>
              </div>
            </div>
          </div>

          {/* Right panel: Geolocation + Map Coordinate Adjuster */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-5 shadow-sm flex flex-col flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-semibold text-civic-primary uppercase tracking-widest block">
                  Step 2: Geotag Verification
                </span>
                <button
                  type="button"
                  onClick={triggerGeolocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-civic-primary/10 hover:bg-civic-primary/20 border border-civic-primary/20 rounded-lg text-xs font-semibold text-civic-primary flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Acquiring GPS...
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 animate-spin" />
                      Auto-Grab Location
                    </>
                  )}
                </button>
              </div>

              {/* Map coordinate selection */}
              <div className="flex-1 min-h-[220px] rounded-xl overflow-hidden border border-civic-muted/20">
                <CivicMap 
                  issues={[]}
                  onSelectIssue={() => {}}
                  selectedIssue={null}
                  reportCoordinates={geo}
                  onReportCoordinatesChange={(coords) => setGeo(coords)}
                  interactiveReportSelection={true}
                />
              </div>

              {/* Location Detail Inputs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-civic-text block">Custom Address Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite CCD Café, 100 Feet Rd Main Junction"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full bg-civic-bg border border-civic-muted/20 focus:border-civic-primary rounded-lg p-2.5 text-xs text-civic-text placeholder-civic-muted focus:outline-none focus:ring-1 focus:ring-civic-primary"
                />
              </div>

              {/* Action submission button */}
              <button
                onClick={handleSubmit}
                disabled={!photo || isSubmitting}
                className="w-full py-3 px-4 bg-civic-primary hover:bg-civic-primary/95 disabled:bg-civic-bg disabled:text-civic-muted disabled:cursor-not-allowed font-semibold text-sm rounded-xl text-white transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {!photo ? (
                  "Please Upload Visual Evidence"
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-civic-secondary" />
                    Submit Report & Format Alert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
