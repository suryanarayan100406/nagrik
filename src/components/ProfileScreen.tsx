import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  Award, Shield, CheckCircle, Flame, Star, Sparkles, TrendingUp, 
  Heart, Info, Mail, Lock, User, LogIn, UserPlus, LogOut, ArrowRight, ShieldAlert
} from "lucide-react";
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser 
} from "../lib/firebase";

interface ProfileScreenProps {
  user: UserProfile | null;
}

export default function ProfileScreen({ user }: ProfileScreenProps) {
  // Determine level threshold progress
  const thresholds = {
    Spotter: { min: 0, max: 200, next: "Verifier" },
    Verifier: { min: 201, max: 600, next: "Guardian" },
    Guardian: { min: 601, max: 1200, next: "Hero" },
    Hero: { min: 1201, max: 2500, next: "Local Legend" },
    "Local Legend": { min: 2501, max: 99999, next: "Max Tier Unlocked" }
  };

  const levelInfo = thresholds[user?.level || "Spotter"] || thresholds["Spotter"];
  const progressPercent = Math.min(100, Math.floor((((user?.points || 0) - levelInfo.min) / (levelInfo.max - levelInfo.min)) * 100));

  // Achievement badges mock
  const badges = [
    { id: "badge-1", name: "First Responder", desc: "Reported initial hyperlocal hazard", unlocked: (user?.points || 0) > 100 },
    { id: "badge-2", name: "Civic Verifier", desc: "Verified 5+ community complaints", unlocked: (user?.verifications || 0) >= 5 },
    { id: "badge-3", name: "SLA Auditor", desc: "Escalated a ticket past standard SLA", unlocked: (user?.points || 0) > 800 },
    { id: "badge-4", name: "Visual Warden", desc: "Successfully resolved issue via Before/After proof photo", unlocked: (user?.points || 0) > 1200 },
    { id: "badge-5", name: "Local Vanguard", desc: "Achieved the Local Legend rank tier", unlocked: user?.level === "Local Legend" }
  ];

  // Auth local states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth actions
  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to Sign In with Google.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please fill in all standard identity fields.");
      return;
    }
    if (isSignUp && !displayName) {
      setErrorMsg("Please enter your display name.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Your password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Authentication error. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      await logoutUser();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to Sign Out.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is NOT logged in (doesn't have uid / email) we show the beautiful onboarding portal
  if (!user || !user.email) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4 text-text-primary flex flex-col justify-center min-h-[580px] animate-fade-in">
        <div className="bg-surface-800 border border-hairline rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 premium-card">
          
          {/* Ambient header design */}
          <div className="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-brand-orange-500 to-[#E07A5F]"></div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-surface-900 border border-hairline rounded-xl flex items-center justify-center text-brand-orange-500 font-extrabold mx-auto shadow-sm">
              <LogIn className="w-6 h-6 text-brand-orange-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary font-sans mt-3">
              {isSignUp ? "Create your Civic Identity" : "Verify Civic Account"}
            </h2>
            <p className="text-xs text-text-secondary max-w-sm mx-auto font-sans leading-normal">
              Sign up or log in to sync your verified reports across active terminals, preserve community points, and earn achievements.
            </p>
          </div>

          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-sans">
            🌐 Live Firebase Mode: Directly synchronized with the remote Firestore database.
          </div>

          {/* Social Google Trigger */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-surface-900 hover:bg-surface-700 transition rounded-xl border border-hairline font-medium text-xs text-text-primary flex items-center justify-center gap-3 shadow-sm cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22-.19-.6z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Separator block */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-hairline"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono text-text-tertiary uppercase tracking-widest">or email workflow</span>
            <div className="flex-grow border-t border-hairline"></div>
          </div>

          {/* Form input controls */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {/* Display Name Input (Only on Sign Up) */}
            {isSignUp && (
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono font-bold text-text-tertiary uppercase tracking-widest block font-sans">Display Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-surface-900 border border-hairline rounded-xl py-2.5 pl-10 pr-4 text-xs text-text-primary focus:border-brand-orange-500 focus:outline-none transition font-sans placeholder-text-tertiary"
                  />
                </div>
              </div>
            )}

            {/* Email Address Input */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono font-bold text-text-tertiary uppercase tracking-widest block font-sans">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-surface-900 border border-hairline rounded-xl py-2.5 pl-10 pr-4 text-xs text-text-primary focus:border-brand-orange-500 focus:outline-none transition font-sans placeholder-text-tertiary"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-text-tertiary uppercase tracking-widest block font-sans">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-900 border border-hairline rounded-xl py-2.5 pl-10 pr-4 text-xs text-text-primary focus:border-brand-orange-500 focus:outline-none transition font-sans placeholder-text-tertiary"
                />
              </div>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex gap-2 font-sans items-start">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Trigger Buttons */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-orange-500 to-[#E07A5F] hover:opacity-90 active:scale-98 transition text-xs font-semibold text-white rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed border-0"
            >
              {isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4 text-white" />
                  Create Free Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-white" />
                  Access Account
                </>
              )}
            </button>
          </form>

          {/* Toggle Modes link */}
          <div className="text-center pt-2">
            <span className="text-xs text-text-secondary mr-1.5 font-sans">
              {isSignUp ? "Already have a civic account?" : "Brand new to active local reports?"}
            </span>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-xs font-bold text-brand-orange-500 hover:text-brand-orange-500/80 font-sans cursor-pointer underline bg-transparent border-0"
            >
              {isSignUp ? "Sign In Instead" : "Register / Sign Up Here"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // If user IS logged in, we render their rich gamified profile screen
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pt-4 pb-16 px-4 animate-fade-in text-text-primary">
      
      {/* Profile Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-primary font-mono text-xs font-semibold tracking-wider uppercase">
            Citizen Dashboard
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2 mt-1.5 font-display">
            Nagrik Hero Profile
          </h2>
          <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
            Hyperlocal citizen reward portal tracking witness logs, stewardship points, and active municipal achievements.
          </p>
        </div>

        {/* Sync Profile Badge / Logout */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="bg-surface-800 border border-hairline rounded-xl px-3 py-1.5 text-xs text-text-secondary font-mono hidden sm:block">
            Logged as: <span className="text-text-primary font-semibold">{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 bg-surface-800 hover:bg-slate-50 border border-hairline text-xs text-text-primary font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
          >
            <LogOut className="w-3.5 h-3.5 text-text-secondary" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Core Gamer Slate Card - Themed with minimal accents */}
        <div className="md:col-span-5 flex flex-col">
          <div className="bg-surface-800 border border-hairline rounded-2xl p-6 flex-grow flex flex-col justify-between space-y-6 relative overflow-hidden">

            {/* Avatar block */}
            <div className="space-y-4 text-center">
              {user.photoURL ? (
                <div className="w-16 h-16 rounded-full border border-hairline shadow-sm mx-auto overflow-hidden">
                  <img src={user.photoURL} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-900 border border-hairline flex items-center justify-center text-primary mx-auto">
                  <Star className="w-5 h-5 text-primary" />
                </div>
              )}
              
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary tracking-tight">{user.name}</h3>
                <span className="text-[10px] text-text-tertiary font-mono block truncate max-w-xs mx-auto">{user.email}</span>
                <div className="inline-block mt-2 px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                  Rank: {user.level}
                </div>
              </div>
            </div>

            {/* Threshold Progress Bar elements */}
            <div className="w-full bg-surface-900 p-4 rounded-xl border border-hairline space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-text-tertiary">
                <span className="uppercase font-bold tracking-wider">XP Progress</span>
                <span className="text-text-primary font-bold">{user.points} / {levelInfo.max} pts</span>
              </div>

              {/* Progress Slider Bar */}
              <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <span className="text-[10px] font-mono text-text-secondary block text-center">
                {progressPercent}% completed to reach <strong className="text-primary">{levelInfo.next}</strong> rank
              </span>
            </div>

            {/* Statistics Row Grid */}
            <div className="grid grid-cols-2 gap-3 w-full text-[10px] font-mono">
              <div className="bg-surface-900 p-3 rounded-xl border border-hairline text-center">
                <span className="text-text-tertiary block font-bold tracking-wider uppercase">XP Points</span>
                <span className="text-lg font-semibold text-text-primary mt-1 block">{user.points}</span>
              </div>
              <div className="bg-surface-900 p-3 rounded-xl border border-hairline text-center">
                <span className="text-text-tertiary block font-bold tracking-wider uppercase">Witness Attests</span>
                <span className="text-lg font-semibold text-text-primary mt-1 block">{user.verifications}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Achievements & Unlocked badges list */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="bg-surface-800 border border-hairline rounded-2xl p-6 flex-grow flex flex-col">
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider block mb-4 border-b border-hairline pb-2">
              Unlocked Hero Achievements
            </span>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {badges.map((badge) => (
                <div 
                  key={badge.id}
                  className={`flex gap-3 items-center p-3 rounded-xl border transition ${
                    badge.unlocked 
                      ? "bg-surface-900 border-hairline text-text-primary" 
                      : "bg-surface-950/40 border-hairline text-text-tertiary opacity-40"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition ${
                    badge.unlocked 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-surface-900 border-hairline text-text-tertiary"
                  }`}>
                    {badge.unlocked ? <Sparkles className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-text-tertiary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-xs font-mono font-semibold ${badge.unlocked ? "text-primary" : "text-text-tertiary"}`}>
                      {badge.name}
                    </h4>
                    <p className="text-[10px] text-text-secondary leading-normal mt-0.5 truncate">{badge.desc}</p>
                  </div>
                  {badge.unlocked && (
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded shrink-0">
                      UNLOCKED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gamified disclaimer advisory card */}
          <div className="bg-surface-800 border border-hairline rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-text-secondary">
            <Award className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-primary block">Attribution & Level-Up Rules</span>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                XP is awarded on report submissions (+50), verifying existing complaints (+15), and uploading before/after proof images (+150). Help keep Lucknow clean to earn the Local Legend title.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
