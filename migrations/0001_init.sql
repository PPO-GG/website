-- ppo.gg D1 schema. Columns follow scripts/appwrite-setup.sh. "order" is quoted: it is a SQL keyword.
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  stack TEXT NOT NULL DEFAULT '[]',
  year INTEGER NOT NULL,
  status TEXT NOT NULL,
  href TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  imageId TEXT,
  imageUrl TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX apps_order_key ON apps ("order");

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT NOT NULL,
  publishedAt TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (slug)
);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (slug)
);
