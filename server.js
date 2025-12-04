import express from "express";
import dotenv from "dotenv";
import { runQuery, closeDriver } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

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
    set: set,
    race: race,
    mechanic: mechanic
  };
  
  // Handle cost separately - need to ensure type matching
  if (cost !== "") {
    params.cost = parseInt(cost);
  }

  const conditions = ["($q = '' OR toLower(c.name) CONTAINS $q)"];
  
  if (type) conditions.push("c.type = $type");
  if (playerClass) conditions.push("c.playerClass = $playerClass");
  if (rarity) conditions.push("c.rarity = $rarity");
  if (cost !== "") conditions.push("toInteger(c.cost) = $cost");
  if (set) conditions.push("c.set = $set");
  if (race) conditions.push("c.race = $race");

  let cypher = `MATCH (c:Card)`;

  if (mechanic) {
    cypher += ` MATCH (c)-[:HAS_MECHANIC]->(m:Mechanic {name: $mechanic})`;
  }

  cypher += ` WHERE ${conditions.join(" AND ")} RETURN c {.*} AS card`;

  try {
    const records = await runQuery(cypher, params);
    const cards = records.map((r) => {
      const card = r.get("card");
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
  const toNumber = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'bigint') return Number(val);
    if (typeof val === 'object' && val.toNumber) return val.toNumber();
    return val;
  };

  try {
    const cardCypher = `
      MATCH (c:Card)
      WHERE c.type IS NOT NULL
      WITH collect(DISTINCT c.type) AS types
      MATCH (c:Card)
      WHERE c.playerClass IS NOT NULL
      WITH types, collect(DISTINCT c.playerClass) AS playerClasses
      MATCH (c:Card)
      WHERE c.rarity IS NOT NULL
      WITH types, playerClasses, collect(DISTINCT c.rarity) AS rarities
      MATCH (c:Card)
      WHERE c.cost IS NOT NULL
      WITH types, playerClasses, rarities, collect(DISTINCT c.cost) AS costs
      MATCH (c:Card)
      WHERE c.set IS NOT NULL
      WITH types, playerClasses, rarities, costs, collect(DISTINCT c.set) AS sets
      MATCH (c:Card)
      WHERE c.race IS NOT NULL
      RETURN types, playerClasses, rarities, costs, sets, collect(DISTINCT c.race) AS races
    `;
    
    const cardRecords = await runQuery(cardCypher, {});
    const cardRecord = cardRecords[0];

    const mechanicCypher = `
      MATCH (c:Card)-[:HAS_MECHANIC]->(m:Mechanic)
      WHERE (c.collectible = true OR c.collectible = 'true') AND m.name IS NOT NULL
      RETURN collect(DISTINCT m.name) AS mechanics
    `;
    
    const mechanicRecords = await runQuery(mechanicCypher, {});
    const mechanicRecord = mechanicRecords[0];

    const result = {
      type: cardRecord.get("types").sort(),
      playerClass: cardRecord.get("playerClasses").sort(),
      rarity: cardRecord.get("rarities").sort(),
      cost: cardRecord.get("costs").map(toNumber).sort((a, b) => a - b),
      set: cardRecord.get("sets").sort(),
      race: cardRecord.get("races").sort(),
      mechanic: mechanicRecord.get("mechanics").sort()
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error querying Neo4j:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeDriver();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);