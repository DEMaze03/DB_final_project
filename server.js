
import express from "express";
import dotenv from "dotenv";
import { runQuery, closeDriver } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Very small CORS helper for dev (adjust origin for production)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

// Example cards endpoint. Adjust the Cypher to match your graph model.
app.get("/api/cards", async (req, res) => {
  const q = (req.query.q || "").trim();
  const params = { q: q.toLowerCase() };

  // Example: adapt label/prop names to your data model
  const cypher = `
    MATCH (c:Card)
    WHERE ($q = "") OR toLower(c.name) CONTAINS $q
    RETURN c {.*} AS card
    LIMIT 100
  `;

  try {
    const records = await runQuery(cypher, params);
    const cards = records.map((r) => r.get("card"));
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error("Error querying Neo4j:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.get("/api/params", async (req, res) => {
  const cypher = `
    MATCH (c:Card)
    RETURN 
        collect(DISTINCT c.type) AS types,
        collect(DISTINCT c.playerClass) AS playerClasses,
        collect(DISTINCT c.rarity) AS rarities,
        collect(DISTINCT c.cost) AS costs
  `;

  try {
    const records = await runQuery(cypher, {});
    const record = records[0]; // only one row returned

    const result = {
      type: record.get("types"),
      playerClass: record.get("playerClasses"),
      rarity: record.get("rarities"),
      cost: record.get("costs"),
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error querying Neo4j:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});



// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeDriver();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);