import { Issue, Ward, UserProfile } from "./types";

// Seeded Wards data (Rich municipal data for Lucknow)
export const SEEDED_WARDS: Ward[] = [
  {
    id: "ward-lucknow-central",
    name: "Lucknow Central Ward",
    officer: "Shri. Alok Singh (Chief Ward Officer)",
    resolvedCount: 14,
    totalCount: 18,
    slaHitRate: 88
  },
  {
    id: "ward-hazratganj",
    name: "Hazratganj Ward",
    officer: "Smt. Meera Joshi (Senior Sanitation Engineer)",
    resolvedCount: 22,
    totalCount: 25,
    slaHitRate: 92
  },
  {
    id: "ward-gomti-nagar",
    name: "Gomti Nagar Ward",
    officer: "Shri. Rajesh Verma (Public Works Supervisor)",
    resolvedCount: 9,
    totalCount: 15,
    slaHitRate: 78
  },
  {
    id: "ward-aliganj",
    name: "Aliganj Ward",
    officer: "Smt. Pooja Dwivedi (Electrical Grid Officer)",
    resolvedCount: 18,
    totalCount: 20,
    slaHitRate: 90
  }
];

// Department Mapping
export const DEPARTMENTS = {
  "Roads": { id: "dept-roads", name: "Road Maintenance Division", key: "Roads" },
  "Drainage": { id: "dept-drainage", name: "Drainage & Sewerage Board", key: "Drainage" },
  "Electricity/Streetlights": { id: "dept-electric", name: "Electrical & Streetlighting Agency", key: "Electricity/Streetlights" },
  "Sanitation": { id: "dept-sanitation", name: "Sanitation & Solid Waste Management", key: "Sanitation" },
  "Water": { id: "dept-water", name: "Water Supply & Sewerage Board", key: "Water" },
  "Other": { id: "dept-other", name: "General Civic Grievance Cell", key: "Other" }
};

// Seeded coordinate bounding box lookup to wards ( लखनऊ / Lucknow focus )
export function getWardByGeo(lat: number, lng: number, currentWards: Ward[] = SEEDED_WARDS): Ward {
  if (currentWards && currentWards.length > 0) {
    return currentWards[0];
  }
  return { 
    id: "ward-lucknow-central", 
    name: "Lucknow Central Ward", 
    officer: "Shri. Alok Singh (Chief Ward Officer)", 
    resolvedCount: 0, 
    totalCount: 0, 
    slaHitRate: 100 
  };
}

// Coordinate seed focused strictly on Lucknow area
export const CENTER_LAT = 26.8467;
export const CENTER_LNG = 80.9462;

// Seeded active issues list (Detailed Lucknow incident register)
export const SEEDED_ISSUES: Issue[] = [
  {
    id: "seed-issue-1",
    dnaId: "NAG-2026-702",
    title: "Dangerous Uncovered Storm Drain",
    description: "A wide storm drain has been left completely uncovered on the sidewalk corner, presenting a severe risk for children and nighttime pedestrians.",
    category: "Drainage",
    severity: "critical",
    dangerScore: 92,
    photoBefore: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    photoAfter: null,
    geo: { lat: 26.8500, lng: 80.9420 },
    address: "Shahnajaf Road near Hazratganj Crossing, Lucknow",
    wardId: "ward-hazratganj",
    departmentId: "dept-drainage",
    status: "routed",
    slaDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    escalationLevel: 0,
    verifications: 3,
    complaintText: "Dear Officer,\n\nThis is a formal citizen request regarding an uncovered storm drain on Shahnajaf Road, Lucknow. It presents a critical public safety risk.\n\nWarm regards,\nCitizens of Hazratganj",
    rtiText: "",
    socialPostText: "",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    agentLog: [
      {
        id: "step-1",
        agent: "Triage Agent",
        action: "Grievance Classification",
        reasoning: "Ticket submitted by citizen Spotter. Evaluated danger score: 92/100 based on physical hazard of uncovered deep cavity.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "step-2",
        agent: "Routing Agent",
        action: "Assigning to Drainage Department",
        reasoning: "Matched complaint keywords to Drainage & Sewerage Board. Assigned to Hazratganj Ward under Smt. Meera Joshi.",
        timestamp: new Date(Date.now() - 11.8 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "seed-issue-2",
    dnaId: "NAG-2026-441",
    title: "Extreme Cavity Pothole Near Junction",
    description: "A deep, sharp-edged tarmac cavity is situated in the middle of the fast lane. Multiple cars seen bottoming out dangerously.",
    category: "Roads",
    severity: "high",
    dangerScore: 82,
    photoBefore: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    photoAfter: null,
    geo: { lat: 26.8475, lng: 80.9490 },
    address: "Ring Road near Munshi Pulia, Lucknow",
    wardId: "ward-lucknow-central",
    departmentId: "dept-roads",
    status: "acknowledged",
    slaDueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    escalationLevel: 0,
    verifications: 5,
    complaintText: "Dear Officer,\n\nWe are submitting this request concerning a severe pothole near the Munshi Pulia junction. It has been causing vehicle damage and traffic hazards.\n\nWarm regards,\nLucknow Commuters",
    rtiText: "",
    socialPostText: "",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    agentLog: [
      {
        id: "step-1",
        agent: "Triage Agent",
        action: "Grievance Classification",
        reasoning: "Identified high-velocity commuter safety hazard from photos. Category set to Roads, hazard index calculated at 82.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "step-2",
        agent: "Routing Agent",
        action: "Routing to Municipal Roads division",
        reasoning: "Dispatched ticket to Lucknow Central Ward. Acknowledged by Chief Ward Officer Shri. Alok Singh.",
        timestamp: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "seed-issue-3",
    dnaId: "NAG-2026-109",
    title: "Overhead Power Line Sagging Near Canopy",
    description: "A high-voltage power cable has sagged directly into the low canopy of street trees. Sparks visible during wind gusts.",
    category: "Electricity/Streetlights",
    severity: "critical",
    dangerScore: 95,
    photoBefore: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
    photoAfter: null,
    geo: { lat: 26.8530, lng: 80.9480 },
    address: "Sector Q Main Road, Aliganj, Lucknow",
    wardId: "ward-aliganj",
    departmentId: "dept-electric",
    status: "reported",
    slaDueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    escalationLevel: 0,
    verifications: 1,
    complaintText: "Immediate response requested for sagging high tension wires brushing against Gulmohar tree branches in Sector Q, Aliganj.",
    rtiText: "",
    socialPostText: "",
    createdAt: new Date().toISOString(),
    agentLog: [
      {
        id: "step-1",
        agent: "Triage Agent",
        action: "Immediate Danger Assessment",
        reasoning: "Sagging electrical grid cables coupled with spark potential qualifies as a critical 95/100 emergency.",
        timestamp: new Date().toISOString()
      }
    ]
  }
];

// Default clean starting user profile
export const INITIAL_USER: UserProfile = {
  name: "Citizen Lucknow",
  points: 0,
  level: "Spotter",
  verifications: 0
};

// Heatmap points mock data
export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

// Empty heatmap points
export const SEEDED_HEATMAP: HeatmapPoint[] = [];
