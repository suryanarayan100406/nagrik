import { Ward } from "../types";
import { SEEDED_WARDS } from "../data";
import { Award, BarChart3, TrendingUp, CheckCircle, ShieldAlert, Users } from "lucide-react";

interface WardScorecardProps {
  wards: Ward[];
}

export default function WardScorecard({ wards = SEEDED_WARDS }: WardScorecardProps) {
  // Sort wards list dynamically by SLA resolution rate (descending)
  const sortedWards = [...wards].sort((a, b) => b.slaHitRate - a.slaHitRate);

  if (wards.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto py-24 px-4 text-center animate-fade-in text-text-primary">
        <div className="bg-surface-800 border border-hairline rounded-2xl p-12 shadow-sm space-y-4 max-w-lg mx-auto">
          <BarChart3 className="w-12 h-12 text-text-secondary mx-auto opacity-40 animate-pulse" />
          <h2 className="text-lg font-semibold tracking-tight text-text-primary font-sans">No Active Wards</h2>
          <p className="text-xs text-text-secondary font-sans leading-relaxed">
            There are no municipal wards defined yet. Please head to the Admin Control Panel to establish your local wards.
          </p>
        </div>
      </div>
    );
  }

  // General administrative aggregate calculators
  const sumResolved = wards.reduce((sum, w) => sum + w.resolvedCount, 0);
  const sumTotal = wards.reduce((sum, w) => sum + w.totalCount, 0);
  const avgSla = Math.floor(wards.reduce((sum, w) => sum + w.slaHitRate, 0) / (wards.length || 1));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pt-4 pb-16 px-4 animate-fade-in text-text-primary">
      
      {/* Scorecard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-primary font-mono text-xs font-semibold tracking-wider uppercase">
            Performance Overview
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2 mt-1.5 font-display">
            <BarChart3 className="w-6 h-6 text-primary" />
            Ward Resolution Scorecard
          </h2>
          <p className="text-text-secondary text-sm mt-1.5 max-w-xl">
            A transparent overview tracking municipal SLA compliance rates, registered issues, and resolution speeds across all active wards.
          </p>
        </div>
      </div>

      {/* Aggregate KPI grid blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* KPI 1 */}
        <div className="bg-surface-800 border border-hairline p-5 rounded-2xl flex items-center gap-4 premium-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block font-medium">SLA Resolution Rate</span>
            <span className="text-xl font-bold text-text-primary font-mono mt-0.5 block">{avgSla}%</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-800 border border-hairline p-5 rounded-2xl flex items-center gap-4 premium-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block font-medium">Completed Issues</span>
            <span className="text-xl font-bold text-text-primary font-mono mt-0.5 block">
              {sumResolved} <span className="text-xs text-text-secondary font-normal">/ {sumTotal} reported</span>
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-800 border border-hairline p-5 rounded-2xl flex items-center gap-4 premium-card">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block font-medium">Top Performing Sector</span>
            <span className="text-sm font-bold text-text-primary block mt-1 truncate">{sortedWards[0]?.name.split(" - ")[1] || "Ward 12"}</span>
          </div>
        </div>

      </div>

      {/* Styled Grid list of wards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-mono font-medium tracking-wider uppercase text-text-tertiary flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Ward Leaderboard and Metrics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedWards.map((ward, index) => {
            const isTop = index === 0;
            const isUnderperforming = ward.slaHitRate < 50;

            return (
              <div 
                key={ward.id}
                className="bg-surface-800 border border-hairline p-5 rounded-2xl flex flex-col justify-between premium-card relative overflow-hidden"
              >
                {/* Visual Rank Flag */}
                <div className="absolute top-4 right-4 text-xs font-mono text-text-tertiary font-bold">
                  #{index + 1}
                </div>

                <div className="space-y-4">
                  {/* Top segment */}
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isTop 
                        ? "bg-primary/10 border-primary/20 text-primary" 
                        : isUnderperforming
                        ? "bg-accent/10 border-accent/20 text-accent"
                        : "bg-surface-700 border-hairline text-text-secondary"
                    }`}>
                      {isTop ? <Award className="w-4 h-4" /> : isUnderperforming ? <ShieldAlert className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 pr-6">
                      <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-primary block">
                        {ward.name.split(" - ")[0]}
                      </span>
                      <h4 className="text-sm font-semibold text-text-primary mt-0.5 truncate">
                        {ward.name.split(" - ")[1]}
                      </h4>
                      <p className="text-[10px] text-text-secondary font-mono mt-0.5 truncate">
                        Officer: {ward.officer}
                      </p>
                    </div>
                  </div>

                  {/* SLA Compliancy Meter */}
                  <div className="space-y-1.5 bg-surface-900/50 p-3 rounded-xl border border-hairline">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-wider">SLA compliance rate</span>
                      <span className={`font-mono font-bold ${
                        isUnderperforming ? "text-accent" : "text-primary"
                      }`}>
                        {ward.slaHitRate}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-700 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          isUnderperforming ? "bg-accent" : "bg-primary"
                        }`}
                        style={{ width: `${ward.slaHitRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom stats indicators */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-hairline text-[10px] font-mono">
                  <span className="text-text-tertiary uppercase tracking-wider">
                    {isUnderperforming ? "Needs Attention" : isTop ? "Top Performance" : "Active Service"}
                  </span>
                  <div className="font-bold text-text-primary">
                    {ward.resolvedCount} <span className="text-text-tertiary font-normal">/ {ward.totalCount} resolved</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
