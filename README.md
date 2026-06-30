# Nagrik

**Nagrik** is an agentic, hyperlocal civic problem solver designed to empower citizens and local governments. By bridging the gap between community complaints and rapid institutional response, Nagrik triages, routes, and auto-escalates municipal issues with high precision.

---

## 🌟 Key Features

### 1. Interactive Hyperlocal Civic Map
*   **Precision Pinpointing:** Features custom-glowing issue markers with aligned anchor settings (`iconAnchor` and `popupAnchor`) to ensure the map centers exactly on report coordinates without offset.
*   **Fluid Navigation:** Uses highly optimized Leaflet viewport transitions (`setView`) to seamlessly focus on targeted issues without bouncing or white-screen tile lag.
*   **Intuitive Popups:** Dynamic informational popups detailing category, description, and status of reported complaints.

### 2. Live Cloud Database Sync (Integrated Firebase)
*   **Real-time Synchronization:** Directly synchronized with a secure remote Firestore database (`ai-studio-5d73721d-9a73-444a-ac15-cfff954ab4cb`) to instantly persist all user-reported complaints and status changes.
*   **No Fragmented Environments:** Removed the manual client-side sandbox toggle to unify the application database. Every user's data flows seamlessly into the integrated Firestore instance.

### 3. Predictive Analytics & Hotspots
*   **Predictive Dashboard:** Leverages smart heuristic algorithms to forecast future municipal hotspots, analyze historical categories, and pinpoint escalating risk levels.
*   **3D Risk Terrain Visualization:** Interactive, mock 3D elevation maps highlighting geographic cluster density and density maps of localized recurring complaints.

### 4. Direct Civic Reporting Suite
*   **Step-by-Step Incident Logging:** Interactive reports where users can pinpoint exact location coordinates on the map.
*   **Citizen Profiles:** Profile dashboard where citizens can track their reported issues, earn civic activity achievements, and monitor ward progress.

### 5. Ward Scorecard & Institutional Accountability
*   **Performance Metrics:** Aggregates resolution turnaround times, ward response rates, and assigns grading marks to motivate public service accountability.
*   **Admin Control Center:** Fully-functional triage dashboard for local administrators to update issue statuses (Pending, In Progress, Resolved) and route escalations.

---

## 🛠️ Architecture & Tech Stack

*   **Frontend:** React (TypeScript) + Vite
*   **Styling:** Tailwind CSS + Lucide Icons
*   **Mapping:** Leaflet & React-Leaflet
*   **Database & Persistence:** Firebase Firestore
*   **Security:** Cloud-deployed Firestore rules ensuring secure and authenticated reads/writes.
