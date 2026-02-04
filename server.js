const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const CSV_PATH = path.join(DATA_DIR, "responses.csv");

const FIELD_LABELS = {
  created_at: "Submission time",
  purchaseTriggers:
    "Think about the last tech product you purchased. What triggered your decision to buy it?",
  purchaseTriggersOther: "Purchase triggers: Other (please specify)",
  purchaseDescription: "Would you describe this purchase as:",
  initialBrands: "Which tech brands or products did you initially consider when deciding what to buy?",
  initialBrandsOther: "Initial consideration brands: Other (please specify)",
  initialReasons: "Why did these brands come to mind first?",
  initialReasonsOther: "Initial consideration reasons: Other (please specify)",
  brandsNotConsidered: "Were there any tech brands you did not consider? Why do you think that was?",
  evaluationMethods: "How did you evaluate or compare the different tech products before making a decision?",
  infoSources: "What information sources did you consult during your decision process?",
  infoSourcesOther: "Information sources: Other (please specify)",
  strongestInfluence: "Which of these sources had the strongest influence on your final decision, and why?",
  expandedConsideration:
    "During your research, did you start considering any tech brands or products that you hadn’t thought of initially?",
  expandedConsiderationRepeat:
    "During your research, did you start considering any tech brands or products that you hadn’t thought of initially? (repeat)",
  expansionReasons: "If yes, what caused you to add these options to your consideration set?",
  expansionReasonsOther: "Expansion reasons: Other (please specify)",
  expansionReasonsRepeat: "If yes, what caused you to add these options to your consideration set? (repeat)",
  expansionReasonsRepeatOther: "Expansion reasons repeat: Other (please specify)",
  purchaseDrivers: "What ultimately made you choose the specific tech product you bought?",
  purchaseDriversOther: "Purchase drivers: Other (please specify)",
  purchaseChannel: "Where did you purchase the product?",
  channelReasons: "Why did you choose that retailer or platform?",
  channelReasonsOther: "Channel reasons: Other (please specify)",
  postPurchaseActions: "After purchasing the tech product, did you do any of the following?",
  postPurchaseMotivation: "What motivated you to engage (or not engage) in these behaviours?",
  advocacyLikelihood: "How likely are you to actively recommend this tech brand to others? (1-5)",
  advocacyMotivation: "What would make you more likely to recommend this brand in the future?",
  repurchaseLikelihood:
    "When buying a similar tech product in the future, how likely are you to choose the same brand?",
  switchFactors: "What factors would most likely cause you to switch to a different tech brand next time?"
};

const FIELD_ORDER = Object.keys(FIELD_LABELS);

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizePayload = (payload) => {
  const normalized = { ...payload };

  FIELD_ORDER.forEach((key) => {
    if (!(key in normalized)) {
      normalized[key] = "";
    }
  });

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (Array.isArray(value)) {
      normalized[key] = value.join("; ");
    }
  });

  return normalized;
};

const ensureCsvFile = async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    const header = FIELD_ORDER.map((key) => escapeCsvValue(FIELD_LABELS[key])).join(",") + "\n";
    await fsp.writeFile(CSV_PATH, header, "utf8");
  }
};

const appendCsvRow = async (payload) => {
  const row = FIELD_ORDER.map((key) => escapeCsvValue(payload[key])).join(",") + "\n";
  await fsp.appendFile(CSV_PATH, row, "utf8");
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/responses", async (req, res) => {
  const payload = req.body;

  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "Submission is empty." });
  }

  const createdAt = new Date().toISOString();
  const normalized = normalizePayload({ ...payload, created_at: createdAt });

  try {
    await ensureCsvFile();
    await appendCsvRow(normalized);
    return res.status(201).json({ message: "Response saved." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save response." });
  }
});

app.get("/api/responses.csv", async (req, res) => {
  try {
    await ensureCsvFile();
    return res.download(CSV_PATH, "responses.csv");
  } catch (error) {
    return res.status(500).json({ message: "Failed to load responses." });
  }
});

app.get("/api/responses", async (req, res) => {
  try {
    await ensureCsvFile();
    const csv = await fsp.readFile(CSV_PATH, "utf8");
    res.type("text/csv");
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load responses." });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Survey app listening on http://localhost:${PORT}`);
});
