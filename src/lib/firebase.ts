import { Issue, Ward, UserProfile } from "../types";
import { SEEDED_ISSUES, SEEDED_WARDS, INITIAL_USER } from "../data";

// Stub variables and types to maintain full backward compatibility with App.tsx & components
const appletConfig = {};

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId?: string;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error("Local Sandbox Storage Error:", error, operationType, path);
}

// Export blank instances for type safety
export let db: any = null;
export let auth: any = null;
export let activeConfig: CustomFirebaseConfig | null = null;

export const initializeFirebaseService = (config: CustomFirebaseConfig | null = null) => {
  console.log("Database initialized in 100% Free Local Sandbox Mode.");
  return "offline_sandbox";
};

export function isSandbox(): boolean {
  return true;
}

export function getActiveConfig(): CustomFirebaseConfig | null {
  return null;
}

// Local storage backup keys
const L_ISSUES_KEY = "nagrik_cached_issues";
const L_WARDS_KEY = "nagrik_cached_wards";
const L_USER_KEY = "nagrik_cached_user";

// Helper: Seed Local Storage
const getLocalIssues = (): Issue[] => {
  const cached = localStorage.getItem(L_ISSUES_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(SEEDED_ISSUES));
  return SEEDED_ISSUES;
};

const getLocalWards = (): Ward[] => {
  const cached = localStorage.getItem(L_WARDS_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(SEEDED_WARDS));
  return SEEDED_WARDS;
};

const getLocalUserProfile = (): UserProfile => {
  const cached = localStorage.getItem(L_USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  localStorage.setItem(L_USER_KEY, JSON.stringify(INITIAL_USER));
  return INITIAL_USER;
};

// Simulated Authenticators using local storage triggers
export async function loginWithGoogle(): Promise<any> {
  const mockUser = {
    uid: "mock-google-uid-123",
    displayName: "Surya K. (Citizen)",
    email: "surya100406@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"
  };
  localStorage.setItem("NAGRIK_MOCK_AUTH_USER", JSON.stringify(mockUser));

  const savedUser = localStorage.getItem(L_USER_KEY);
  let p = INITIAL_USER;
  if (savedUser) {
    try {
      p = JSON.parse(savedUser);
    } catch (e) {}
  }
  const updatedProfile: UserProfile = {
    ...p,
    name: mockUser.displayName,
    email: mockUser.email,
    uid: mockUser.uid,
    photoURL: mockUser.photoURL
  };
  localStorage.setItem(L_USER_KEY, JSON.stringify(updatedProfile));

  window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));
  return { user: mockUser };
}

export async function loginWithEmail(email: string, password: string): Promise<any> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const displayName = email.split("@")[0];
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const mockUser = {
    uid: "mock-email-uid-456",
    displayName: capitalizedName + " (Citizen)",
    email: email,
    photoURL: ""
  };
  localStorage.setItem("NAGRIK_MOCK_AUTH_USER", JSON.stringify(mockUser));

  const savedUser = localStorage.getItem(L_USER_KEY);
  let p = INITIAL_USER;
  if (savedUser) {
    try {
      p = JSON.parse(savedUser);
    } catch (e) {}
  }
  const updatedProfile: UserProfile = {
    ...p,
    name: mockUser.displayName,
    email: mockUser.email,
    uid: mockUser.uid
  };
  localStorage.setItem(L_USER_KEY, JSON.stringify(updatedProfile));

  window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));
  return { user: mockUser };
}

export async function registerWithEmail(email: string, password: string, displayName: string, role?: "citizen" | "admin"): Promise<any> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const mockUser = {
    uid: "mock-email-uid-456",
    displayName: displayName || (email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1) + " (Citizen)"),
    email: email,
    photoURL: ""
  };
  localStorage.setItem("NAGRIK_MOCK_AUTH_USER", JSON.stringify(mockUser));

  const savedUser = localStorage.getItem(L_USER_KEY);
  let p = INITIAL_USER;
  if (savedUser) {
    try {
      p = JSON.parse(savedUser);
    } catch (e) {}
  }
  const updatedProfile: UserProfile = {
    ...p,
    name: mockUser.displayName,
    email: mockUser.email,
    uid: mockUser.uid,
    role: role || "citizen"
  };
  localStorage.setItem(L_USER_KEY, JSON.stringify(updatedProfile));

  window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));
  return { user: mockUser };
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem("NAGRIK_MOCK_AUTH_USER");

  const savedUser = localStorage.getItem(L_USER_KEY);
  let p = INITIAL_USER;
  if (savedUser) {
    try {
      const current = JSON.parse(savedUser);
      p = { ...current, name: "Surya K. (Citizen)" };
      delete p.email;
      delete p.uid;
      delete p.photoURL;
    } catch (e) {}
  }
  localStorage.setItem(L_USER_KEY, JSON.stringify(p));

  window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));
}

export function onAuthChanged(callback: (user: any | null) => void): () => void {
  const checkState = () => {
    const savedUser = localStorage.getItem("NAGRIK_MOCK_AUTH_USER");
    if (savedUser) {
      try {
        callback(JSON.parse(savedUser));
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
  };

  checkState();

  const handler = (e: Event) => {
    if (e instanceof StorageEvent) {
      if (e.key === "NAGRIK_MOCK_AUTH_USER") {
        checkState();
      }
    } else {
      checkState();
    }
  };

  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener("storage", handler);
  };
}

export async function getIssues(): Promise<Issue[]> {
  return getLocalIssues();
}

export async function clearAllIssuesRemote(): Promise<void> {
  localStorage.removeItem(L_ISSUES_KEY);
}

export async function clearAllWardsRemote(): Promise<void> {
  localStorage.removeItem(L_WARDS_KEY);
}

export async function saveIssue(issue: Issue): Promise<void> {
  const current = getLocalIssues();
  const idx = current.findIndex((i) => i.id === issue.id);
  if (idx >= 0) {
    current[idx] = issue;
  } else {
    current.push(issue);
  }
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("nagrik_data_changed"));
}

export async function getWards(): Promise<Ward[]> {
  return getLocalWards();
}

export async function saveWard(ward: Ward): Promise<void> {
  const current = getLocalWards();
  const idx = current.findIndex((w) => w.id === ward.id);
  if (idx >= 0) {
    current[idx] = ward;
  } else {
    current.push(ward);
  }
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("nagrik_data_changed"));
}

export async function deleteIssue(id: string): Promise<void> {
  const current = getLocalIssues();
  const filtered = current.filter((i) => i.id !== id);
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent("nagrik_data_changed"));
}

export async function deleteWard(id: string): Promise<void> {
  const current = getLocalWards();
  const filtered = current.filter((w) => w.id !== id);
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent("nagrik_data_changed"));
}

export async function forceSeedDatabaseRemote(): Promise<void> {
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(SEEDED_ISSUES));
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(SEEDED_WARDS));
  window.dispatchEvent(new CustomEvent("nagrik_data_changed"));
}

export async function getUserProfile(): Promise<UserProfile> {
  return getLocalUserProfile();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  localStorage.setItem(L_USER_KEY, JSON.stringify(profile));
}
