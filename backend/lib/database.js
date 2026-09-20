import { neon } from "@neondatabase/serverless";

let database;

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!database) {
    database = neon(process.env.DATABASE_URL);
  }

  return database;
}
