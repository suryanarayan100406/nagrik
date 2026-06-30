import React, { useState, useEffect } from "react";
import { Issue, Ward, UserProfile, GeoLocation } from "./types";
import { DEPARTMENTS } from "./data";
import CivicMap, { SEVERITY_COLORS } from "./components/CivicMap";
import ReportIssue from "./components/ReportIssue";
import IssueDetails from "./components/IssueDetails";
import WardScorecard from "./components/WardScorecard";
import PredictiveDashboard from "./components/PredictiveDashboard";
import ProfileScreen from "./components/ProfileScreen";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";
import { 
  getIssues, saveIssue, deleteIssue, getWards, saveWard, deleteWard, getUserProfile, saveUserProfile,
  initializeFirebaseService, activeConfig, getActiveConfig, CustomFirebaseConfig, onAuthChanged, logoutUser,
  clearAllIssuesRemote, clearAllWardsRemote
} from "./lib/firebase";
import appletConfig from "../firebase-applet-config.json";

import { 
  Map as MapIcon, Compass, BarChart3, Cpu, Award, Plus, MapPin, 
  Database, RefreshCw, X, ShieldAlert, Sparkles, Clock, Globe, Laptop, Trash, Trash2, LogIn, LogOut, Shield,
  Moon, Sun, CheckCircle2, AlertTriangle
} from "lucide-react";

export default function App() {
  // 1. STATE MANAGEMENT
  const [issues, setIssues] = useState<Issue[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Connection center console overlay toggle
  const [showConfigCenter, setShowConfigCenter] = useState(false);
  const [firebaseKeys, setFirebaseKeys] = useState<CustomFirebaseConfig>({
    apiKey: appletConfig?.apiKey || "",
    authDomain: appletConfig?.authDomain || "",
    projectId: appletConfig?.projectId || "",
    storageBucket: appletConfig?.storageBucket || "",
    messagingSenderId: appletConfig?.messagingSenderId || "",
    appId: appletConfig?.appId || "",
    databaseId: (appletConfig as any)?.firestoreDatabaseId || ""
  });

  const [currentActiveConfig, setCurrentActiveConfig] = useState<CustomFirebaseConfig | null>(null);

  // Load configuration from local storage if existing
  useEffect(() => {
    try {
      const saved = localStorage.getItem("NAGRIK_CUSTOM_FIREBASE_CONFIG");
      if (saved) {
        setFirebaseKeys(JSON.parse(saved));
      }
    } catch (e) { }
    setCurrentActiveConfig(getActiveConfig());
  }, []);

  // Real-time UTC clock ticker for tactical feel
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Unified loading process
  const reloadApplicationData = async () => {
    setIsSyncing(true);
    try {
      const [liveIssues, liveWards, liveUser] = await Promise.all([
        getIssues(),
        getWards(),
        getUserProfile()
      ]);
      setIssues(liveIssues);
      setWards(liveWards);
      setUser(liveUser);
    } catch (error) {
      console.error("Failed to load state parameters:", error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Run initial pull and listen for real-time authentication state shifts
  useEffect(() => {
    reloadApplicationData();

    // Authenticated state subscription
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch current points and levels to maintain gameplay continuity
        const liveUser = await getUserProfile();
        const mergedUser: UserProfile = {
          ...liveUser,
          name: firebaseUser.displayName || liveUser.name,
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          photoURL: firebaseUser.photoURL || liveUser.photoURL
        };
        setUser(mergedUser);
        await saveUserProfile(mergedUser);
      } else {
        // Reload standard local default profile
        const liveUser = await getUserProfile();
        setUser(liveUser);
      }
    });

    const handleSandboxChange = () => {
      reloadApplicationData();
    };

    window.addEventListener("storage", handleSandboxChange);
    window.addEventListener("storage_sandbox_changed", handleSandboxChange);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleSandboxChange);
      window.removeEventListener("storage_sandbox_changed", handleSandboxChange);
    };
  }, []);

  // Screen active tabs: 'map' | 'report' | 'detail' | 'scorecard' | 'predictive' | 'profile' | 'admin'
  const [activeTab, setActiveTab] = useState<"map" | "report" | "detail" | "scorecard" | "predictive" | "profile" | "admin">("map");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState<number>(0);

  // Filters matrices
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("CIVIC_DARK_MODE");
      return saved === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("CIVIC_DARK_MODE", String(isDarkMode));
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const selectedIssue = issues.find(i => i.id === selectedIssueId) || null;

  // Sync ward statistics dynamically on issue changes
  useEffect(() => {
    if (wards.length === 0) return;

    const updatedWards = wards.map(ward => {
      const wardIssues = issues.filter(i => i.wardId === ward.id);
      const total = wardIssues.length; 
      const resolved = wardIssues.filter(i => i.status === "reverified").length;
      return {
        ...ward,
        totalCount: total,
        resolvedCount: resolved,
        slaHitRate: total === 0 ? 100 : Math.min(100, Math.floor((resolved / total) * 100))
      };
    });

    if (JSON.stringify(updatedWards) !== JSON.stringify(wards)) {
      setWards(updatedWards);
      // Persist to store asynchronously
      updatedWards.forEach(w => saveWard(w));
    }
  }, [issues]);

  // Gamification reward state mutations
  const handleAwardPoints = async (xp: number) => {
    if (!user) return;
    const nextPoints = user.points + xp;
    let nextLevel: UserProfile["level"] = "Spotter";
    if (nextPoints > 2500) nextLevel = "Local Legend";
    else if (nextPoints > 1200) nextLevel = "Hero";
    else if (nextPoints > 600) nextLevel = "Guardian";
    else if (nextPoints > 200) nextLevel = "Verifier";

    const updatedProfile: UserProfile = {
      ...user,
      points: nextPoints,
      level: nextLevel,
      verifications: xp === 15 ? user.verifications + 1 : user.verifications
    };

    setUser(updatedProfile);
    await saveUserProfile(updatedProfile);
  };

  const handleUpdateIssue = async (updatedIssue: Issue) => {
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    await saveIssue(updatedIssue);
  };

  const handleCreateIssue = async (newIssue: Issue) => {
    setIssues(prev => [newIssue, ...prev]);
    await saveIssue(newIssue);
    await handleAwardPoints(50); 
  };

  const handleDeleteIssue = async (id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
    await deleteIssue(id);
    if (selectedIssueId === id) {
      setSelectedIssueId(null);
    }
  };

  const handleSaveWard = async (ward: Ward) => {
    setWards(prev => [...prev, ward]);
    await saveWard(ward);
  };

  const handleDeleteWard = async (id: string) => {
    setWards(prev => prev.filter(w => w.id !== id));
    await deleteWard(id);
  };

  const handleClearAllIssues = async () => {
    if (window.confirm("Are you sure you want to clear all active reports from your history? This will clean up the ledger database.")) {
      setIsSyncing(true);
      try {
        await clearAllIssuesRemote();
        setIssues([]);
        if (user) {
          const resetUser = { ...user, points: 0, level: "Spotter" as const, verifications: 0 };
          setUser(resetUser);
          localStorage.setItem("nagrik_cached_user", JSON.stringify(resetUser));
        }
        alert("Grievances ledger and stats reset successfully from remote and local caches!");
      } catch (err) {
        console.error("Failed to clear remote ledger:", err);
        alert("Wiped local caches, but remote database clearance failed.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Custom Firebase integration submission
  const handleUpdateFirebaseKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseKeys.projectId || !firebaseKeys.apiKey) {
      alert("Please provide at least a Project ID and an API Key to initiate communication.");
      return;
    }

    try {
      localStorage.setItem("NAGRIK_CUSTOM_FIREBASE_CONFIG", JSON.stringify(firebaseKeys));
      const status = initializeFirebaseService(firebaseKeys);
      if (status) {
        setCurrentActiveConfig(getActiveConfig());
        alert("🎉 Connection initialized dynamically! Refreshing database content...");
        reloadApplicationData();
        setShowConfigCenter(false);
      } else {
        alert("An error occurred during initialization. Please check security parameters.");
      }
    } catch (error) {
      alert("Failed to initialize custom database configuration: " + error);
    }
  };

  const clearCustomFirebaseConn = () => {
    if (window.confirm("Disconnect customized Firebase integration and fall back onto Local Sandbox?")) {
      localStorage.removeItem("NAGRIK_CUSTOM_FIREBASE_CONFIG");
      setFirebaseKeys({
        apiKey: appletConfig?.apiKey || "",
        authDomain: appletConfig?.authDomain || "",
        projectId: appletConfig?.projectId || "",
        storageBucket: appletConfig?.storageBucket || "",
        messagingSenderId: appletConfig?.messagingSenderId || "",
        appId: appletConfig?.appId || "",
        databaseId: (appletConfig as any)?.firestoreDatabaseId || ""
      });
      initializeFirebaseService(null);
      setCurrentActiveConfig(getActiveConfig());
      alert("Disconnected! Re-routing onto Sandbox environment.");
      reloadApplicationData();
      setShowConfigCenter(false);
    }
  };

  // Computed display grid items
  const filteredIssues = issues.filter(issue => {
    const matchCat = categoryFilter === "all" || issue.category.toLowerCase() === categoryFilter.toLowerCase();
    
    let matchStatus = true;
    if (statusFilter === "active") {
      matchStatus = issue.status !== "reverified";
    } else if (statusFilter === "resolved") {
      matchStatus = issue.status === "reverified";
    }
    
    const matchSeverity = severityFilter === "all" || issue.severity.toLowerCase() === severityFilter.toLowerCase();
    
    return matchCat && matchStatus && matchSeverity;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-civic-bg flex flex-col items-center justify-center font-mono text-xs text-civic-primary gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-civic-primary" />
        <span className="font-sans text-sm text-civic-text font-medium">Loading Nagrik Platform...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-civic-bg text-civic-text font-sans flex flex-col relative pb-20 md:pb-0 selection:bg-civic-primary/20 selection:text-civic-text">
      
      {/* 1. TOP HEADER APP BRAND RAIL */}
      <header className="sticky top-0 z-30 bg-surface-800 border-b border-hairline px-6 py-0 flex items-center justify-between shadow-sm h-14 pl-0 text-text-primary">
        <div className="flex items-center gap-4 h-full">
          {/* Solid primary square logo */}
          <div className="w-14 h-14 bg-primary flex items-center justify-center border-r border-primary shrink-0">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-text-primary flex items-center gap-2 font-sans uppercase">
              Nagrik <span className="text-[9px] bg-primary text-white font-semibold px-1.5 py-0.5 rounded-lg tracking-normal">CIVIC COMMAND</span>
            </h1>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-text-secondary bg-surface-900 border border-hairline rounded-xl px-4 py-1.5">
          <div className="flex items-center gap-1.5 font-sans">
            <span className="text-text-secondary">Registered reports:</span>
            <span className="text-text-primary font-bold font-mono">{issues.length}</span>
          </div>
        </div>

        {/* User Auth, Theme Toggle & Emergency Actions Block */}
        <div className="flex items-center gap-4">
          
          {/* Theme Toggler, Helpline warnings & Quick Add buttons */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-text-secondary hover:text-primary transition rounded-xl civic-focus hover:bg-surface-900"
              title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-secondary" /> : <Moon className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => setActiveTab("predictive")} 
              className="p-2 text-primary hover:opacity-80 transition relative" 
              title="Spatial Intelligence Dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            
            <button
              onClick={() => setActiveTab("report")}
              className="w-9 h-9 rounded-xl bg-primary hover:opacity-95 text-white flex items-center justify-center transition hover:scale-102 active:scale-98 cursor-pointer"
              title="File New Complaint"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-hairline"></div>

          {user && user.email ? (
            <div className="flex items-center gap-2">
              <div 
                onClick={() => setActiveTab("profile")}
                className="flex items-center gap-3 bg-surface-900 hover:bg-surface-700 transition p-1.5 pr-3 rounded-xl border border-hairline shadow-sm cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-primary border border-primary/20 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.substring(0, 1)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-[8px] font-mono font-medium text-primary block tracking-wider uppercase leading-none">{user.level}</span>
                  <span className="text-[10px] font-semibold text-text-primary block leading-none mt-0.5">{user.points} XP</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logoutUser();
                  setActiveTab("profile");
                }}
                className="p-2 text-text-secondary hover:text-accent hover:bg-surface-900 rounded-xl transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2 bg-primary hover:opacity-95 active:scale-98 transition px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-56px)] overflow-hidden">
        
        {/* DESKTOP SIDEBAR NAVIGATION (Extremely slick and functional) */}
        <nav className="hidden md:flex flex-col w-[80px] shrink-0 bg-civic-card border-r border-civic-muted/20 items-center justify-between py-6 shadow-sm sticky top-0 h-[calc(100vh-56px)]">
          <div className="flex flex-col gap-5 w-full items-center">
            {[
              { tab: "map", label: "Issues Map", icon: MapIcon },
              { tab: "report", label: "Report", icon: Plus },
              { tab: "scorecard", label: "Wards", icon: BarChart3 },
              { tab: "predictive", label: "Analytics", icon: Cpu },
              { tab: "profile", label: "My Profile", icon: Award },
              ...(user?.email?.toLowerCase() === "surya100406@gmail.com" ? [{ tab: "admin", label: "Admin Panel", icon: Shield }] : [])
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.tab || (item.tab === "map" && activeTab === "detail");
              return (
                <button
                  key={item.tab}
                  onClick={() => {
                    setActiveTab(item.tab as any);
                  }}
                  className="group flex flex-col items-center justify-center w-full relative transition cursor-pointer"
                  title={item.label}
                >
                  <div className={`w-11 h-11 rounded-xl transition-all duration-300 flex items-center justify-center border ${
                    isActive 
                      ? "bg-civic-primary border-civic-primary text-white shadow-md shadow-civic-primary/20" 
                      : "bg-civic-bg border-civic-muted/15 text-civic-muted hover:text-civic-text hover:bg-civic-muted/10 group-hover:scale-105"
                  }`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-mono mt-1.5 text-civic-muted group-hover:text-civic-text tracking-wider">
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.span 
                      layoutId="active-sidebar-nav"
                      className="absolute right-0 w-1 h-8 bg-civic-primary rounded-l-full top-1/2 -translate-y-1/2"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Database shortcut on sidebar */}
          <div className="w-full flex justify-center">
            <button 
              onClick={() => setShowConfigCenter(true)}
              className={`p-2.5 rounded-xl border transition-all ${
                currentActiveConfig 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold" 
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-350 hover:bg-slate-100"
              } cursor-pointer`}
              title="Database Settings"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* WORKSPACE RENDERING ZONE */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-grow flex flex-col h-full overflow-hidden"
            >
              {activeTab === "map" && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full">
                  
                  {/* LEFT DOCK BAR: Incident Ledger List cards */}
                  <div className="w-full md:w-[390px] bg-civic-card border-r border-civic-muted/20 flex flex-col h-2/5 md:h-full shrink-0 shadow-lg overflow-hidden">
                    
                    {/* List header search & filter chips */}
                    <div className="p-4 bg-civic-bg border-b border-civic-muted/20 space-y-3">
                      <div className="flex gap-2 justify-between items-center">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
                          Active Complaints
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-civic-text bg-civic-card px-2 py-0.5 rounded-lg border border-civic-muted/30 shrink-0 font-bold">
                            {filteredIssues.length} MATCHED
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* Category filters */}
                        {["all", "Roads", "Drainage", "Electricity/Streetlights", "Water", "Sanitation"].map(cat => {
                          const isActive = categoryFilter === cat.toLowerCase();
                          return (
                            <button
                              key={cat}
                              onClick={() => setCategoryFilter(cat.toLowerCase())}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-mono border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-primary border-primary/20 text-white font-bold shadow-md shadow-primary/10"
                                  : "bg-surface-800 border-hairline text-text-secondary hover:text-text-primary hover:border-text-secondary/40"
                              }`}
                            >
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                              {cat}
                            </button>
                          );
                        })}
                      </div>

                      {/* Status Toggle Grid */}
                      <div className="grid grid-cols-3 gap-1 bg-surface-800 p-1 rounded-2xl border border-hairline shadow-inner">
                        {["all", "active", "resolved"].map(st => {
                          const isActive = statusFilter === st;
                          return (
                            <button
                              key={st}
                              onClick={() => setStatusFilter(st)}
                              className={`py-1.5 rounded-xl text-[10px] font-mono uppercase font-bold text-center transition-all duration-200 cursor-pointer ${
                                isActive 
                                  ? "bg-primary/10 text-primary border border-primary/20 font-bold" 
                                  : "text-text-secondary hover:text-text-primary"
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>

                      {/* Interactive Severity Legend (Minimalist & Clean) */}
                      <div className="space-y-2 pt-2 pb-1 border-t border-hairline">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary flex justify-between items-center">
                          <span>Severity Dashboard scale</span>
                          {severityFilter !== "all" && (
                            <button 
                              onClick={() => setSeverityFilter("all")}
                              className="text-[9px] text-primary hover:underline cursor-pointer font-sans normal-case"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-between">
                          {[
                            { value: "critical", label: "Critical", color: "#FF5D5D" },
                            { value: "high", label: "High", color: "#FF9F43" },
                            { value: "medium", label: "Medium", color: "#F2C94C" },
                            { value: "low", label: "Low", color: "#34D399" }
                          ].map((sev) => {
                            const isSelected = severityFilter === sev.value;
                            return (
                              <button
                                key={sev.value}
                                onClick={() => setSeverityFilter(isSelected ? "all" : sev.value)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-mono tracking-wider transition-all duration-150 cursor-pointer ${
                                  isSelected 
                                    ? "bg-primary/10 text-primary font-bold" 
                                    : "text-text-secondary hover:text-text-primary"
                                }`}
                                title={`Filter by ${sev.label}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sev.color }} />
                                <span>{sev.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Incidents scrolling list */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-24 scrollbar-thin">
                      {filteredIssues.length === 0 ? (
                        <div className="py-16 text-center text-xs text-text-tertiary font-mono leading-relaxed flex flex-col items-center gap-3 bg-surface-900/50 rounded-2xl border border-hairline border-dashed">
                          <ShieldAlert className="w-10 h-10 text-text-tertiary animate-pulse" />
                          <span>No active files match active filters.</span>
                        </div>
                      ) : (
                        filteredIssues.map((issue) => {
                          const isSelected = selectedIssueId === issue.id;
                          return (
                            <div
                              key={issue.id}
                              onClick={() => {
                                setSelectedIssueId(issue.id);
                                setMapFocusTrigger(prev => prev + 1);
                              }}
                              className={`p-4.5 rounded-2xl flex gap-4 cursor-pointer transition-all duration-300 border ${
                                isSelected 
                                  ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-lg scale-[1.01] relative before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1.5 before:bg-primary before:rounded-r-full" 
                                  : "bg-surface-800/85 hover:bg-surface-800 border-hairline hover:border-text-secondary/20 hover:shadow-lg"
                              }`}
                            >
                              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-hairline bg-surface-900 shadow-inner">
                                <img 
                                  src={issue.photoBefore} 
                                  alt={issue.title} 
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full bg-surface-900 border border-hairline text-[8px] font-mono tracking-widest uppercase text-text-tertiary font-black">
                                    {issue.category}
                                  </span>
                                  <span 
                                    className="text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-full"
                                    style={{ 
                                      backgroundColor: `${SEVERITY_COLORS[issue.severity]}15`, 
                                      color: SEVERITY_COLORS[issue.severity] 
                                    }}
                                  >
                                    ● {issue.severity}
                                  </span>
                                </div>

                                <h4 className="text-xs font-semibold text-text-primary truncate leading-tight">
                                  {issue.title}
                                </h4>
                                
                                <p className="text-[10px] text-text-secondary font-mono flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate">{issue.address}</span>
                                </p>

                                <div className="flex items-center justify-between pt-1 font-mono text-[9px]">
                                  <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 ${
                                    issue.status === "reverified" 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                                      : "bg-signal-amber-500/10 text-signal-amber-500 border border-signal-amber-500/25"
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${issue.status === "reverified" ? "bg-emerald-400 animate-pulse" : "bg-signal-amber-500"}`} />
                                    {issue.status}
                                  </span>
                                  <span className="text-text-tertiary font-bold">
                                    {issue.verifications} witnesses
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RIGHT WORKSPACE: Interactive Maps pane */}
                  <div className="flex-grow flex flex-col h-3/5 md:h-full relative overflow-hidden bg-surface-900 p-4">
                    <CivicMap
                      issues={filteredIssues}
                      selectedIssue={selectedIssue}
                      focusKey={mapFocusTrigger}
                      onSelectIssue={(issue) => {
                        setSelectedIssueId(issue.id);
                        setActiveTab("detail");
                      }}
                    />

                    {/* Float ADD floating action trigger */}
                    <button
                      onClick={() => setActiveTab("report")}
                      className="absolute bottom-6 right-6 p-4 bg-primary hover:opacity-90 hover:scale-105 active:scale-95 text-white rounded-full shadow-lg transition border border-primary/30 outline-none z-20 flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white font-extrabold" />
                      REPORT ISSUE
                    </button>
                  </div>

                </div>
              )}

              {/* 2. REPORT CREATION PANEL */}
              {activeTab === "report" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <ReportIssue
                    onIssueCreated={(newIssue) => {
                      handleCreateIssue(newIssue);
                      setSelectedIssueId(newIssue.id);
                    }}
                    onNavigateToDetail={(id) => {
                      setSelectedIssueId(id);
                      setActiveTab("detail");
                    }}
                    user={user}
                    onNavigateToProfile={() => setActiveTab("profile")}
                    wards={wards}
                  />
                </div>
              )}

              {/* 3. ACTIVE ISSUE DNA DETAILS LEDGER */}
              {activeTab === "detail" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <IssueDetails
                    issue={selectedIssue}
                    onBack={() => {
                      setActiveTab("map");
                    }}
                    onUpdateIssue={handleUpdateIssue}
                    onDeleteIssue={handleDeleteIssue}
                    onAwardPoints={handleAwardPoints}
                    wards={wards}
                    user={user}
                  />
                </div>
              )}

              {/* 4. LEADERBOARD TABLE CARD */}
              {activeTab === "scorecard" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <WardScorecard wards={wards} />
                </div>
              )}

              {/* 5. PREDICTIVE HOTSPOTS MATRIX */}
              {activeTab === "predictive" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <PredictiveDashboard issues={issues} />
                </div>
              )}

              {/* 6. GAMIFIED USER SCORE CARD */}
              {activeTab === "profile" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <ProfileScreen user={user} />
                </div>
              )}

              {/* 7. ADMIN PANEL */}
              {activeTab === "admin" && (
                <div className="flex-1 overflow-y-auto bg-surface-900">
                  <AdminPanel
                    issues={issues}
                    onUpdateIssue={handleUpdateIssue}
                    onDeleteIssue={handleDeleteIssue}
                    onClearAllIssues={handleClearAllIssues}
                    wards={wards}
                    onAddMockIssues={(mockIssues) => {
                      // Add simulated mock tickets to issues list and save them
                      mockIssues.forEach(m => handleCreateIssue(m));
                    }}
                    onSaveWard={handleSaveWard}
                    onDeleteWard={handleDeleteWard}
                    user={user}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* 3. FOOTER ACTIVE BOTTOM-RAIL PWA NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex justify-around items-center py-2 px-1 shadow-md md:hidden">
        {[
          { tab: "map", label: "Issues Map", icon: MapIcon },
          { tab: "report", label: "Report", icon: Plus },
          { tab: "scorecard", label: "Wards", icon: BarChart3 },
          { tab: "predictive", label: "Analytics", icon: Cpu },
          { tab: "profile", label: "My Profile", icon: Award },
          ...(user?.email?.toLowerCase() === "surya100406@gmail.com" ? [{ tab: "admin", label: "Admin", icon: Shield }] : [])
        ].map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.tab || (item.tab === "map" && activeTab === "detail");
          return (
            <button
              key={item.tab}
              onClick={() => {
                setActiveTab(item.tab as any);
              }}
              className="flex flex-col items-center justify-center py-1 flex-1 text-center font-mono outline-none cursor-pointer"
            >
              <IconComp className={`w-5 h-5 transition-all duration-300 ${
                isActive ? "text-civic-primary scale-110" : "text-slate-400 hover:text-slate-700"
              }`} />
              <span className={`text-[9px] mt-1 tracking-wider ${
                isActive ? "text-civic-primary font-bold" : "text-slate-400"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* DATABASE SYNCHRONIZATION OVERLAY CONSOLE (Extremely high-end product capability) */}
      <AnimatePresence>
        {showConfigCenter && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-white text-sm font-mono tracking-wide">FIREBASE INTEGRATION CENTRAL</h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">Control live sync with your personalized Firebase client collections</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfigCenter(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Section */}
              <div className="p-5 bg-indigo-950/10 border-b border-slate-800">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${currentActiveConfig ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400"}`}>
                    <Globe className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Current Ingress Tunnel Status</span>
                    <h4 className="font-bold font-mono text-xs text-white">
                      {currentActiveConfig ? "🟢 SYNCHRONIZED CLOUD INGRESS" : "🟡 ISOLATED SANDBOX SIMULATION"}
                    </h4>
                    <p className="text-[10.5px] text-slate-400 leading-normal">
                      {currentActiveConfig 
                        ? `All incident logs, client registrations, and SLA metrics are synced dynamically to project: [${currentActiveConfig.projectId}]`
                        : "The client is executing in an off-grid cache. Close-loop mutations are routed to standard local storage."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Config Form (Read-only for Mass-scale Deployment) */}
              <div className="p-5 space-y-4">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-indigo-400 block mb-1">
                  Database Credentials (Hardcoded)
                </span>

                <div className="grid grid-cols-2 gap-3.5 text-xs font-mono">
                  <div className="space-y-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider">PROJECT ID</span>
                    <span className="text-slate-200 font-semibold">{currentActiveConfig?.projectId || "N/A"}</span>
                  </div>
                  <div className="space-y-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider">FIRESTORE DATABASE</span>
                    <span className="text-slate-200 font-semibold">{currentActiveConfig?.databaseId || "(default)"}</span>
                  </div>
                  <div className="space-y-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg col-span-2">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider">AUTH DOMAIN</span>
                    <span className="text-slate-200 break-all">{currentActiveConfig?.authDomain || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Cloud Database Actions */}
              <div className="p-5 bg-slate-950/20 border-t border-slate-800 space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400 block">
                  Cloud Ledger Maintenance
                </span>
                <p className="text-[10.5px] text-slate-450 leading-normal">
                  Need to populate the remote Firestore collections? Use these controls to force-sync clean municipal default registers.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("This will wipe all existing issues/wards on your remote Firestore database and push the pristine default datasets. Proceed?")) {
                        setIsSyncing(true);
                        try {
                          // Clear remote database collections first
                          await clearAllIssuesRemote();
                          await clearAllWardsRemote();
                          
                          // Force-trigger getIssues and getWards which will automatically perform the pristine seeding
                          await Promise.all([getIssues(), getWards()]);
                          await reloadApplicationData();
                          
                          alert("🎉 Remote Firestore successfully cleared and seeded with default Nagrik registers!");
                        } catch (err: any) {
                          alert("Failed to seed remote database: " + err.message);
                        } finally {
                          setIsSyncing(false);
                        }
                      }
                    }}
                    className="flex-1 min-w-[140px] px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Force-Seed Cloud DB
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Wipe all tickets and wards from both the remote Firestore database and local storage? This cannot be undone.")) {
                        setIsSyncing(true);
                        try {
                          await clearAllIssuesRemote();
                          await clearAllWardsRemote();
                          await reloadApplicationData();
                          alert("💥 Live ledger completely wiped.");
                        } catch (err: any) {
                          alert("Wipe operation failed: " + err.message);
                        } finally {
                          setIsSyncing(false);
                        }
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Cloud DB
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
