import { Issue, Ward, UserProfile } from "./types";

// Seeded Wards data (Empty as requested to remove preseeded data, admins can create them)
export const SEEDED_WARDS: Ward[] = [];

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

// Seeded active issues list (Empty as requested to remove preseeded data)
export const SEEDED_ISSUES: Issue[] = [];

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
