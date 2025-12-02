
import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const {
  NEO4J_URI = "",
  NEO4J_USERNAME = "",
  NEO4J_PASSWORD = "",
  NEO4J_DATABASE = "",
} = process.env;

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.warn(
    "NEO4J connection environment variables are missing. Make sure .env has NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD"
  );
}

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

/**
 * Run a Cypher query against the default session (writes go to a write session if needed).
 * Returns an array of simplified JSON results (node properties).
 */
export async function runQuery(cypher, params = {}) {
  const session = driver.session({ database: NEO4J_DATABASE || undefined });
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

/** Close driver (call this on process exit) */
export async function closeDriver() {
  try {
    await driver.close();
  } catch (err) {
    console.error("Error closing Neo4j driver:", err);
  }
}