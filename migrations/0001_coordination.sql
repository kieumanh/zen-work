CREATE TABLE IF NOT EXISTS coordination (
  repo TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK(revision > 0),
  snapshot TEXT NOT NULL
);
