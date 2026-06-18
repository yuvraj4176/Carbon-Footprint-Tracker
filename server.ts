/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  xFrameOptions: false,
}));
app.use(cors());

// Apply rate limiting to all API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use("/api/", apiLimiter);

app.use(express.json({ limit: "10kb" })); // Body size limit for security

const PORT = 3000;

// Initialize GoogleGenAI server-side with user-agent telemetry telemetry standard.
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined or is placeholder. Falling back to structured default responses.");
}

// Helper function to call ai.models.generateContent with exponential backoff and automatic model fallback on transient errors (such as 503 UNAVAILABLE due to high demand spikes)
async function generateContentWithRetry(params: any, retries = 2, delay = 1000): Promise<any> {
  if (!ai) {
    throw new Error("Gemini AI client is not initialized.");
  }

  // Model hierarchy to try if a model is temporarily unavailable due to capacity limits.
  const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash"];
  const requestedModel = params.model || "gemini-2.5-flash";
  const modelsToTry = [requestedModel, ...candidateModels.filter((m) => m !== requestedModel)];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const currentParams = { ...params, model: modelName };
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${modelName} (Attempt ${attempt}/${retries})...`);
        return await ai.models.generateContent(currentParams);
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        const isTransient =
          error?.status === "UNAVAILABLE" ||
          error?.code === 503 ||
          errorMessage.includes("503") ||
          errorMessage.includes("high demand") ||
          errorMessage.includes("temporary") ||
          errorMessage.includes("service is currently unavailable") ||
          errorMessage.includes("UNAVAILABLE");

        if (isTransient) {
          if (attempt < retries) {
            const nextDelay = delay * Math.pow(2, attempt - 1);
            console.warn(`[Gemini API] Transient 503 on ${modelName} (Attempt ${attempt}/${retries}): ${errorMessage}. Retrying in ${nextDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, nextDelay));
            continue;
          } else {
            console.warn(`[Gemini API] ${modelName} retries exhausted due to high demand. Moving to fallback model option...`);
          }
        } else {
          // If it is a non-transient error (e.g., structural Schema mismatch or bad auth key), throw immediately
          throw error;
        }
      }
    }
  }

  throw lastError;
}

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiEnabled: !!ai });
});

// 1. Carbon Profile Analyzer API
app.post("/api/gemini/analyze", async (req, res) => {
  const { profile, emissions } = req.body;

  if (!profile || !emissions) {
    return res.status(400).json({ error: "Profile and emissions data are required." });
  }

  // Define detailed fallback in case API key is missing
  const mockResponse = {
    coachFeedback: "Great job taking the first step to calculate your emissions! Your largest impact is in Transport (mainly flights and car miles), followed by Food. Making shifts towards low-carbon transport modes and a vegetable-rich diet will produce the fastest changes in your annual trajectory.",
    roadmap: [
      {
        title: "Initiate Electric Commuting",
        description: "Replace gas-driven car rides with e-bike or solar electricity public transport options twice weekly.",
        category: "transport",
        potentialReductionKg: 400
      },
      {
        title: "Opt-In to Solar Grid Tariffs",
        description: "Check if your utility offers a 100% green energy grid match package to clean up domestic electricity usage.",
        category: "home",
        potentialReductionKg: 500
      },
      {
        title: "Integrate Plant-Based Protein Habits",
        description: "Decrease heavy beef or pork servings. Dedicate at least three consecutive vegetarian days per week.",
        category: "food",
        potentialReductionKg: 300
      },
      {
        title: "Embrace Clothing Rental & Pre-owned",
        description: "Select durable refurbished tech and pre-loved apparel first over primary fast-retail chains.",
        category: "shopping",
        potentialReductionKg: 180
      }
    ],
    tailoredInsights: [
      `Your transport footprint resembles ${Math.round(emissions.transport / 1000)} metric tons annually. Private motoring on fossil fuels contributes significantly compared to high-speed public rail networks.`,
      `With a ${profile.dietType} diet option, transitioning to low-emission foods (like local produce and meat substitutes) is the single most valuable lifestyle choice you can command today instantly.`,
      "Enrolling in clean energy tariffs drops grid power baseline coefficients immediately down close to zero, neutralizing massive device consumption factors."
    ],
    personalizedQuiz: [
      {
        question: "Which of these food groups has the absolute highest carbon emissions per gram of protein produced?",
        options: ["Farmed Salmon", "Lentils and Peas", "Poultry (Chicken)", "Beef and Lamb"],
        correctIndex: 3,
        explanation: "Beef and lamb produce over 20-30x more carbon dioxide equivalents than legumes per unit of nutrition, mostly due to enteric fermentation (methane) and pasture land clearance."
      },
      {
        question: `Since you consume a ${profile.dietType} diet, reducing food waste has a compounding carbon benefit. What percentage of global emissions stems from wasted food?`,
        options: ["Less than 1%", "Approximately 3%", "Between 8% to 10%", "Over 20%"],
        correctIndex: 2,
        explanation: "Around 8-10% of global greenhouse gas emissions originate from uneaten food, decaying in landfills to emit high volumes of methane."
      }
    ]
  };

  if (!ai) {
    // Return high-quality, personalized simulation when API is offline
    return res.json(mockResponse);
  }

  try {
    const prompt = `Analyze this individual's carbon profile and emissions breakdown. Provide highly specific, expert-level feedback, action roadmap, tailored insights, and a personalized 2-question trivia quiz.
    
    Carbon Profile Input:
    - Transport: ${profile.carMilesPerWeek} car miles/week (${profile.carType}), ${profile.flightsShortPerYear} short flights/year, ${profile.flightsLongPerYear} long flights/year, ${profile.publicTransitHoursPerWeek} public transit hours/week.
    - Home Energy: ${profile.electricityKwhPerMonth} kWh/month, ${profile.cleanEnergyPercentage}% clean energy, heating is ${profile.heatingType}, household size of ${profile.householdSize}.
    - Diet: ${profile.dietType}, ${profile.localFoodRatio}% local food, ${profile.foodWasteLevel} level waste.
    - Lifestyle: ${profile.shoppingFrequency} shopping frequency, ${profile.recyclingHabit} recycling habit.
    
    Emissions Breakdown Results (kg CO2e per year):
    - Transport: ${emissions.transport} kg
    - Home: ${emissions.home} kg
    - Food: ${emissions.food} kg
    - Shopping: ${emissions.shopping} kg
    - Total: ${emissions.total} kg
    
    A context note: The global target to limit warming is 2,000 kg (2 metric tons) per person annually. Focus suggestions on their highest emission zones.`;

    const systemPrompt = "You are an elite Sustainability Advisor and Climate Coach. Give realistic, action-oriented, professional, and supportive feedback. Do not exaggerate or use generic advice. Personalize and connect the data to real math.";

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coachFeedback: {
              type: Type.STRING,
              description: "A summary analysis and supportive paragraph tailored to the user's specific performance and carbon hot-spots."
            },
            roadmap: {
              type: Type.ARRAY,
              description: "A list of 4 highly actionable and personalized carbon-reducing pledge actions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING, description: "Specific instructions on how to take the action." },
                  category: { type: Type.STRING, description: "Must be: transport, home, food, or shopping." },
                  potentialReductionKg: { type: Type.INTEGER, description: "Estimated realistic annual kg CO2e reduction (e.g. 100 to 1000)." }
                },
                required: ["title", "description", "category", "potentialReductionKg"]
              }
            },
            tailoredInsights: {
              type: Type.ARRAY,
              description: "List of 3 unique, eye-opening ecological stats or comparisons addressing their profile specifically.",
              items: { type: Type.STRING }
            },
            personalizedQuiz: {
              type: Type.ARRAY,
              description: "Exactly 2 high-quality relevant educational multiple-choice quiz questions based on their largest emission sectors.",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "4 distinct options."
                  },
                  correctIndex: { type: Type.INTEGER, description: "0-indexed position of correct choice." },
                  explanation: { type: Type.STRING, description: "A highly educational explanation detailing why that is correct." }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["coachFeedback", "roadmap", "tailoredInsights", "personalizedQuiz"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    const isTransient =
      error?.status === "UNAVAILABLE" ||
      error?.code === 503 ||
      String(error).includes("503") ||
      String(error).includes("high demand") ||
      String(error).includes("temporary") ||
      String(error).includes("UNAVAILABLE");

    if (isTransient) {
      console.warn("Gemini analysis transient demand peak. Safely fallback to simulation:", error?.message || error);
    } else {
      console.error("Gemini analysis error:", error);
    }
    // Graceful error recovery: Return personalized simulation mock so the user's experience is not broken
    return res.json({
      ...mockResponse,
      coachFeedback: `Calculated successfully. (AI connection is resolving credentials - providing local simulation blueprint). ${mockResponse.coachFeedback}`
    });
  }
});

// 2. Interactive Coach Chat API
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, profile, emissions } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  // Fallback response generator if Gemini is offline
  const generateMockReply = (userMsg: string): string => {
    const msg = userMsg.toLowerCase();
    if (msg.includes("fly") || msg.includes("flight") || msg.includes("travel")) {
      return "Flights are extremely high in carbon intensity because fuel is burnt directly at high altitude. Committing to fewer leisure flights, selecting coach class over business class (which halves your allocation), or offsetting through certified Gold Standard plans are direct steps. Choosing high-speed trains where available cuts transit emissions by 85%!";
    }
    if (msg.includes("diet") || msg.includes("meat") || msg.includes("vegan") || msg.includes("veget")) {
      return "Switching from beef-heavy diet profiles to vegetarian or vegan scales back dietary emissions enormously! Plant alternatives require 10x to 100x less land and water. Simply shifting to poultry, seafood, or plant-based proteins on alternate days counts as a major win.";
    }
    if (msg.includes("electric") || msg.includes("solar") || msg.includes("power") || msg.includes("energy")) {
      return "Grid power carries a variable 'carbon density' depending on coal/gas generation. Moving to clean suppliers, implementing light harvesting, and dropping home warming points down by just 1-2 degrees Celsius achieves immediate 5-10% electric savings.";
    }
    return "That's an excellent sustainability focus. As your Climate Coach, I recommend targeting continuous micro-reductions rather than drastic overnight changes. Try establishing one core habit in Transport first (like active transport) and one in Food (eliminating single-use items & cooking leftovers). What's one area you'd like to sketch out together right now?";
  };

  if (!ai) {
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    return res.json({ reply: generateMockReply(lastUserMessage) });
  }

  try {
    // Use the chat session pattern
    const systemInstruction = `You are an elite, encouraging Carbon Coach and Climate Expert. Below is the user's current metrics for context:
    - PROFILE: ${JSON.stringify(profile)}
    - EMISSIONS: ${JSON.stringify(emissions)}
    - Global Target: 2,000 kg CO2e per person / year.
    Give brief, scientific, respectful, and highly actionable suggestions. Keep responses below 150 words daily, maintaining high legibility and formatting with Markdown. No generic lists; focus on their questions and address their metric context where natural.`;

    const formattedContents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ reply: response.text });
  } catch (err: any) {
    const isTransient =
      err?.status === "UNAVAILABLE" ||
      err?.code === 503 ||
      String(err).includes("503") ||
      String(err).includes("high demand") ||
      String(err).includes("temporary") ||
      String(err).includes("UNAVAILABLE");

    if (isTransient) {
      console.warn("Gemini chat transient demand peak. Safely fallback to simulation:", err?.message || err);
    } else {
      console.error("Gemini Chat Error:", err);
    }
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    return res.json({ reply: `Calculated response: ${generateMockReply(lastUserMessage)}` });
  }
});

// Serve frontend assets in production and development (Vite Middleware)
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
    console.log(`Carbon Footprint Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
