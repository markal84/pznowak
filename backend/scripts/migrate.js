import { getDatabase } from "../lib/database.js";

const sql = getDatabase();

await sql`
  CREATE TABLE IF NOT EXISTS products (
    id integer PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    lead text NOT NULL DEFAULT '',
    image_path text NOT NULL,
    metal text NOT NULL DEFAULT '',
    stone text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS products_status_index
  ON products (status)
`;

console.log("Database schema is ready.");
