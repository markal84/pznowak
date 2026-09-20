import { neon } from "@neondatabase/serverless";

const databases = new Map();

export function getDatabase({ direct = false } = {}) {
  const variableName = direct ? "DATABASE_URL_UNPOOLED" : "DATABASE_URL";
  const connectionString = process.env[variableName];

  if (!connectionString) {
    throw new Error(`${variableName} is not configured`);
  }

  if (!databases.has(variableName)) {
    databases.set(variableName, neon(connectionString));
  }

  return databases.get(variableName);
}
