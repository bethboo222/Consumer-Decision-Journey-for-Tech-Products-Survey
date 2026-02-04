const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Mongo config
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "survey";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "responses";

// ---------- FIELD DEFINITIONS ----------
const FIELD_LABELS = {
  created_at: "Submission time",
  purchaseTriggers:
    "Think about the last tech product you purchased. What triggered your decision to buy it?",
  purchaseTriggersOther: "Purchase triggers: Other (please specify)",
  purchaseDescription: "Would you describe this purchase as:",
  initialBrands:
    "Which tech brands or products did you initially consider when deciding what to buy?",
  initialBrandsOther: "Initial consideration brands: Other (please specify)",
  initialReasons: "Why did these brands come to mind first?",
  initialReasonsOther: "Initial consideration reasons: Other (please specify)",
  brandsNotConsidered:
    "Were there any tech brands you did not consider? Why do you think that was?",
  evaluationMethods:
    "How did you evaluate or compare the different tech products before making a decision?",
  infoSources: "What information sources did you consult during your decision process?",
  infoSourcesOther: "Information sources: Other (please specify)",
  strongestInfluence:
    "Which of these sources had the strongest influence on your final decision, and why?",
  expandedConsideration:
    "During your research, did you start considering any tech brands or products that you hadn’t thought of initially?",
  expandedConsiderationRepeat:
    "During your research, did you start considering any tech brands or products that you hadn’t thought of initially? (repeat)",
  expansionReasons:
    "If yes, what caused you to add these options to your consideration set?",
  expansionReasonsOther: "Expansion reasons: Other (please specify)",
  expansionReasonsRepeat:
    "If yes, what caused you to add these options to your consideration set? (repeat)",
  expansionReasonsRepeatOther:
    "Expansion reasons repeat: Other (please specify)",
  purchaseDrivers:
    "What ultimately made you choose the specific tech product you bought?",
  purchaseDriversOther: "Purchase drivers: Other (please specify)",
  purchaseChannel: "Where did you purchase the product?",
  channelReasons: "Why did you choose that retailer or platform?",
  channelReasonsOther: "Channel reasons: Other (please specify)",
  postPurchaseActions:
    "After purchasing the tech product, did you do any of the following?",
  postPurchaseMotivation:
    "What motivated you to engage (or not engage) in these behaviours?",
  advocacyLikelihood:
    "How likely are you to actively recommend this tech brand to others? (1-5)",
  advocacyMotivation:
    "What would make you more likely to recommend this brand in the future?",
  repurchaseLikelihood:
    "When buying a similar tech product in the future, how likely are you to choose the same brand?",
  switchFactors:
    "What factors would most likely cause you to switch to a different tech brand next time?"
};

const FIELD_ORDER = Object.keys(FIELD_LABELS);

// ---------- HELPERS ----------
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const normalizePayload = (payload) => {
  const out = { ...payload };
  FIELD_ORDER.forEach((k) => {
    if (!(k in out)) out[k] = "";
    if (Array.isArray(out[k])) out[k] = out[k].join("; ");
  });
  return out;
};

const mapPayloadToLabels = (payload) =>
  FIELD_ORDER.reduce((acc, key) => {
    acc[FIELD_LABELS[key]] = payload[key] ?? "";
    return acc;
  }, {});

// ---------- MONGODB (lazy connection) ----------
let mongoClient;
let mongoCollection;

async function getCollection() {
  if (mongoCollection) return mongoCollection;
  if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  mongoCollection = mongoClient
    .db(MONGODB_DB)
    .collection(MONGODB_COLLECTION);
  return mongoCollection;
}

// ---------- EXPRESS SETUP ----------
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- API ----------
app.post("/api/responses", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "Submission is empty." });
  }

  try {
    const created_at = new Date().toISOString();
    const normalized = normalizePayload({ ...req.body, created_at });
    const labeled = mapPayloadToLabels(normalized);

    const collection = await getCollection();
    await collection.insertOne(labeled);

    res.status(201).json({ message: "Response saved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save response." });
  }
});

app.get("/api/responses.csv", async (_req, res) => {
  try {
    const collection = await getCollection();
    const docs = await collection.find({}).toArray();

    const header =
      FIELD_ORDER.map((k) => escapeCsvValue(FIELD_LABELS[k])).join(",") + "\n";

    const rows = docs.map((doc) => {
      const normalized = normalizePayload(doc);
      return FIELD_ORDER.map((k) =>
        escapeCsvValue(normalized[k])
      ).join(",");
    });

    res.type("text/csv").send(header + rows.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to export CSV." });
  }
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Survey app running on port ${PORT}`);
});

// ---------- CLEAN SHUTDOWN ----------
process.on("SIGINT", async () => {
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});
