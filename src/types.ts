export interface AgentStep {
  id: string;
  agent: 'Triage Agent' | 'Routing Agent' | 'Escalation Agent' | 'Verification Agent' | 'Predictive Agent';
  action: string;
  toolCall?: string;
  args?: any;
  reasoning: string;
  timestamp: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Issue {
  id: string;
  dnaId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dangerScore: number;
  photoBefore: string; // dataURL
  photoAfter: string | null; // dataURL
  geo: GeoLocation;
  address: string;
  wardId: string;
  departmentId: string;
  status: 'reported' | 'verified' | 'routed' | 'acknowledged' | 'in_progress' | 'fixed' | 'reverified';
  slaDueAt: string; // ISO String
  escalationLevel: number; // 0 to 3
  verifications: number;
  complaintText: string;
  rtiText: string;
  socialPostText: string;
  agentLog: AgentStep[];
  createdAt: string;
}

export interface Ward {
  id: string;
  name: string;
  officer: string;
  resolvedCount: number;
  totalCount: number;
  slaHitRate: number; // e.g., 89 for 89%
}

export interface UserProfile {
  name: string;
  points: number;
  level: 'Spotter' | 'Verifier' | 'Guardian' | 'Hero' | 'Local Legend';
  verifications: number;
  email?: string;
  uid?: string;
  photoURL?: string;
}
