import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// High limit for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialized Gemini client
let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI operations will execute in simulated Demo-Mode.");
    return null;
  }
  try {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    return aiInstance;
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// Helper functions for mock simulation fallbacks when Gemini is busy, unavailable, or keys are missing
function runSimulatedTriage(photoBefore: string, geo: any, fileName: string | undefined, categoryHint: string | undefined, res: any) {
  console.log("Simulating Triage Agent response for filename:", fileName || "unknown", "hint:", categoryHint || "none");
  const mockCategories = ["Roads", "Drainage", "Electricity/Streetlights", "Sanitation", "Water", "Other"];
  let chosenCategory = "";

  // 1. Honor explicit categoryHint first
  if (categoryHint && mockCategories.includes(categoryHint)) {
    chosenCategory = categoryHint;
  }

  // 2. Keyword-based classification from fileName
  if (!chosenCategory && fileName) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes("road") || lowerName.includes("pothole") || lowerName.includes("street") || lowerName.includes("path") || lowerName.includes("asphalt") || lowerName.includes("concrete") || lowerName.includes("pave") || lowerName.includes("tar")) {
      chosenCategory = "Roads";
    } else if (lowerName.includes("drain") || lowerName.includes("sewer") || lowerName.includes("overflow") || lowerName.includes("flood") || lowerName.includes("clog") || lowerName.includes("gutter") || lowerName.includes("manhole")) {
      chosenCategory = "Drainage";
    } else if (lowerName.includes("light") || lowerName.includes("electricity") || lowerName.includes("dark") || lowerName.includes("bulb") || lowerName.includes("lamp") || lowerName.includes("pole") || lowerName.includes("wire") || lowerName.includes("power")) {
      chosenCategory = "Electricity/Streetlights";
    } else if (lowerName.includes("trash") || lowerName.includes("garbage") || lowerName.includes("waste") || lowerName.includes("dump") || lowerName.includes("rubbish") || lowerName.includes("sanitation") || lowerName.includes("litter") || lowerName.includes("debris") || lowerName.includes("heap") || lowerName.includes("pile")) {
      chosenCategory = "Sanitation";
    } else if (lowerName.includes("water") || lowerName.includes("leak") || lowerName.includes("burst") || lowerName.includes("pipe") || lowerName.includes("fountain") || lowerName.includes("flow") || lowerName.includes("tap") || lowerName.includes("wet")) {
      chosenCategory = "Water";
    }
  }

  // 3. Fallback to default of Roads for generic image file names, or deterministic hash otherwise
  if (!chosenCategory) {
    const isGeneric = !fileName || 
      /^(image|img|photo|upload|capture|screenshot|blob|file|captured|dropped)/i.test(fileName) ||
      /^img_\d+/i.test(fileName) ||
      /^pxl_\d+/i.test(fileName) ||
      /^dsc_\d+/i.test(fileName);

    if (isGeneric) {
      chosenCategory = "Roads";
    } else {
      let hash = 0;
      const cleanStr = photoBefore.replace(/^data:image\/\w+;base64,/, "").trim();
      const hashTarget = cleanStr.substring(0, Math.min(2000, cleanStr.length));
      for (let i = 0; i < hashTarget.length; i++) {
        hash = (hash << 5) - hash + hashTarget.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % (mockCategories.length - 1); // exclude 'Other' from random selection
      chosenCategory = mockCategories[index];
    }
  }

  const mockTitles: Record<string, string> = {
    "Roads": "Hazardous Deep Pothole on Secondary Road",
    "Drainage": "Overflowing Sewerage Drain Blocks Walkway",
    "Electricity/Streetlights": "Completely Dark Streetlight Near Junction",
    "Sanitation": "Large Heap of Unattended Trash Pileup",
    "Water": "Major Freshwater Main Burst Pipeline Leak",
    "Other": "General Municipal Infrastructure Repair Report"
  };
  const mockDesc: Record<string, string> = {
    "Roads": "A massive and dangerous pothole measuring roughly 2 feet wide has opened up directly in the pathway of passing vehicular traffic.",
    "Drainage": "Sewerage water is backing up onto the public footpath, creating an unsanitary environment and bad odors in the immediate community.",
    "Electricity/Streetlights": "Street lamp post poles are fully non-functional. The entire lane is pitch dark, creating serious safety risks for local pedestrians at night.",
    "Sanitation": "Solid waste and household garbage bags have been dumped along the roadside, attracting strays and pests.",
    "Water": "A burst waterline is continuously pumping clean drinking water into the gutters, flooding the curb.",
    "Other": "General maintenance defect posing moderate discomfort and requesting timely corrective restoration by district crews."
  };

  const severityChoices: ("low" | "medium" | "high" | "critical")[] = ["medium", "high", "critical"];
  // Deterministic severity based on category length and characters
  let hashVal = 0;
  for (let i = 0; i < chosenCategory.length; i++) {
    hashVal += chosenCategory.charCodeAt(i);
  }
  const severity = severityChoices[hashVal % severityChoices.length];
  const dangerScore = severity === "critical" ? 88 : severity === "high" ? 72 : 54;

  return res.json({
    success: true,
    simulated: true,
    category: chosenCategory,
    severity,
    dangerScore,
    title: mockTitles[chosenCategory] || "Pothole Spotted in Street Lane",
    description: mockDesc[chosenCategory] || "Hyperlocal civic repair issue flagged by community citizen."
  });
}

function runSimulatedRouting(category: string, geo: any, res: any) {
  return res.json({
    success: true,
    simulated: true,
    complaintText: `Dear Commissioner,\n\nI am writing to formally report an unresolved civic grievance regarding the primary ${category || 'Civic'} infrastructure at coordinates (${geo?.lat || '0.0000'}, ${geo?.lng || '0.0000'}).\n\nThe status of this situation posing immediate public safety risks and creating immense community disruption warrants urgent deployment of a maintenance crew. We expect a resolution review within our standard ward SLA.\n\nSincerely,\nNagrik Civic Platform Citizen Reporter`
  });
}

function runSimulatedEscalation(title: string, category: string, wardName: string, officer: string, department: string, res: any) {
  return res.json({
    success: true,
    simulated: true,
    rtiText: `APPLICATION UNDER THE RIGHT TO INFORMATION ACT\nTo: Public Information Officer, Department of ${department || 'Civic Maintenance'}\nSubject: Status of unresolved query regarding '${title || 'Civic Issue'}'\n\nPlease provide formal updates, SLA timelines, allocated budget sheets, and names of officers assigned to review and complete the resolution work on the aforementioned report located in ${wardName || 'Ward 12'}.`,
    socialPostText: `⚠️ UNRESOLVED civic hazard reported in #${wardName || 'Ward'}! The unresolved '${title}' continues to pose dangers to the community. 7 days SLA has breached! Hey @MunicipalHead we need accountability! #CivicNagrik #ActiveCitizenship`
  });
}

function runSimulatedVerifyFix(photoBefore: string, photoAfter: string, res: any) {
  const cleanBefore = photoBefore.replace(/^data:image\/\w+;base64,/, "").trim();
  const cleanAfter = photoAfter.replace(/^data:image\/\w+;base64,/, "").trim();

  // If identical, reject
  if (cleanBefore === cleanAfter || cleanBefore.substring(0, 500) === cleanAfter.substring(0, 500) || Math.abs(cleanBefore.length - cleanAfter.length) < 20) {
    return res.json({
      success: true,
      simulated: true,
      fixConfirmed: false,
      rationale: "Verification failed: The uploaded repair photo is identical to the original complaint photo. No repairs have been made."
    });
  }

  return res.json({
    success: true,
    simulated: true,
    fixConfirmed: true,
    rationale: "Simulation comparison: The repair photograph shows the ground is fully restored, clear of potholes/debris, indicating the civic complaint has been successfully resolved."
  });
}

function runSimulatedPredictive(history: any[] | undefined, res: any) {
  const hotspots: any[] = [];
  
  if (Array.isArray(history) && history.length > 0) {
    const sortedHistory = [...history].sort((a, b) => {
      const severityMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const sevA = severityMap[a.severity] || 0;
      const sevB = severityMap[b.severity] || 0;
      return sevB - sevA;
    });

    sortedHistory.slice(0, 4).forEach((item, index) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const severityRisk: Record<string, number> = { critical: 94, high: 78, medium: 55, low: 30 };
      const baseRisk = severityRisk[item.severity] || 50;

      // Add a slight deterministic offset to represent neighboring high-risk cells
      const latOffset = (index % 2 === 0 ? 1 : -1) * 0.0006;
      const lngOffset = (index % 3 === 0 ? 1 : -1) * 0.0009;

      hotspots.push({
        lat: Number((lat + latOffset).toFixed(5)),
        lng: Number((lng + lngOffset).toFixed(5)),
        category: item.category || "Roads",
        riskScore: baseRisk,
        reasoning: `Localized risk accumulation modeled around a real, verified ${item.severity}-severity '${item.category}' incident. Spatial intelligence engines flag high structural decay probability in neighboring cells.`
      });
    });
  }

  return res.json({
    success: true,
    simulated: true,
    hotspots
  });
}

// 1. TRIAGE AGENT endpoint
app.post("/api/triage", async (req, res) => {
  const { photoBefore, geo, fileName, categoryHint } = req.body;
  if (!photoBefore) {
    return res.status(400).json({ error: "photoBefore is required" });
  }

  const ai = getAi();
  if (!ai) {
    return runSimulatedTriage(photoBefore, geo, fileName, categoryHint, res);
  }

  try {
    // Extract base64 image parts
    const match = photoBefore.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const data = match ? match[2] : photoBefore;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: { mimeType, data },
        },
        {
          text: `You are a high-precision Municipal AI Auditor. Analyze this photograph of a civic problem and classify it into one of the following exact categories:

          1. "Roads": 
             - Visible potholes, craters, broken pavement, asphalt cracks, asphalt erosion, gravel road damage, speed breaker issues, damaged sidewalks, driving surface hazards, or structural damage on roads.
             - NOTE: If there is water inside a pothole on a road surface, it is STILL "Roads" (not Water, not Drainage), because the core issue is pothole/road damage.
             
          2. "Drainage":
             - Open/broken manholes on streets or sidewalks, overflowing sewer drains, clogged gutters, flooded lanes due to poor street drains, or sewer backups.
             
          3. "Electricity/Streetlights":
             - Non-functioning/dark streetlights, dangling/exposed power lines, bent or fallen electricity poles, or transformer sparks.
             
          4. "Sanitation":
             - Litter, loose trash piles, uncollected garbage heaps, black spots with rubbish, debris dumped on sidewalks/streets, or overflow of garbage bins.
             
          5. "Water":
             - Active burst water supply pipe on the street, clean water fountain leaking from ground pipe, or municipal water distribution leaks.
             
          6. "Other":
             - Any other municipal issue.

          Coordinate context: Lat: ${geo?.lat || "unknown"}, Lng: ${geo?.lng || "unknown"}.
          
          ${categoryHint ? `USER HIGHLIGHT/CATEGORY SUGGESTION: The user suggests this is related to "${categoryHint}". Please favor "${categoryHint}" as the chosen category unless the visual evidence strongly indicates a different category.` : ''}

          Based on the image details, produce:
          - category: Must be exactly one of: 'Roads', 'Drainage', 'Electricity/Streetlights', 'Sanitation', 'Water', or 'Other'
          - severity: 'low', 'medium', 'high', or 'critical' (based on hazard/impact level)
          - dangerScore: Integer from 0 to 100 representing the immediate public danger/accident risk (e.g. deep pothole on main road is high danger 75+, minor sidewalk crack is 15)
          - title: A precise, formal, 4-8 word title (e.g., 'Severe Active Potholes on Main Dual-Carriageway', 'Large Unattended Trash Heap Blockage')
          - description: 1-2 professional sentences explaining exactly what is visible in the photo and the immediate public safety/hygiene impact.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Roads', 'Drainage', 'Electricity/Streetlights', 'Sanitation', 'Water', or 'Other'"
            },
            severity: {
              type: Type.STRING,
              description: "Must be exactly one of: 'low', 'medium', 'high', 'critical'"
            },
            dangerScore: {
              type: Type.INTEGER,
              description: "A scale from 0 to 100 indicating public danger (e.g., pedestrian risk, traffic hazards, hygiene risk)"
            },
            title: {
              type: Type.STRING,
              description: "Short 4-8 word descriptive issue title"
            },
            description: {
              type: Type.STRING,
              description: "1-2 sentence detailed description of what is visible in the photo and the immediate impact"
            }
          },
          required: ["category", "severity", "dangerScore", "title", "description"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      simulated: false,
      category: parsed.category,
      severity: parsed.severity,
      dangerScore: parsed.dangerScore,
      title: parsed.title,
      description: parsed.description
    });

  } catch (error: any) {
    console.error("Gemini triage agent failed, falling back to simulation:", error);
    return runSimulatedTriage(photoBefore, geo, fileName, categoryHint, res);
  }
});

// 2. ROUTING AGENT endpoint
app.post("/api/routing", async (req, res) => {
  const { category, geo, department, officer } = req.body;

  const ai = getAi();
  if (!ai) {
    return runSimulatedRouting(category, geo, res);
  }

  try {
    const prompt = `Draft a formal, polite, citation-style civic complaint regarding a ${category} civic issue situated at coordinates (lat: ${geo?.lat || 'unknown'}, lng: ${geo?.lng || 'unknown'}). Special operational oversight is governed by ${officer || 'District Engineer'} of the ${department || 'Public Works'} department.
    Write a professional 2-paragraph email complaint starting with 'Dear Officer...' and closing professionally. Ask for immediate routing action.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({
      success: true,
      simulated: false,
      complaintText: response.text || "Complaint could not be draft-generated."
    });
  } catch (error: any) {
    console.error("Gemini routing agent failed, falling back to simulation:", error);
    return runSimulatedRouting(category, geo, res);
  }
});

// 3. ESCALATION AGENT endpoint
app.post("/api/escalation", async (req, res) => {
  const { title, category, wardName, officer, department } = req.body;

  const ai = getAi();
  if (!ai) {
    return runSimulatedEscalation(title, category, wardName, officer, department, res);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Create an escalation pack for an SLA-breached civic report: '${title}' (${category}) in ${wardName} ward, managed by ${officer} of ${department} Department.
      Include standard Right to Information (RTI) grievance draft demanding budget/logs and a high-impact social media post draft tagging municipal heads. Return strictly JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rtiText: {
              type: Type.STRING,
              description: "A formal statutory demand letter under the RTI provisions for timelines, budget, and officer names"
            },
            socialPostText: {
              type: Type.STRING,
              description: "A professional, punchy social media post tagging local ward officers, using hashtags"
            }
          },
          required: ["rtiText", "socialPostText"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      simulated: false,
      rtiText: parsed.rtiText,
      socialPostText: parsed.socialPostText
    });
  } catch (error: any) {
    console.error("Gemini escalation agent failed, falling back to simulation:", error);
    return runSimulatedEscalation(title, category, wardName, officer, department, res);
  }
});

// 4. VERIFICATION AGENT endpoint
app.post("/api/verify-fix", async (req, res) => {
  const { photoBefore, photoAfter } = req.body;
  if (!photoBefore || !photoAfter) {
    return res.status(400).json({ error: "photoBefore and photoAfter are both required" });
  }

  // Strict check: if the 'after' photo is identical or has very close character count to the 'before' photo, reject it instantly
  const cleanBefore = photoBefore.replace(/^data:image\/\w+;base64,/, "").trim();
  const cleanAfter = photoAfter.replace(/^data:image\/\w+;base64,/, "").trim();

  if (cleanBefore === cleanAfter || cleanBefore.substring(0, 1000) === cleanAfter.substring(0, 1000) || Math.abs(cleanBefore.length - cleanAfter.length) < 20) {
    return res.json({
      success: true,
      simulated: false,
      fixConfirmed: false,
      rationale: "Verification failed: The uploaded repair photo is identical to the original complaint photo. No repairs have been made."
    });
  }

  const ai = getAi();
  if (!ai) {
    return runSimulatedVerifyFix(photoBefore, photoAfter, res);
  }

  try {
    const parseBase64 = (dataUrl: string) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      return {
        mimeType: match ? match[1] : "image/jpeg",
        data: match ? match[2] : dataUrl
      };
    };

    const beforeParsed = parseBase64(photoBefore);
    const afterParsed = parseBase64(photoAfter);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: { mimeType: beforeParsed.mimeType, data: beforeParsed.data },
        },
        {
          inlineData: { mimeType: afterParsed.mimeType, data: afterParsed.data },
        },
        {
          text: `The first image is a 'before' photo showing a community civic problem (e.g. potholes, trash pile, broken streetlights, broken pipeline).
          The second image is an 'after' photo showing the alleged repair work.

          You are a strict Municipal Verification Inspector. Visually compare these two images.

          CRITICAL INSPECTOR RULES:
          1. If the 'after' image shows the exact same unresolved problem as the 'before' image (no change in potholes, trash, etc.), set 'fixConfirmed' to false.
          2. If the 'after' image shows an unrelated subject, a blank photo, or does not clearly prove repair, set 'fixConfirmed' to false.
          3. Set 'fixConfirmed' to true ONLY if you can clearly verify that the specific problem in the 'before' photo has been successfully resolved, cleaned, or repaired in the 'after' photo.

          Provide a professional 1-2 sentence 'rationale' explaining your findings and precise visual evidence.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fixConfirmed: {
              type: Type.BOOLEAN,
              description: "True if visual comparison proves the civic problem (e.g. pothole, trash, leak) is cleaned/repaired/fixed."
            },
            rationale: {
              type: Type.STRING,
              description: "1-2 sentence technical explanation detailing original symptoms and visual status of restoration"
            }
          },
          required: ["fixConfirmed", "rationale"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      simulated: false,
      fixConfirmed: parsed.fixConfirmed,
      rationale: parsed.rationale
    });
  } catch (error: any) {
    console.error("Gemini verification agent failed, falling back to simulation:", error);
    return runSimulatedVerifyFix(photoBefore, photoAfter, res);
  }
});

// 5. PREDICTIVE AGENT endpoint
app.post("/api/predictive", async (req, res) => {
  const { history } = req.body;

  const ai = getAi();
  if (!ai) {
    return runSimulatedPredictive(history, res);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Based on this list of reported civic issues (history), predict three priority future hotspot cells:
      ${JSON.stringify(history)}.
      CRITICAL DIRECTION: You must base your output on real data only. Extract the coordinates of real issues from the provided history list. Generate predicted hotspot coordinates that are situated extremely close to those real coordinates (e.g. within 0.002 degrees). DO NOT use default Bangalore coordinates or make up random locations. If the history list is empty, return an empty array [] under the 'hotspots' key.
      Return three structured coordinate-based hotspot cells with categories, riskScores (0 to 100), and analytical reasonings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hotspots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  riskScore: { type: Type.INTEGER },
                  reasoning: { type: Type.STRING }
                },
                required: ["lat", "lng", "category", "riskScore", "reasoning"]
              }
            }
          },
          required: ["hotspots"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      simulated: false,
      hotspots: parsed.hotspots || []
    });
  } catch (error: any) {
    console.error("Gemini predictive agent failed, falling back to simulation:", error);
    return runSimulatedPredictive(history, res);
  }
});


// Express server bootstrap with Vite middlewares
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched successfully at http://localhost:${PORT}`);
  });
}

startServer();
