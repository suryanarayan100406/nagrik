import React, { useState, useRef } from "react";
import { Issue, Ward, UserProfile } from "../types";
import { 
  Shield, ShieldAlert, Trash2, CheckCircle, RefreshCw, Sparkles, 
  Database, Activity, FileText, Layers, TrendingUp, UserCheck, AlertCircle, MapPin,
  Camera, Upload
} from "lucide-react";
import { DEPARTMENTS } from "../data";

interface AdminPanelProps {
  issues: Issue[];
  onUpdateIssue: (updatedIssue: Issue) => void;
  onDeleteIssue: (id: string) => void;
  onClearAllIssues: () => void;
  wards: Ward[];
  onAddMockIssues: (mockIssues: Issue[]) => void;
  onSaveWard: (ward: Ward) => void;
  onDeleteWard: (id: string) => void;
  user?: UserProfile | null;
}

export default function AdminPanel({
  issues,
  onUpdateIssue,
  onDeleteIssue,
  onClearAllIssues,
  wards,
  onAddMockIssues,
  onSaveWard,
  onDeleteWard,
  user
}: AdminPanelProps) {
  if (user?.email?.toLowerCase() !== "surya100406@gmail.com" && user?.role !== "admin") {
    return (
      <div className="p-8 text-center bg-slate-900 text-text-primary h-full min-h-[500px] flex flex-col items-center justify-center space-y-4 font-sans border border-slate-800 rounded-2xl max-w-4xl mx-auto my-12 shadow-2xl">
        <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold tracking-tight uppercase">Access Denied — Administrative Clearance Required</h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
          You are logged in as <span className="font-mono text-amber-500 font-bold">{user?.email || "anonymous"}</span>.
          Only administrator roles or master accounts are granted clearance to mutate administrative registers.
        </p>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState<"grievances" | "dutyDesk" | "wards" | "simulators" | "kpis">("grievances");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newWardName, setNewWardName] = useState("");
  const [newWardOfficer, setNewWardOfficer] = useState("");

  const [uploadingIssueId, setUploadingIssueId] = useState<string | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const handleAdminFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingIssueId) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Photo = reader.result as string;
        const targetIssue = issues.find(i => i.id === uploadingIssueId);
        if (targetIssue) {
          onUpdateIssue({
            ...targetIssue,
            status: "fixed",
            photoAfter: base64Photo,
            agentLog: [
              ...targetIssue.agentLog,
              {
                id: `admin-upload-${Date.now()}`,
                agent: "Verification Agent",
                action: "Official Repair Photo Uploaded",
                reasoning: "Administrator uploaded physical repair confirmation photograph directly to the ledger.",
                timestamp: new Date().toISOString()
              }
            ]
          });
          alert(`🎉 Successfully uploaded repair photo and set status to "fixed" for ${targetIssue.dnaId}!`);
        }
        setUploadingIssueId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mock Incident templates for seeding
  const mockTemplates = [
    {
      title: "Dangerous Uncovered Storm Drain",
      description: "A wide storm drain has been left completely uncovered on the sidewalk corner, presenting a severe risk for children and nighttime pedestrians.",
      category: "Drainage",
      severity: "critical" as const,
      dangerScore: 92,
      latOffset: 0.003,
      lngOffset: -0.004,
      address: "Shahnajaf Road near Hazratganj Crossing, Lucknow"
    },
    {
      title: "Active Drinking Water Pipeline Leak",
      description: "Drinking water is spraying from a fractured connection joint, causing major flooding on the lane and wasting precious water resources.",
      category: "Water",
      severity: "high" as const,
      dangerScore: 74,
      latOffset: -0.005,
      lngOffset: 0.006,
      address: "Patrakar Puram Crossing, Gomti Nagar, Lucknow"
    },
    {
      title: "Overhead Power Line Sagging Near Canopy",
      description: "An high-voltage power cable has sagged directly into the low canopy of street trees. Sparks visible during wind gusts.",
      category: "Electricity/Streetlights",
      severity: "critical" as const,
      dangerScore: 95,
      latOffset: 0.006,
      lngOffset: 0.002,
      address: "Sector Q Main Road, Aliganj, Lucknow"
    },
    {
      title: "Illegal Trash Dumping Ground Spreading",
      description: "Commercial plastic bags and rotten food have been dumped on the roadside. Stray dogs and cows are tearing files, blocking traffic.",
      category: "Sanitation",
      severity: "medium" as const,
      dangerScore: 52,
      latOffset: -0.002,
      lngOffset: -0.005,
      address: "Kapoorthala Road, Lucknow"
    },
    {
      title: "Extreme Cavity Pothole Near Junction",
      description: "A deep, sharp-edged tarmac cavity is situated in the middle of the fast lane. Multiple cars seen bottoming out dangerously.",
      category: "Roads",
      severity: "high" as const,
      dangerScore: 82,
      latOffset: 0.001,
      lngOffset: 0.003,
      address: "Ring Road near Munshi Pulia, Lucknow"
    }
  ];

  // Helper to trigger simulated batch seeding
  const handleSeedMockTickets = () => {
    const baseLat = 26.8467;
    const baseLng = 80.9462;

    const newMockIssues: Issue[] = mockTemplates.map((template, idx) => {
      const uniqueId = "sim-issue-" + Date.now() + "-" + idx;
      const dnaId = `SIM-2026-${Math.floor(100 + Math.random() * 900)}`;
      const targetLat = baseLat + template.latOffset;
      const targetLng = baseLng + template.lngOffset;

      const ward = wards[idx % wards.length] || { id: "ward-lucknow-central", name: "Lucknow Central Ward", officer: "Shri. Alok Singh" };
      const matchDept = DEPARTMENTS[template.category as keyof typeof DEPARTMENTS] || DEPARTMENTS["Other"];

      return {
        id: uniqueId,
        dnaId,
        title: template.title,
        description: template.description,
        category: template.category,
        severity: template.severity,
        dangerScore: template.dangerScore,
        photoBefore: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
        photoAfter: null,
        geo: { lat: targetLat, lng: targetLng },
        address: template.address,
        wardId: ward.id,
        departmentId: matchDept.id,
        status: "routed",
        slaDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        escalationLevel: 0,
        verifications: Math.floor(1 + Math.random() * 8),
        complaintText: `Dear Officer,\n\nThis is a simulated transparency grievance compiled by the Nagrik Core engine regarding ${template.title} situated at ${template.address}. Prompt resolution is requested.\n\nWarm regards,\nSimulation Agent`,
        rtiText: "",
        socialPostText: "",
        agentLog: [
          {
            id: "step-1",
            agent: "Triage Agent",
            action: "System Injection & Verification",
            reasoning: `Simulation template parsed successfully. Target threat index identified: ${template.dangerScore}/100.`,
            timestamp: new Date().toISOString()
          },
          {
            id: "step-2",
            agent: "Routing Agent",
            action: "Jurisdiction Matching",
            reasoning: `Mapped coordinates to ${ward.name} automatically. Enforcing SLA target limits.`,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      };
    });

    onAddMockIssues(newMockIssues);
    alert(`Successfully injected ${newMockIssues.length} high-fidelity simulated citizen complaints into the live ledger database!`);
  };

  // Simulates citizen endorsement votes on an issue
  const simulateCitizenEndorsements = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;
    const updated = {
      ...issue,
      verifications: issue.verifications + Math.floor(3 + Math.random() * 5)
    };
    onUpdateIssue(updated);
  };

  // Simulates department action (e.g. status changes or officer resolution responses)
  const simulateOfficerResolution = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const mockResolutionPhotos = [
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
    ];

    const updated: Issue = {
      ...issue,
      status: "fixed",
      photoAfter: mockResolutionPhotos[Math.floor(Math.random() * mockResolutionPhotos.length)],
      agentLog: [
        ...issue.agentLog,
        {
          id: `step-${issue.agentLog.length + 1}`,
          agent: "Verification Agent",
          action: "Physical Repair Completion",
          reasoning: `Field inspector deployed materials to clear this grievance. Photograph comparison verifies that repairs have satisfied the neighborhood requirements completely.`,
          timestamp: new Date().toISOString()
        }
      ]
    };
    onUpdateIssue(updated);
    alert(`Simulated resolution action on ${issue.dnaId}: Set status to "fixed" and uploaded a repair confirmation photo! A verification notification has been sent to the citizens.`);
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          issue.dnaId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          issue.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || issue.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-2 pb-16 px-4 animate-fade-in text-slate-700">
      <input
        ref={adminFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAdminFileChange}
      />
      
      {/* Header and Branding Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="text-civic-primary font-mono text-xs font-semibold tracking-wider uppercase">
            Administrative Portal
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 flex items-center gap-2 mt-1.5 font-display">
            Nagrik Control Panel
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            Oversee active complaints, adjust municipal routing status parameters, simulate field replies, and audit system KPIs transparently.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSeedMockTickets}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl flex items-center gap-1.5 transition cursor-pointer animate-fade-in"
          >
            <Sparkles className="w-3.5 h-3.5 text-civic-primary" />
            Seed Tickets
          </button>
          
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all issues from the live ledger? This action is irreversible.")) {
                onClearAllIssues();
              }
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-red-600 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Wipe Ledger
          </button>
        </div>
      </div>

      {/* Grid Sub-navigation bar */}
      <div className="border-b border-slate-200 flex gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: "grievances", label: "Grievances Grid", icon: Layers },
          { key: "dutyDesk", label: "Official Duty Desk", icon: UserCheck },
          { key: "wards", label: "Wards & Jurisdictions", icon: MapPin },
          { key: "simulators", label: "Field Simulators", icon: Activity },
          { key: "kpis", label: "Transparency Audits", icon: Database }
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isActive = activeSubTab === subTab.key;
          return (
            <button
              key={subTab.key}
              onClick={() => setActiveSubTab(subTab.key as any)}
              className={`py-2 px-1 text-xs font-mono font-bold tracking-wide flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                isActive 
                  ? "border-civic-primary text-slate-800" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {subTab.label}
            </button>
          );
        })}
      </div>

      {/* Main Panel Content views */}
      {activeSubTab === "grievances" && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200 justify-between items-center shadow-sm">
            <input
              type="text"
              placeholder="Search by ID, title, or landmark..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs w-full sm:w-72 focus:border-civic-primary outline-none text-slate-800 placeholder-slate-400 font-mono"
            />

            <div className="flex gap-2 items-center w-full sm:w-auto">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest shrink-0">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:border-civic-primary"
              >
                <option value="all">ALL DEPARTMENTS</option>
                {Object.keys(DEPARTMENTS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grievances List */}
          {filteredIssues.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-xs text-slate-500 shadow-sm">
              No civic issues mapped under this criteria filter.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] tracking-wider uppercase">
                    <th className="p-4">Incident DNA ID</th>
                    <th className="p-4">Title & Ward</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Threat Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Witnesses</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredIssues.map((issue) => {
                    const matchedWard = wards.find(w => w.id === issue.wardId)?.name || "Lucknow Central Ward";
                    return (
                      <tr key={issue.id} className="hover:bg-slate-50/50 transition">
                        {/* ID */}
                        <td className="p-4 font-mono text-civic-primary font-bold whitespace-nowrap">
                          {issue.dnaId}
                        </td>
                        
                        {/* Title */}
                        <td className="p-4 max-w-[220px]">
                          <span className="font-semibold text-slate-800 block truncate">{issue.title}</span>
                          <span className="text-[10px] text-slate-500 truncate block font-mono">{matchedWard}</span>
                        </td>

                        {/* Category */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[10px]">
                            {issue.category}
                          </span>
                        </td>

                        {/* Threat Indicator */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`font-mono text-[10px] font-bold uppercase ${
                              issue.severity === "critical" ? "text-civic-accent" : issue.severity === "high" ? "text-orange-500" : issue.severity === "medium" ? "text-amber-500" : "text-emerald-500"
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">Score: {issue.dangerScore}</span>
                          </div>
                        </td>

                        {/* Status Badge Select Controller */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 items-start">
                            <select
                              value={issue.status}
                              onChange={(e) => {
                                onUpdateIssue({
                                  ...issue,
                                  status: e.target.value as any,
                                  agentLog: [
                                    ...issue.agentLog,
                                    {
                                      id: `admin-mut-${Date.now()}`,
                                      agent: "Escalation Agent",
                                      action: "Manual Status Override",
                                      reasoning: `Administrator manually mutated status state from '${issue.status}' to '${e.target.value}'.`,
                                      timestamp: new Date().toISOString()
                                    }
                                  ]
                                });
                              }}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-mono text-slate-700 focus:outline-none focus:border-civic-primary cursor-pointer"
                            >
                              <option value="reported">reported</option>
                              <option value="routed">routed</option>
                              <option value="acknowledged">acknowledged</option>
                              <option value="in_progress">in_progress</option>
                              <option value="fixed">fixed</option>
                              <option value="reverified">reverified</option>
                            </select>
                            
                            {issue.status === "fixed" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadingIssueId(issue.id);
                                  setTimeout(() => adminFileInputRef.current?.click(), 50);
                                }}
                                className="text-[9.5px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                              >
                                <Camera className="w-3 h-3" />
                                {issue.photoAfter ? "Change Repair Photo" : "Upload Repair Photo"}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Witnesses */}
                        <td className="p-4 text-center font-mono font-bold text-slate-500">
                          {issue.verifications}
                        </td>

                        {/* Delete single button */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (window.confirm(`Wipe ticket ${issue.dnaId} from ledger?`)) {
                                onDeleteIssue(issue.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-civic-accent rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title="Delete this incident"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "dutyDesk" && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm font-mono uppercase tracking-wide text-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-civic-primary" />
              Municipal Dispatch & Repair Desk
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Process active citizen complaints through the municipal resolution workflow. Perform quick status updates, log labor dispatches, and upload physical repair visual logs.
            </p>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Column 1: Acknowledged / Awaiting */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-700">1. Acknowledged</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/60 font-mono text-[10px] font-bold text-slate-600">
                  {issues.filter(i => i.status === "acknowledged" || i.status === "reported" || i.status === "routed").length}
                </span>
              </div>
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px]">
                {issues.filter(i => i.status === "acknowledged" || i.status === "reported" || i.status === "routed").map(issue => {
                  const isAwaitingAck = issue.status === "reported" || issue.status === "routed";
                  return (
                    <div key={issue.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200 space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9.5px] font-mono font-bold text-civic-primary">{issue.dnaId}</span>
                          <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold border border-orange-200/50">
                            {issue.status}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{issue.title}</h5>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{issue.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[9px] font-mono font-medium text-slate-400">Witnesses: {issue.verifications}</span>
                        {isAwaitingAck ? (
                          <button
                            onClick={() => {
                              onUpdateIssue({
                                ...issue,
                                status: "acknowledged",
                                agentLog: [
                                  ...issue.agentLog,
                                  {
                                    id: `official-ack-${Date.now()}`,
                                    agent: "Escalation Agent",
                                    action: "Acknowledge Complaint",
                                    reasoning: "Municipal command center received report, authenticated citizen visual proof, and officially mapped ticket to the ward officer dashboard.",
                                    timestamp: new Date().toISOString()
                                  }
                                ]
                              });
                            }}
                            className="px-2.5 py-1.5 bg-civic-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onUpdateIssue({
                                ...issue,
                                status: "in_progress",
                                agentLog: [
                                  ...issue.agentLog,
                                  {
                                    id: `official-prog-${Date.now()}`,
                                    agent: "Routing Agent",
                                    action: "Dispatch Labor Teams",
                                    reasoning: "Authorized immediate resource allocation. Field crew dispatched with specialized equipment to commence physical repairs.",
                                    timestamp: new Date().toISOString()
                                  }
                                ]
                              });
                            }}
                            className="px-2.5 py-1.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-lg hover:opacity-90 transition cursor-pointer"
                          >
                            Start Repairs →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {issues.filter(i => i.status === "acknowledged" || i.status === "reported" || i.status === "routed").length === 0 && (
                  <div className="text-center py-10 text-[10.5px] text-slate-400 font-mono">No tickets in queue.</div>
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-700">2. In Progress</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/60 font-mono text-[10px] font-bold text-slate-600">
                  {issues.filter(i => i.status === "in_progress").length}
                </span>
              </div>
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px]">
                {issues.filter(i => i.status === "in_progress").map(issue => {
                  return (
                    <div key={issue.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200 space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9.5px] font-mono font-bold text-civic-primary">{issue.dnaId}</span>
                          <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold border border-amber-200/50">
                            Active Repair
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{issue.title}</h5>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{issue.description}</p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-medium text-slate-400">Crew deployed</span>
                        </div>
                        <div className="flex gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingIssueId(issue.id);
                              setTimeout(() => adminFileInputRef.current?.click(), 50);
                            }}
                            className="flex-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Upload className="w-3 h-3" />
                            Upload Photo
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const mockResolutions = [
                                "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
                                "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80",
                                "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
                              ];
                              onUpdateIssue({
                                ...issue,
                                status: "fixed",
                                photoAfter: mockResolutions[Math.floor(Math.random() * mockResolutions.length)],
                                agentLog: [
                                  ...issue.agentLog,
                                  {
                                    id: `official-fix-${Date.now()}`,
                                    agent: "Verification Agent",
                                    action: "Submit Repair Completion (Simulated)",
                                    reasoning: "Field crew verified physical repairs have been executed successfully on-site. Simulated photographic proof uploaded to database.",
                                    timestamp: new Date().toISOString()
                                  }
                                ]
                              });
                            }}
                            className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer font-sans"
                            title="Mark Fixed with Mock Image"
                          >
                            Mock Fix
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {issues.filter(i => i.status === "in_progress").length === 0 && (
                  <div className="text-center py-10 text-[10.5px] text-slate-400 font-mono">No active field repairs.</div>
                )}
              </div>
            </div>

            {/* Column 3: Fixed */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-700">3. Fixed</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/60 font-mono text-[10px] font-bold text-slate-600">
                  {issues.filter(i => i.status === "fixed").length}
                </span>
              </div>
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px]">
                {issues.filter(i => i.status === "fixed").map(issue => {
                  return (
                    <div key={issue.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200 space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9.5px] font-mono font-bold text-civic-primary">{issue.dnaId}</span>
                          <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/50">
                            Awaiting Audit
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{issue.title}</h5>
                        {issue.photoAfter && (
                          <div className="mt-2 relative h-16 rounded overflow-hidden border border-slate-200">
                            <img src={issue.photoAfter} alt="Repair" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 w-full">
                        <div className="flex items-center justify-between text-[9px] font-mono font-medium text-slate-500">
                          <span>Awaiting Citizen Verification</span>
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            onUpdateIssue({
                              ...issue,
                              agentLog: [
                                ...issue.agentLog,
                                {
                                  id: `official-nudge-${Date.now()}`,
                                  agent: "Escalation Agent",
                                  action: "Dispatch Community Re-Verification Alert",
                                  reasoning: "Municipal operator manually broadcasted a secondary mobile notification push to citizen spotters demanding a Physical visual verification audit.",
                                  timestamp: new Date().toISOString()
                                }
                              ]
                            });
                            alert(`🔔 Community Verification Alert re-sent for ${issue.dnaId}! Citizens have been notified to perform physical reverification on-site.`);
                          }}
                          className="w-full px-2 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell-ring"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>
                          Nudge Citizen Verification
                        </button>
                      </div>
                    </div>
                  );
                })}
                {issues.filter(i => i.status === "fixed").length === 0 && (
                  <div className="text-center py-10 text-[10.5px] text-slate-400 font-mono">No fixed tickets awaiting audit.</div>
                )}
              </div>
            </div>

            {/* Column 4: Closed / Reverified */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4 min-h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-slate-700">4. Re-verified</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/60 font-mono text-[10px] font-bold text-slate-600">
                  {issues.filter(i => i.status === "reverified").length}
                </span>
              </div>
              <div className="space-y-3 flex-grow overflow-y-auto max-h-[500px]">
                {issues.filter(i => i.status === "reverified").map(issue => {
                  return (
                    <div key={issue.id} className="bg-white/80 border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition duration-200 space-y-2 opacity-80">
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400">{issue.dnaId}</span>
                        <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200/50">
                          Closed ✓
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-700 line-clamp-1">{issue.title}</h5>
                      <span className="text-[9px] font-mono text-emerald-600 block">SLA Target Met Successfully</span>
                    </div>
                  );
                })}
                {issues.filter(i => i.status === "reverified").length === 0 && (
                  <div className="text-center py-10 text-[10.5px] text-slate-400 font-mono">No closed tickets.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === "wards" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in text-slate-800">
          {/* Create Ward Form Card */}
          <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-sm tracking-tight text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-civic-primary" />
                Establish Municipal Ward
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Define a new administrative jurisdiction and appoint its chief officer. New complaints reported in this bounding region are assigned automatically.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newWardName.trim() || !newWardOfficer.trim()) return;
                
                // Formulate Ward object
                const newId = "ward-" + Date.now();
                const ward: Ward = {
                  id: newId,
                  name: newWardName.trim(),
                  officer: newWardOfficer.trim(),
                  resolvedCount: 0,
                  totalCount: 0,
                  slaHitRate: 100
                };
                onSaveWard(ward);
                setNewWardName("");
                setNewWardOfficer("");
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                  Ward Designation & Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward 3 - Hazratganj"
                  value={newWardName}
                  onChange={(e) => setNewWardName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-primary font-sans text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                  Chief Ward Officer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Smt. Roopa Dev"
                  value={newWardOfficer}
                  onChange={(e) => setNewWardOfficer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-civic-primary font-sans text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!newWardName.trim() || !newWardOfficer.trim()}
                className="w-full py-2.5 px-4 bg-civic-primary text-white text-xs font-mono font-bold tracking-wide rounded-xl hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
              >
                Create Jurisdiction
              </button>
            </form>
          </div>

          {/* Active Wards List Panel */}
          <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-sm tracking-tight text-slate-800">
                Active Jurisdictions ({wards.length})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Currently loaded and active municipal sectors of Lucknow.
              </p>
            </div>

            {wards.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">No active wards created yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {wards.map((ward) => (
                  <div key={ward.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-semibold text-civic-primary block">
                        {ward.name.split(" - ")[0]}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {ward.name.split(" - ")[1] || ward.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                        Officer: {ward.officer}
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteWard(ward.id)}
                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
                      title="Remove Ward"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "simulators" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Simulator actions card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-civic-primary" />
              <div>
                <h3 className="font-bold text-sm text-slate-800 font-mono uppercase tracking-wide">MUNICIPAL DEPLOYMENT INJECTORS</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Trigger physical repair answers and endorsement campaigns</p>
              </div>
            </div>

            <div className="space-y-4">
              {issues.length === 0 ? (
                <div className="p-4 bg-slate-50 text-center text-[11px] text-slate-500 border border-slate-200 rounded-xl leading-relaxed">
                  Ledger database is empty. Click <b>"Seed Demo Tickets"</b> at the top right to enable the simulators.
                </div>
              ) : (
                issues.map(issue => (
                  <div key={issue.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 truncate">
                      <span className="text-[10px] font-mono font-bold text-civic-primary">{issue.dnaId}</span>
                      <h4 className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{issue.title}</h4>
                      <span className="text-[9px] text-slate-500 font-mono capitalize">Status: {issue.status}</span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => simulateCitizenEndorsements(issue.id)}
                        className="px-2.5 py-1.5 bg-civic-primary/10 hover:bg-civic-primary/20 text-[10px] font-mono text-civic-primary border border-civic-primary/15 rounded-lg transition cursor-pointer"
                        title="Simulate other users testifying this report"
                      >
                        + Vote Endorse
                      </button>

                      {issue.status !== "reverified" && (
                        <button
                          onClick={() => simulateOfficerResolution(issue.id)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-mono text-emerald-700 border border-emerald-500/10 rounded-lg transition cursor-pointer"
                          title="Simulate officer repair and photograph submission"
                        >
                          ✓ Resolve Fix
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Model feedback simulation card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800 font-mono uppercase tracking-wide">Citizen-Facing Integrity Audit</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ensuring citizen trust through physical and cryptographic proof layers</p>
                </div>
              </div>

              <p className="text-[11.5px] text-slate-500 leading-relaxed font-sans">
                Nagrik is built to prevent mock data, fake reports, and municipal over-promises. The platform enforces civic honesty by requiring <b>Visual Proof (Before snapshot)</b>, <b>GPS geolocational verification (within 100m of the site)</b>, and <b>Community Endorsements</b> before dispatching tickets to department heads.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block">Audit Compliance Checklists</span>
                <div className="text-[11px] text-slate-600 space-y-1 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">✔</span>
                    <span>100% of reports contain precise lat/long geolocation bounds.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">✔</span>
                    <span>Gemini triage models process photo evidence directly.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600">✔</span>
                    <span>Dynamic Wards telemetry recalculates in real-time.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 text-center font-mono text-[10px] text-slate-500 flex items-center gap-2 justify-center">
              <UserCheck className="w-3.5 h-3.5 text-civic-accent" />
              ADMIN SECURED ACCESS LAYER v2.10
            </div>
          </div>

        </div>
      )}

      {activeSubTab === "kpis" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* KPI 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-mono font-bold text-civic-primary uppercase tracking-widest block">Ledger Capacity</span>
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">{issues.length}</span>
              <span className="text-[10px] font-mono text-slate-400">tickets stored</span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-normal">
              Representing total database cells stored inside client cache or synchronized Firebase collection structures.
            </p>
          </div>

          {/* KPI 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest block">Active Resolution Rate</span>
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                {issues.length === 0 ? "100%" : `${Math.floor((issues.filter(i => i.status === "reverified").length / issues.length) * 100)}%`}
              </span>
              <span className="text-[10px] font-mono text-slate-400">target: &gt;75%</span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-normal">
              Percentage of grievances successfully cleared by field operators and verified by citizens using before/after comparisons.
            </p>
          </div>

          {/* KPI 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-mono font-bold text-amber-600 uppercase tracking-widest block">Average Threat Index</span>
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-extrabold text-amber-600 font-mono">
                {issues.length === 0 ? "0" : Math.floor(issues.reduce((acc, curr) => acc + curr.dangerScore, 0) / issues.length)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">out of 100</span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-normal">
              Mean public danger factor across all active tickets evaluated using Gemini's visual risk detection parameters.
            </p>
          </div>

          {/* API audit logger list */}
          <div className="md:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-civic-accent uppercase tracking-widest">Active API Endpoint Transactions</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Live telemetry stream</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[10.5px] text-slate-600 space-y-2 max-h-48 overflow-y-auto">
              <div className="text-slate-400">--- CONNECTION ESTABLISHED ---</div>
              <div>[API GET] /api/issues - Status: 200 OK (Loaded {issues.length} records)</div>
              <div>[API GET] /api/wards - Status: 200 OK (Loaded {wards.length} records)</div>
              {issues.length > 0 && (
                <div>[AI CLASSIFIER] models/gemini-3.5-flash: Evaluated threat ratios securely for live tickets.</div>
              )}
              <div className="text-slate-400">--- END OF TRANSACTION LOGS ---</div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
