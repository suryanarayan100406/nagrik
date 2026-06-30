import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, doc, setDoc, deleteDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  Auth
} from "firebase/auth";
import { Issue, Ward, UserProfile } from "../types";
import { SEEDED_ISSUES, SEEDED_WARDS, INITIAL_USER } from "../data";
import appletConfig from "../../firebase-applet-config.json";

// Type definitions for custom configuration
export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId?: string;
}

// 1. Retrieve config from env or localStorage (strictly hardcoded for mass-scale consistency)
const getInitialConfig = (): CustomFirebaseConfig | null => {
  // Check VITE environment variables or static config file
  const envConfig: CustomFirebaseConfig = {
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || appletConfig?.apiKey || "",
    authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || appletConfig?.authDomain || "",
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || appletConfig?.projectId || "",
    storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || appletConfig?.storageBucket || "",
    messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig?.messagingSenderId || "",
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || appletConfig?.appId || "",
    databaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || (appletConfig as any)?.firestoreDatabaseId || "",
  };

  if (envConfig.projectId && envConfig.apiKey) {
    return envConfig;
  }

  return null;
};

let appInstance: any = null;
let firestoreInstance: any = null;
let authInstance: Auth | null = null;
let activeConfig: CustomFirebaseConfig | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || null,
      email: authInstance?.currentUser?.email || null,
      emailVerified: authInstance?.currentUser?.emailVerified || null,
      isAnonymous: authInstance?.currentUser?.isAnonymous || null,
      tenantId: authInstance?.currentUser?.tenantId || null,
      providerInfo: authInstance?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonErrorStr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonErrorStr);
  throw new Error(jsonErrorStr);
}

// Initialize Firebase dynamically based on current configuration
export const initializeFirebaseService = (config: CustomFirebaseConfig | null = null) => {
  const targetConfig = config || getInitialConfig();
  
  if (!targetConfig) {
    appInstance = null;
    firestoreInstance = null;
    authInstance = null;
    activeConfig = null;
    return false;
  }

  const dbId = targetConfig.databaseId || undefined;

  try {
    if (getApps().length > 0) {
      appInstance = getApp();
      if (activeConfig && (activeConfig.projectId !== targetConfig.projectId || activeConfig.databaseId !== targetConfig.databaseId)) {
        deleteApp(appInstance).catch(console.error);
        appInstance = initializeApp(targetConfig);
      }
    } else {
      appInstance = initializeApp(targetConfig);
    }
    
    firestoreInstance = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    activeConfig = targetConfig;
    
    console.log("Firebase initialized successfully with project ID:", targetConfig.projectId, "and DB:", dbId || "(default)");
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase with current configuration:", error);
    try {
      appInstance = getApp();
      firestoreInstance = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);
      authInstance = getAuth(appInstance);
      activeConfig = targetConfig;
      return true;
    } catch (innerError) {
      appInstance = null;
      firestoreInstance = null;
      authInstance = null;
      activeConfig = null;
      return false;
    }
  }
};

// Run initial setup
initializeFirebaseService();

export function isSandbox(): boolean {
  return false;
}

export function getActiveConfig(): CustomFirebaseConfig | null {
  return activeConfig;
}

export { firestoreInstance as db, authInstance as auth, activeConfig };

// --- Auth Helpers (Real and Responsive Sandbox Fallback) ---

export async function loginWithGoogle(): Promise<any> {
  if (!authInstance || isSandbox()) {
    console.log("Using Mock Google Login in Local Sandbox Mode");
    const mockUser = {
      uid: "mock-google-uid-123",
      displayName: "Surya K. (Google Guardian)",
      email: "surya.google@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"
    };
    localStorage.setItem("NAGRIK_MOCK_AUTH_USER", JSON.stringify(mockUser));
    
    // Also save it under our user profile mechanism so the rest of the app reacts instantly
    const savedUser = localStorage.getItem(L_USER_KEY);
    let p = INITIAL_USER;
    if (savedUser) {
      try { p = JSON.parse(savedUser); } catch(e){}
    }
    const updatedProfile: UserProfile = {
      ...p,
      name: mockUser.displayName,
      email: mockUser.email,
      uid: mockUser.uid,
      photoURL: mockUser.photoURL
    };
    localStorage.setItem(L_USER_KEY, JSON.stringify(updatedProfile));
    
    // Dispatch a storage event manually to trigger states across modules
    window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));
    return { user: mockUser };
  }
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(authInstance, provider);
  } catch (error: any) {
    console.error("Google Sign-In failed:", error);
    if (error.code === "auth/unauthorized-domain" || (error.message && error.message.includes("unauthorized-domain"))) {
      throw new Error("This preview sandbox domain is not added to Firebase Auth authorized domains. Please use the 'Email & Password' sign-up option to test secure cloud sync!");
    }
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<any> {
  if (!authInstance || isSandbox()) {
    console.log("Using Mock Email Login in Local Sandbox Mode");
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
      try { p = JSON.parse(savedUser); } catch(e){}
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
  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<any> {
  if (!authInstance || isSandbox()) {
    console.log("Using Mock Email Registration in Local Sandbox Mode");
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
      try { p = JSON.parse(savedUser); } catch(e){}
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
  const credential = await createUserWithEmailAndPassword(authInstance, email, password);
  if (credential.user && displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential;
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem("NAGRIK_MOCK_AUTH_USER");
  
  // Reset cached user details to initial blank
  const savedUser = localStorage.getItem(L_USER_KEY);
  let p = INITIAL_USER;
  if (savedUser) {
    try {
      const current = JSON.parse(savedUser);
      // Retain points & verification, only wipe details
      p = { ...current, name: "Surya K. (Citizen)" };
      delete p.email;
      delete p.uid;
      delete p.photoURL;
    } catch(e){}
  }
  localStorage.setItem(L_USER_KEY, JSON.stringify(p));

  window.dispatchEvent(new StorageEvent("storage", { key: "NAGRIK_MOCK_AUTH_USER" }));

  if (!authInstance || isSandbox()) {
    console.log("Logged out Mock User in Local Sandbox Mode");
    return;
  }
  await signOut(authInstance);
}

export function onAuthChanged(callback: (user: any | null) => void): () => void {
  let unsubscribeReal: (() => void) | null = null;

  const checkState = () => {
    if (!authInstance || isSandbox()) {
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
    } else {
      if (!unsubscribeReal && authInstance) {
        unsubscribeReal = onAuthStateChanged(authInstance, (firebaseUser) => {
          if (!isSandbox()) {
            if (firebaseUser) {
              callback({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || ""
              });
            } else {
              callback(null);
            }
          }
        });
      }
    }
  };

  checkState();

  const handler = (e: Event) => {
    if (e instanceof StorageEvent) {
      if (e.key === "NAGRIK_MOCK_AUTH_USER" || e.key === "NAGRIK_FORCE_SANDBOX") {
        checkState();
      }
    } else {
      checkState();
    }
  };

  window.addEventListener("storage", handler);
  window.addEventListener("storage_sandbox_changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("storage_sandbox_changed", handler);
    if (unsubscribeReal) {
      unsubscribeReal();
    }
  };
}

// =========================================================
// DATA ACCESS PERSISTENCE ENGINE (UNIFIED CLIENT / FIRESTORE)
// =========================================================

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
    } catch (e) { }
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
    } catch (e) { }
  }
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(SEEDED_WARDS));
  return SEEDED_WARDS;
};

const getLocalUserProfile = (): UserProfile => {
  const cached = localStorage.getItem(L_USER_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }
  localStorage.setItem(L_USER_KEY, JSON.stringify(INITIAL_USER));
  return INITIAL_USER;
};

// Helper to strip undefined values so Firestore does not throw invalid data errors
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

// Helper to enforce a timeout on Firestore operations so they never hang the main thread
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 1000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout waiting for Firestore response"));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// --- SERVICES ---

// Issues
export async function getIssues(): Promise<Issue[]> {
  if (firestoreInstance && !isSandbox()) {
    try {
      const colRef = collection(firestoreInstance, "issues");
      const snap = await withTimeout(getDocs(colRef), 4000);
      if (snap.empty) {
        console.log("Firestore issues empty! Seeding default issues directly to Firestore...");
        for (const localIssue of SEEDED_ISSUES) {
          try {
            await withTimeout(setDoc(doc(colRef, localIssue.id), sanitizeForFirestore(localIssue)), 2000);
          } catch (e: any) {
            console.warn(`Failed to seed issue ${localIssue.id}:`, e);
          }
        }
        localStorage.setItem(L_ISSUES_KEY, JSON.stringify(SEEDED_ISSUES));
        return SEEDED_ISSUES;
      }
      const issues: Issue[] = [];
      snap.forEach((docSnap) => {
        issues.push(docSnap.data() as Issue);
      });
      
      const sortedIssues = issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Update local storage silent cache only for offline readiness
      localStorage.setItem(L_ISSUES_KEY, JSON.stringify(sortedIssues));
      return sortedIssues;
    } catch (e: any) {
      console.error("Firestore getIssues error:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.LIST, "issues");
      }
      return getLocalIssues();
    }
  }
  return getLocalIssues();
}

export async function clearAllIssuesRemote(): Promise<void> {
  // Clear local storage cache
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify([]));
  
  if (firestoreInstance && !isSandbox()) {
    try {
      const colRef = collection(firestoreInstance, "issues");
      const snap = await getDocs(colRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(firestoreInstance, "issues", docSnap.id));
      }
      console.log("Remote Firestore issues successfully cleared.");
    } catch (e: any) {
      console.error("Failed to clear remote issues:", e);
    }
  }
}

export async function clearAllWardsRemote(): Promise<void> {
  localStorage.setItem(L_WARDS_KEY, JSON.stringify([]));
  if (firestoreInstance && !isSandbox()) {
    try {
      const colRef = collection(firestoreInstance, "wards");
      const snap = await getDocs(colRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(firestoreInstance, "wards", docSnap.id));
      }
      console.log("Remote Firestore wards successfully cleared.");
    } catch (e: any) {
      console.error("Failed to clear remote wards:", e);
    }
  }
}

// One-time setup check for local state initialization
if (typeof window !== "undefined" && !localStorage.getItem("nagrik_db_cleaned_v5")) {
  localStorage.setItem("nagrik_db_cleaned_v5", "true");
}

export async function saveIssue(issue: Issue): Promise<void> {
  // Sync to Firestore if operational
  if (firestoreInstance && !isSandbox()) {
    try {
      const docRef = doc(firestoreInstance, "issues", issue.id);
      await setDoc(docRef, sanitizeForFirestore(issue));
      console.log("Firestore synced issue:", issue.id);
    } catch (e: any) {
      console.error("Firestore sync issue failed:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.WRITE, `issues/${issue.id}`);
      }
      throw e;
    }
  }

  // Update local storage silent cache for local consistency
  const locals = getLocalIssues();
  const index = locals.findIndex(i => i.id === issue.id);
  if (index >= 0) {
    locals[index] = issue;
  } else {
    locals.unshift(issue);
  }
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(locals));
}

// Wards
export async function getWards(): Promise<Ward[]> {
  if (firestoreInstance && !isSandbox()) {
    try {
      const colRef = collection(firestoreInstance, "wards");
      const snap = await withTimeout(getDocs(colRef), 4000);
      if (snap.empty) {
        console.log("Firestore wards empty! Seeding default wards directly to Firestore...");
        for (const localWard of SEEDED_WARDS) {
          try {
            await withTimeout(setDoc(doc(colRef, localWard.id), sanitizeForFirestore(localWard)), 2000);
          } catch (e: any) {
            console.warn(`Failed to seed ward ${localWard.id}:`, e);
          }
        }
        localStorage.setItem(L_WARDS_KEY, JSON.stringify(SEEDED_WARDS));
        return SEEDED_WARDS;
      }
      const wards: Ward[] = [];
      snap.forEach((docSnap) => {
        wards.push(docSnap.data() as Ward);
      });
      
      localStorage.setItem(L_WARDS_KEY, JSON.stringify(wards));
      return wards;
    } catch (e: any) {
      console.error("Firestore getWards error:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.LIST, "wards");
      }
      return getLocalWards();
    }
  }
  return getLocalWards();
}

export async function saveWard(ward: Ward): Promise<void> {
  if (firestoreInstance && !isSandbox()) {
    try {
      const docRef = doc(firestoreInstance, "wards", ward.id);
      await setDoc(docRef, sanitizeForFirestore(ward));
    } catch (e: any) {
      console.error("Firestore sync ward failed:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.WRITE, `wards/${ward.id}`);
      }
      throw e;
    }
  }

  const locals = getLocalWards();
  const index = locals.findIndex(w => w.id === ward.id);
  if (index >= 0) {
    locals[index] = ward;
  } else {
    locals.push(ward);
  }
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(locals));
}

export async function deleteIssue(id: string): Promise<void> {
  if (firestoreInstance && !isSandbox()) {
    try {
      const docRef = doc(firestoreInstance, "issues", id);
      await deleteDoc(docRef);
      console.log("Firestore successfully deleted issue:", id);
    } catch (e: any) {
      console.error("Firestore delete issue failed:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.DELETE, `issues/${id}`);
      }
      throw e;
    }
  }

  const locals = getLocalIssues();
  const updated = locals.filter(i => i.id !== id);
  localStorage.setItem(L_ISSUES_KEY, JSON.stringify(updated));
}

export async function deleteWard(id: string): Promise<void> {
  if (firestoreInstance && !isSandbox()) {
    try {
      const docRef = doc(firestoreInstance, "wards", id);
      await deleteDoc(docRef);
    } catch (e: any) {
      console.error("Firestore delete ward failed:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.DELETE, `wards/${id}`);
      }
      throw e;
    }
  }

  const locals = getLocalWards();
  const updated = locals.filter(w => w.id !== id);
  localStorage.setItem(L_WARDS_KEY, JSON.stringify(updated));
}

// User Profile
export async function getUserProfile(): Promise<UserProfile> {
  if (firestoreInstance && authInstance?.currentUser && !isSandbox()) {
    try {
      const uid = authInstance.currentUser.uid;
      const docRef = doc(firestoreInstance, "profile", uid);
      const docSnap = await withTimeout(getDoc(docRef), 2000);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        localStorage.setItem(L_USER_KEY, JSON.stringify(profile));
        return profile;
      } else {
        const local = getLocalUserProfile();
        local.uid = uid;
        local.email = authInstance.currentUser.email || undefined;
        try {
          await withTimeout(setDoc(docRef, sanitizeForFirestore(local)), 2000);
        } catch (e: any) {
          console.warn("Failed to seed user profile:", e);
        }
        localStorage.setItem(L_USER_KEY, JSON.stringify(local));
        return local;
      }
    } catch (e: any) {
      console.error("Firestore getUserProfile error:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.GET, `profile/${authInstance.currentUser.uid}`);
      }
      return getLocalUserProfile();
    }
  }
  return getLocalUserProfile();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (firestoreInstance && authInstance?.currentUser && !isSandbox()) {
    try {
      const uid = authInstance.currentUser.uid;
      const docRef = doc(firestoreInstance, "profile", uid);
      await setDoc(docRef, sanitizeForFirestore(profile));
    } catch (e: any) {
      console.error("Firestore sync profile failed:", e);
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Permission")) {
        handleFirestoreError(e, OperationType.WRITE, `profile/${authInstance.currentUser.uid}`);
      }
      throw e;
    }
  }

  localStorage.setItem(L_USER_KEY, JSON.stringify(profile));
}
