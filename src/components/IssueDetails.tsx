import React, { useState, useEffect } from "react";
import { Issue, AgentStep, Ward, UserProfile } from "../types";
import { SEVERITY_COLORS } from "./CivicMap";
import { 
  Users, CheckCircle2, AlertTriangle, Clock, Share2, ArrowRight, FileText, Send, 
  ChevronUp, ChevronDown, Award, Trash, Shield, ArrowUp, Zap, HelpCircle, Loader2, Camera, Compass
} from "lucide-react";

interface IssueDetailsProps {
  issue: Issue | null;
  onBack: () => void;
  onUpdateIssue: (updatedIssue: Issue) => void;
  onDeleteIssue?: (issueId: string) => void;
  onAwardPoints: (points: number) => void;
  wards: Ward[];
  user?: UserProfile | null;
}

export default function IssueDetails({ 
  issue, 
  onBack, 
  onUpdateIssue, 
  onDeleteIssue,
  onAwardPoints,
  wards,
  user
}: IssueDetailsProps) {
  if (!issue) {
    return (
      <div className="text-center p-12 bg-civic-bg rounded-2xl border border-civic-muted/20 text-civic-muted">
        No active issue selected. Click any pin on the map to inspect details.
      </div>
    );
  }

  const [isVerifying, setIsVerifying] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [isFixUploading, setIsFixUploading] = useState(false);
  const [fixPhoto, setFixPhoto] = useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // Expandable sections for drafted content
  const [openComplaint, setOpenComplaint] = useState(false);
  const [openRTI, setOpenRTI] = useState(false);
  const [openSocial, setOpenSocial] = useState(false);

  // Time remaining calculator helper
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isSlaOverdue, setIsSlaOverdue] = useState(false);

  // Administrative editing fields
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(issue?.title || "");
  const [editedDescription, setEditedDescription] = useState(issue?.description || "");
  const [editedCategory, setEditedCategory] = useState(issue?.category || "");
  const [editedSeverity, setEditedSeverity] = useState(issue?.severity || "low");
  const [editedStatus, setEditedStatus] = useState(issue?.status || "reported");

  useEffect(() => {
    if (issue) {
      setEditedTitle(issue.title);
      setEditedDescription(issue.description);
      setEditedCategory(issue.category);
      setEditedSeverity(issue.severity);
      setEditedStatus(issue.status);
    }
  }, [issue]);

  useEffect(() => {
    const calculateSla = () => {
      const now = new Date().getTime();
      const due = new Date(issue.slaDueAt).getTime();
      const diff = due - now;

      if (diff <= 0) {
        setTimeRemaining("SLA BREACHED (Overdue)");
        setIsSlaOverdue(true);
      } else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        setTimeRemaining(`${days}d ${hours}h remaining`);
        setIsSlaOverdue(false);
      }
    };

    calculateSla();
    const interval = setInterval(calculateSla, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [issue.slaDueAt]);

  // Raise community priority
  const handleVerifyPriority = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const updated: Issue = {
        ...issue,
        verifications: issue.verifications + 1,
        dangerScore: Math.min(100, issue.dangerScore + 2) // verified issues raise danger weight slightly
      };
      onUpdateIssue(updated);
      onAwardPoints(15); // reward standard verifier
      setIsVerifying(false);
    }, 600);
  };

  // ADVANCE TIME: Escalation Agent Trigger
  const handleSimulateEscalation = async () => {
    setIsEscalating(true);

    try {
      // Find ward metadata for matching officer/department
      const fallbackWard = { id: "ward-temp", name: "Lucknow Central Ward", officer: "Shri. Alok Singh (Chief Ward Officer)" };
      const matchedWard = wards.find(w => w.id === issue.wardId) || fallbackWard;

      const res = await fetch("/api/escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          category: issue.category,
          wardName: matchedWard.name,
          officer: matchedWard.officer,
          department: "Public Infrastructure & Health Zonal Command"
        })
      });

      if (!res.ok) {
        throw new Error("Failed to trigger Escalation Agent");
      }

      const data = await res.json();
      
      // Increment escalationLevel & assemble diagnostic logs
      const nextLevel = Math.min(3, issue.escalationLevel + 1);
      const logId = "escalation-log-" + Date.now();
      
      const newStep: AgentStep = {
        id: logId,
        agent: "Escalation Agent",
        action: `Automatic Escalation Triggered — Threat Level ${nextLevel}`,
        toolCall: "checkSLA() -> escalate() -> draftOfficialComplaint()",
        args: { currentLevel: issue.escalationLevel, breached: true },
        reasoning: `SLA timer has expired or user triggered temporal simulation. Incremented the issue's state to Level ${nextLevel}. Drafted comprehensive civic RTI file demands and target community notifications.`,
        timestamp: new Date().toISOString()
      };

      const updated: Issue = {
        ...issue,
        slaDueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Force past time to showcase overdue visually
        escalationLevel: nextLevel,
        status: issue.status === "routed" ? "acknowledged" : issue.status,
        rtiText: data.rtiText,
        socialPostText: data.socialPostText,
        agentLog: [...issue.agentLog, newStep]
      };

      onUpdateIssue(updated);
      setOpenRTI(true);
      setOpenSocial(true);
    } catch (err: any) {
      console.error(err);
      alert("Escalation failed: " + err.message);
    } finally {
      setIsEscalating(false);
    }
  };

  // Helper to downscale base64 image on client so the payload is light and matches ReportIssue's compression
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

  // Helper to process a selected or dropped file for proof-of-fix
  const processFixFile = async (file: File) => {
    setIsFixUploading(true);
    compressImage(file, async (base64Photo) => {
      setFixPhoto(base64Photo);

      try {
        // Trigger verification algorithm over both photos
        const res = await fetch("/api/verify-fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoBefore: issue.photoBefore,
            photoAfter: base64Photo
          })
        });

        if (!res.ok) {
          throw new Error("Verification Agent failed to process visual matching");
        }

        const data = await res.json();

        if (data.fixConfirmed) {
          const logId = "verify-log-" + Date.now();
          const newStep: AgentStep = {
            id: logId,
            agent: "Verification Agent",
            action: "Before/After Visual Differential Assessment",
            toolCall: "compareBeforeAfter() -> verifyFix()",
            reasoning: `Matched visual restoration parameters between before photograph and today's upload. Findings: ${data.rationale}. Update requested for Ward indices. Status marked as 'reverified'.`,
            timestamp: new Date().toISOString()
          };

          const updated: Issue = {
            ...issue,
            photoAfter: base64Photo,
            status: "reverified",
            agentLog: [...issue.agentLog, newStep]
          };

          onUpdateIssue(updated);
          onAwardPoints(150); // Big bonus for verifying a visual fix!
          alert("🎉 SUCCESS! The Verification Agent verified your Proof-of-Fix photo. 150 Community Points awarded!");
        } else {
          alert(`⚠️ Verification Unsuccessful: ${data.rationale || "The agent could not safely verify the repair work. Please upload a clearer snapshot."}`);
        }

      } catch (err: any) {
        console.error(err);
        alert("Verification failed: " + err.message);
      } finally {
        setIsFixUploading(false);
      }
    });
  };

  // FILE UPLOAD FOR PROOF-OF-FIX via picker
  const handleFixPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFixFile(file);
    }
  };

  // Drag and Drop for Fix Photo
  const handleFixDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFixDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processFixFile(file);
    }
  };

  // Bypassing identical-photo checks by drawing a beautiful green restoration patch on canvas
  const handleSimulateDemoRepair = () => {
    if (!issue.photoBefore) return;
    setIsFixUploading(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw a green translucent circle representing the patched area
        ctx.fillStyle = "rgba(16, 185, 129, 0.4)"; // Emerald-500 with opacity
        ctx.beginPath();
        ctx.arc(img.width / 2, img.height / 2, Math.min(img.width, img.height) * 0.35, 0, 2 * Math.PI);
        ctx.fill();

        // Draw a beautiful white border around the patch
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = Math.max(4, Math.floor(img.width * 0.01));
        ctx.stroke();

        // Draw a "CLEARED & REPAIRED" seal in the corner
        ctx.fillStyle = "rgba(6, 78, 59, 0.95)"; // Dark green
        ctx.fillRect(30, 30, 340, 90);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 340, 90);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px monospace";
        ctx.fillText("NAGRIK AI INSPECTOR", 50, 65);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 18px monospace";
        ctx.fillText("STATUS: VERIFIED REPAIR", 50, 95);

        const repairedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        
        // Trigger verification with this simulated repaired base64
        setTimeout(async () => {
          try {
            const res = await fetch("/api/verify-fix", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                photoBefore: issue.photoBefore,
                photoAfter: repairedBase64
              })
            });

            if (!res.ok) {
              throw new Error("Verification Agent failed to process visual matching");
            }

            const data = await res.json();

            if (data.fixConfirmed) {
              const logId = "verify-log-" + Date.now();
              const newStep: AgentStep = {
                id: logId,
                agent: "Verification Agent",
                action: "Before/After Visual Differential Assessment",
                toolCall: "compareBeforeAfter() -> verifyFix()",
                reasoning: `Matched visual restoration parameters between before photograph and today's upload. Findings: ${data.rationale}. Update requested for Ward indices. Status marked as 'reverified'.`,
                timestamp: new Date().toISOString()
              };

              const updated: Issue = {
                ...issue,
                photoAfter: repairedBase64,
                status: "reverified",
                agentLog: [...issue.agentLog, newStep]
              };

              onUpdateIssue(updated);
              onAwardPoints(150); // Big bonus for verifying a visual fix!
              alert("🎉 SUCCESS! The Verification Agent verified your Proof-of-Fix photo. 150 Community Points awarded!");
            } else {
              alert(`⚠️ Verification Unsuccessful: ${data.rationale || "The agent could not safely verify the repair work. Please upload a clearer snapshot."}`);
            }
          } catch (err: any) {
            console.error(err);
            alert("Verification failed: " + err.message);
          } finally {
            setIsFixUploading(false);
          }
        }, 1200);
      } else {
        setIsFixUploading(false);
      }
    };
    img.src = issue.photoBefore;
  };

  // Status Stepper Indexer
  const statuses = ['reported', 'routed', 'acknowledged', 'in_progress', 'fixed', 'reverified'];
  const currentStatusIdx = statuses.indexOf(issue.status);

  // Status human label formatting
  const formatStatus = (s: string) => {
    return s.replace("_", " ").toUpperCase();
  };

  // Human date formatting
  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-2 pb-16 px-4 animate-fade-in text-civic-text">
      
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-civic-muted/20 pb-4">
        <button
          onClick={onBack}
          className="px-3.5 py-2 bg-civic-card hover:bg-civic-muted/10 rounded-xl text-xs font-semibold text-civic-primary border border-civic-muted/25 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          &larr; Back to Map Tracker
        </button>
        <div className="flex gap-2">
          {onDeleteIssue && user?.email?.toLowerCase() === "surya100406@gmail.com" && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this issue card from the local tracker?")) {
                  onDeleteIssue(issue.id);
                  onBack();
                }
              }}
              className="p-2 border border-civic-muted/20 hover:border-civic-accent hover:bg-civic-accent/10 text-civic-muted hover:text-civic-accent rounded-xl transition cursor-pointer"
              title="Delete issue card"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
          <span className="px-3 py-1.5 bg-civic-card border border-civic-muted/25 rounded-xl text-xs font-mono font-semibold text-civic-muted shadow-sm">
            REF: {issue.dnaId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Visual evidence + core variables */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Photos Cards */}
          <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-mono font-bold text-civic-primary uppercase tracking-widest block">
              Visual Evidence
            </h3>

            {/* Before vs After comparison card */}
            <div className="space-y-2">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-civic-muted/20 bg-civic-bg">
                <img 
                  src={issue.photoBefore} 
                  alt="Original Incident" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 bg-[#051111]/80 backdrop-blur rounded text-[10px] font-mono uppercase font-bold text-civic-accent border border-civic-accent/10">
                  Before: Incident Blockage
                </span>
              </div>

              {issue.photoAfter ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-civic-muted/20 bg-civic-bg">
                  <img 
                    src={issue.photoAfter} 
                    alt="Repaired Incident" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 bg-[#051111]/80 backdrop-blur rounded text-[10px] font-mono uppercase font-bold text-emerald-500 border border-emerald-500/10 animate-pulse">
                    After: Verified Fix 
                  </span>
                </div>
              ) : (
                /* No after photo, interactive fix submission block */
                <div 
                  onDragOver={handleFixDragOver}
                  onDrop={handleFixDrop}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="border-2 border-dashed border-civic-muted/20 hover:border-civic-primary/50 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-civic-bg/50 py-6 cursor-pointer transition-all hover:bg-civic-bg"
                >
                  <div className="w-10 h-10 rounded-full bg-civic-card flex items-center justify-center text-civic-primary mb-3 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-civic-text text-xs font-semibold">Has this been repaired?</p>
                  <p className="text-civic-muted text-[10px] mt-1 mb-4 max-w-[220px]">
                    Drag & drop the repair photo, click to browse, or try a <strong>Simulated Repair</strong>.
                  </p>
                  
                  {isFixUploading ? (
                    <div className="text-xs text-civic-primary font-mono flex items-center gap-1.5 animate-pulse bg-civic-card px-4 py-2 rounded-xl border border-civic-primary/20">
                       <Loader2 className="w-4 h-4 animate-spin text-civic-primary" />
                      Analyzing & Comparing...
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-[280px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="flex-grow px-3 py-2 bg-civic-primary hover:bg-[#13857F] rounded-xl text-[11px] font-bold text-white transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent triggering input click
                          handleSimulateDemoRepair();
                        }}
                        className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl text-[11px] font-bold text-white transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Simulate Repair
                      </button>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFixPhotoChange} 
                    className="hidden" 
                    disabled={isFixUploading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SLA Tracking Countdown */}
          <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-civic-primary uppercase tracking-widest block">
                SLA Countdown & Level
              </span>
              {issue.status !== "reverified" && (
                <button
                  onClick={handleSimulateEscalation}
                  disabled={isEscalating}
                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-semibold text-amber-600 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  title="Simulate 7 days of elapsed time to inspect auto-escalations"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  Simulate SLA Delay
                </button>
              )}
            </div>

            <div className="bg-civic-bg p-3 rounded-xl border border-civic-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${isSlaOverdue && issue.status !== "reverified" ? "text-civic-accent animate-pulse" : "text-emerald-500"}`} />
                <div>
                  <span className="text-[10px] uppercase font-bold text-civic-muted block">SLA Target Due Limit</span>
                  <span className={`text-xs font-mono font-bold ${isSlaOverdue && issue.status !== "reverified" ? "text-civic-accent" : "text-civic-text"}`}>
                    {issue.status === "reverified" ? "CLAIM RESOLVED" : timeRemaining}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-civic-muted block">Escalation Tier</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                  issue.escalationLevel === 3 ? "bg-civic-accent/15 text-civic-accent border border-civic-accent/20" :
                  issue.escalationLevel > 0 ? "bg-amber-500/15 text-amber-600 border border-amber-500/20" : "bg-civic-muted/15 text-civic-muted"
                }`}>
                  T-Level {issue.escalationLevel}
                </span>
              </div>
            </div>

            {/* Warnings if overdue / escalated */}
            {issue.escalationLevel > 0 && issue.status !== "reverified" && (
              <div className="bg-civic-accent/10 border border-civic-accent/20 p-2.5 rounded-xl text-[10px] text-civic-accent leading-relaxed flex gap-2">
                <AlertTriangle className="w-4 h-4 text-civic-accent shrink-0 mt-0.5" />
                <span>
                  <strong>Escalation Agent Action Active:</strong> Due to unresolved SLA bounds, the system automatically drafted Right to Information requests and tag posts. Action priority multiplier raised by <strong>+{issue.escalationLevel * 40}%</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Gamification verifications element */}
          <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-civic-muted uppercase block">Community Witnesses</span>
              <span className="text-lg font-bold text-civic-text flex items-center gap-1.5 mt-0.5">
                <Users className="w-5 h-5 text-civic-primary" />
                {issue.verifications} Verifications
              </span>
            </div>
            
            {issue.status !== "reverified" && (
              <button
                disabled={isVerifying}
                onClick={handleVerifyPriority}
                className="px-3.5 py-2 bg-civic-primary hover:bg-[#13857F] hover:scale-105 rounded-xl text-xs font-bold text-white transition shadow flex items-center gap-1.5 border border-civic-primary/50 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 text-civic-secondary" />}
                Attest & Verify (+15 pts)
              </button>
            )}
          </div>

        </div>

        {/* Right Column: DNA state timeline + Agent reasoning logs */}
        <div className="md:col-span-7 space-y-6">

          {/* Visual state timeline */}
          <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold text-civic-primary uppercase tracking-widest block">
              Incident Status Workflow
            </h3>

            {/* Stepper container */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-y-4 sm:gap-x-1.5 w-full bg-civic-bg p-4 rounded-xl border border-civic-muted/20">
              {statuses.map((statusItem, idx) => {
                const isActive = currentStatusIdx >= idx;
                const isCurrent = currentStatusIdx === idx;
                return (
                  <div key={statusItem} className="flex flex-row sm:flex-col items-center flex-1 w-full sm:w-auto">
                    {/* Circle and line */}
                    <div className="flex items-center w-full sm:w-auto">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border transition ${
                        isCurrent ? "bg-civic-primary text-white border-civic-primary shadow-civic-primary/25 shadow-md scale-110" :
                        isActive ? "bg-civic-primary/10 text-civic-primary border-civic-primary/20" : "bg-civic-card text-civic-muted border-civic-muted/20"
                      }`}>
                        {idx + 1}
                      </div>
                      
                      {idx < statuses.length - 1 && (
                        <div className={`hidden sm:block h-[2px] min-w-[20px] flex-grow mx-1 opacity-70 ${
                          isActive ? "bg-civic-primary" : "bg-civic-muted/20"
                        }`}></div>
                      )}
                    </div>
                    {/* Status label text */}
                    <span className={`text-[9px] font-mono tracking-wide mt-1.5 ml-3 sm:ml-0 ${
                      isCurrent ? "text-civic-primary font-bold" : isActive ? "text-civic-text" : "text-civic-muted"
                    }`}>
                      {formatStatus(statusItem)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* General Description Grid */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-civic-text tracking-tight">{issue.title}</h2>
              <p className="text-civic-muted text-xs leading-relaxed">{issue.description}</p>
              
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono">
                <div className="bg-civic-bg p-2 rounded-lg border border-civic-muted/20">
                  <span className="text-civic-muted block">CATEGORY</span>
                  <span className="text-civic-text font-bold">{issue.category.toUpperCase()}</span>
                </div>
                <div className="bg-civic-bg p-2 rounded-lg border border-civic-muted/20">
                  <span className="text-civic-muted block">SEVERITY VALUE</span>
                  <span className="font-bold flex items-center gap-1" style={{ color: SEVERITY_COLORS[issue.severity] }}>
                    <Shield className="w-3.5 h-3.5 animate-pulse" />
                    {issue.severity.toUpperCase()} ({issue.dangerScore} pts)
                  </span>
                </div>
                <div className="bg-civic-bg p-2 rounded-lg border border-civic-muted/20 col-span-2">
                  <span className="text-civic-muted block">GPS COORDINATES</span>
                  <span className="text-civic-text font-semibold">{issue.geo.lat.toFixed(6)}, {issue.geo.lng.toFixed(6)}</span>
                </div>
              </div>

              {/* Administrative Override Panel */}
              {user?.email?.toLowerCase() === "surya100406@gmail.com" && (
                <div className="mt-4 p-4.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-500">
                      <Shield className="w-4 h-4" />
                      <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest">Administrative Overrides</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdminEditing(!isAdminEditing)}
                      className="px-3 py-1 text-[10px] font-mono font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition cursor-pointer"
                    >
                      {isAdminEditing ? "Cancel" : "Modify Details"}
                    </button>
                  </div>

                  {isAdminEditing ? (
                    <div className="space-y-3 text-xs font-mono">
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-secondary font-bold uppercase block">Grievance Title</label>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full bg-surface-900 border border-hairline rounded-lg p-2.5 text-text-primary focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-text-secondary font-bold uppercase block">Description</label>
                        <textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          rows={3}
                          className="w-full bg-surface-900 border border-hairline rounded-lg p-2.5 text-text-primary focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary font-bold uppercase block">Category</label>
                          <select
                            value={editedCategory}
                            onChange={(e) => setEditedCategory(e.target.value)}
                            className="w-full bg-surface-900 border border-hairline rounded-lg p-2.5 text-text-primary focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="Roads">Roads</option>
                            <option value="Drainage">Drainage</option>
                            <option value="Electricity/Streetlights">Electricity</option>
                            <option value="Water">Water</option>
                            <option value="Sanitation">Sanitation</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary font-bold uppercase block">Severity</label>
                          <select
                            value={editedSeverity}
                            onChange={(e) => setEditedSeverity(e.target.value as any)}
                            className="w-full bg-surface-900 border border-hairline rounded-lg p-2.5 text-text-primary focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-text-secondary font-bold uppercase block">Status</label>
                          <select
                            value={editedStatus}
                            onChange={(e) => setEditedStatus(e.target.value as any)}
                            className="w-full bg-surface-900 border border-hairline rounded-lg p-2.5 text-text-primary focus:border-amber-500 outline-none cursor-pointer"
                          >
                            <option value="reported">Reported</option>
                            <option value="routed">Routed</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="in_progress">In Progress</option>
                            <option value="fixed">Fixed</option>
                            <option value="reverified">Reverified</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: Issue = {
                            ...issue,
                            title: editedTitle,
                            description: editedDescription,
                            category: editedCategory,
                            severity: editedSeverity,
                            status: editedStatus,
                            agentLog: [
                              ...issue.agentLog,
                              {
                                id: `admin-edit-${Date.now()}`,
                                agent: "Escalation Agent",
                                action: "Administrative Override Action",
                                reasoning: `Administrator manually mutated title, description, category, severity, or status variables.`,
                                timestamp: new Date().toISOString()
                              }
                            ]
                          };
                          onUpdateIssue(updated);
                          setIsAdminEditing(false);
                          alert("🎉 Database fields successfully mutated on remote server!");
                        }}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold uppercase tracking-wider rounded-lg transition cursor-pointer"
                      >
                        Apply Override Settings
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* DRAFT COLLAPSIBLES */}
          <div className="space-y-3">
            
            {/* 1. Official complaint */}
            {issue.complaintText && (
              <div className="bg-civic-card rounded-xl border border-civic-muted/20 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenComplaint(!openComplaint)}
                  className="w-full p-4 flex justify-between items-center text-left hover:bg-civic-bg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-civic-primary" />
                    <span className="text-xs font-semibold text-civic-text uppercase tracking-widest font-mono">
                      Routing Draft: Zonal Citation Complaint
                    </span>
                  </div>
                  {openComplaint ? <ChevronUp className="w-4 h-4 text-civic-muted" /> : <ChevronDown className="w-4 h-4 text-civic-muted" />}
                </button>
                {openComplaint && (
                  <div className="p-4 bg-civic-bg border-t border-civic-muted/20 text-xs font-mono text-civic-muted leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {issue.complaintText}
                  </div>
                )}
              </div>
            )}

            {/* 2. RTI Disclosure Petition */}
            {issue.rtiText && (
              <div className="bg-civic-card rounded-xl border border-civic-muted/20 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenRTI(!openRTI)}
                  className="w-full p-4 flex justify-between items-center text-left hover:bg-civic-bg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-civic-accent" />
                    <span className="text-xs font-semibold text-civic-text uppercase tracking-widest font-mono">
                      Escalation Draft: Statutory RTI Demands
                    </span>
                  </div>
                  {openRTI ? <ChevronUp className="w-4 h-4 text-civic-muted" /> : <ChevronDown className="w-4 h-4 text-civic-muted" />}
                </button>
                {openRTI && (
                  <div className="p-4 bg-civic-bg border-t border-civic-muted/20 text-xs font-mono text-civic-muted leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {issue.rtiText}
                  </div>
                )}
              </div>
            )}

            {/* 3. Social tag Post */}
            {issue.socialPostText && (
              <div className="bg-civic-card rounded-xl border border-civic-muted/20 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenSocial(!openSocial)}
                  className="w-full p-4 flex justify-between items-center text-left hover:bg-civic-bg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-4.5 h-4.5 text-sky-500" />
                    <span className="text-xs font-semibold text-civic-text uppercase tracking-widest font-mono">
                      Social Tag: Community Campaign Broadcast
                    </span>
                  </div>
                  {openSocial ? <ChevronUp className="w-4 h-4 text-civic-muted" /> : <ChevronDown className="w-4 h-4 text-civic-muted" />}
                </button>
                {openSocial && (
                  <div className="p-4 bg-civic-bg border-t border-civic-muted/20 text-xs font-mono text-civic-muted leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {issue.socialPostText}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* THE LIVE AGENT ACTIVITY LOG */}
          <div className="bg-civic-card rounded-2xl border border-civic-muted/20 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold text-civic-primary uppercase tracking-widest block border-b border-civic-muted/20 pb-2">
              System Dispatch & Resolve History
            </h3>

            <div className="space-y-4">
              {issue.agentLog.map((step, sIdx) => {
                // Determine color code based on agent
                const agentColors = {
                  "Triage Agent": { border: "border-teal-500/20", bg: "bg-teal-500/5", text: "text-teal-600" },
                  "Routing Agent": { border: "border-civic-primary/20", bg: "bg-civic-primary/5", text: "text-civic-primary" },
                  "Escalation Agent": { border: "border-civic-accent/20", bg: "bg-civic-accent/5", text: "text-civic-accent" },
                  "Verification Agent": { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-600" },
                  "Predictive Agent": { border: "border-fuchsia-500/20", bg: "bg-fuchsia-500/5", text: "text-fuchsia-600" }
                };

                const details = agentColors[step.agent] || { border: "border-civic-muted/20", bg: "bg-civic-bg", text: "text-civic-muted" };

                return (
                  <div 
                    key={step.id || sIdx}
                    className={`p-4 rounded-xl border ${details.border} ${details.bg} space-y-2 relative transition duration-200 hover:shadow-md`}
                  >
                    {/* Timestamp and Agent identity metadata header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${details.text}`}>
                          [{step.agent}]
                        </span>
                        <h4 className="text-xs font-bold text-civic-text mt-0.5">{step.action}</h4>
                      </div>
                      <span className="text-[9px] font-mono text-civic-muted text-right">
                        {formatDate(step.timestamp)}
                      </span>
                    </div>

                    {/* Tool executions with custom inline pills */}
                    {step.toolCall && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-civic-bg text-civic-muted border border-civic-muted/25 rounded-lg">
                          CALLING: {step.toolCall}
                        </span>
                        {step.args && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-civic-bg text-civic-muted border border-civic-muted/20 rounded-lg">
                            ARG: {JSON.stringify(step.args)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Core reasoning text block */}
                    <div className="bg-civic-card border border-civic-muted/20 p-2.5 rounded-xl text-[11px] font-mono text-civic-muted leading-relaxed whitespace-pre-wrap">
                      <span className="text-civic-primary select-none font-bold mr-1">&#955; Reasoning:</span>
                      {step.reasoning}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
