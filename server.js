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
  const type = (req.query.type || "").trim();
  const playerClass = (req.query.class || "").trim();
  const rarity = (req.query.rarity || "").trim();
  const cost = (req.query.cost || "").trim();
  const set = (req.query.set || "").trim();
  const race = (req.query.race || "").trim();
  const mechanic = (req.query.mechanic || "").trim();

  const params = { 
    q: q.toLowerCase(),
    type: type,
    playerClass: playerClass,
    rarity: rarity,
    cost: cost === "" ? null : parseInt(cost),
    set: set,
    race: race,
    mechanic: mechanic
  };

  // Build dynamic WHERE conditions
  const conditions = ["($q = '' OR toLower(c.name) CONTAINS $q)"];
  
  if (type) conditions.push("c.type = $type");
  if (playerClass) conditions.push("c.playerClass = $playerClass");
  if (rarity) conditions.push("c.rarity = $rarity");
  if (cost !== "") conditions.push("c.cost = $cost");
  if (set) conditions.push("c.set = $set");
  if (race) conditions.push("c.race = $race");

  let cypher = `
    MATCH (c:Card)
  `;

  // Add mechanic filter if specified
  if (mechanic) {
    cypher += `
    MATCH (c)-[:HAS_MECHANIC]->(m:Mechanic {name: $mechanic})
    `;
  }

  cypher += `
    WHERE ${conditions.join(" AND ")}
    RETURN c {.*} AS card
  `;

  try {
    const records = await runQuery(cypher, params);
    const cards = records.map((r) => {
      const card = r.get("card");
      // Convert BigInt values to regular numbers
      return {
        ...card,
        cost: card.cost !== null && card.cost !== undefined ? Number(card.cost) : null,
        attack: card.attack !== null && card.attack !== undefined ? Number(card.attack) : null,
        health: card.health !== null && card.health !== undefined ? Number(card.health) : null,
        durability: card.durability !== null && card.durability !== undefined ? Number(card.durability) : null
      };
    });
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error("Error querying Neo4j:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.get("/api/params", async (req, res) => {
  // Helper to convert Neo4j integers (BigInt) to regular numbers
  const toNumber = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'bigint') return Number(val);
    if (typeof val === 'object' && val.toNumber) return val.toNumber();
    return val;
  };

  try {
    // Get Card properties
    const cardCypher = `
      MATCH (c:Card)
      RETURN 
        collect(DISTINCT c.type) AS types,
        collect(DISTINCT c.playerClass) AS playerClasses,
        collect(DISTINCT c.rarity) AS rarities,
        collect(DISTINCT c.cost) AS costs,
        collect(DISTINCT c.set) AS sets,
        collect(DISTINCT c.race) AS races
    `;
    
    const cardRecords = await runQuery(cardCypher, {});
    const cardRecord = cardRecords[0];

    // Get Mechanics separately - only from collectible cards
    const mechanicCypher = `
      MATCH (c:Card)-[:HAS_MECHANIC]->(m:Mechanic)
      WHERE c.collectible = true OR c.collectible = 'true'
      RETURN collect(DISTINCT m.name) AS mechanics
    `;
    
    const mechanicRecords = await runQuery(mechanicCypher, {});
    const mechanicRecord = mechanicRecords[0];

    const result = {
      type: cardRecord.get("types").filter(v => v !== null && v !== '').sort(),
      playerClass: cardRecord.get("playerClasses").filter(v => v !== null && v !== '').sort(),
      rarity: cardRecord.get("rarities").filter(v => v !== null && v !== '').sort(),
      cost: cardRecord.get("costs")
        .filter(v => v !== null)
        .map(toNumber)
        .sort((a, b) => a - b),
      set: cardRecord.get("sets").filter(v => v !== null && v !== '').sort(),
      race: cardRecord.get("races").filter(v => v !== null && v !== '').sort(),
      mechanic: mechanicRecord.get("mechanics").filter(v => v !== null && v !== '').sort()
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