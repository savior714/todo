CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  email TEXT UNIQUE,
  emailVerified INTEGER,
  image TEXT
);

CREATE TABLE accounts (
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, providerAccountId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  sessionToken TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL,
  expires INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE verificationTokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires INTEGER NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE authenticators (
  credentialID TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  credentialPublicKey TEXT NOT NULL,
  counter INTEGER NOT NULL,
  credentialDeviceType TEXT NOT NULL,
  credentialBackedUp INTEGER NOT NULL,
  transports TEXT,
  PRIMARY KEY (userId, credentialID),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE families (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE user_families (
  user_id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'executor' CHECK(role IN ('admin', 'executor')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
CREATE INDEX profiles_family_idx ON profiles (family_id);

CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  is_reverted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT
);
CREATE INDEX events_family_created_idx ON events (family_id, created_at DESC);
CREATE INDEX events_family_action_created_idx ON events (family_id, action_type, created_at DESC);

CREATE TABLE daily_pins (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX daily_pins_active_family_unique_idx ON daily_pins (family_id) WHERE is_active = 1;
CREATE INDEX daily_pins_family_idx ON daily_pins (family_id);

CREATE TABLE homework_types (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  child_group TEXT NOT NULL CHECK(child_group IN ('kid7', 'kid4')),
  title TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
CREATE INDEX homework_types_family_idx ON homework_types (family_id);

CREATE TABLE homework_logs (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  homework_type_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  completed_by TEXT NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (homework_type_id) REFERENCES homework_types(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES profiles(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX homework_logs_type_date_unique_idx ON homework_logs (homework_type_id, date_key);
CREATE INDEX homework_logs_family_date_idx ON homework_logs (family_id, date_key);

CREATE TABLE care_guides (
  id TEXT PRIMARY KEY NOT NULL,
  family_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  linked_action TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
CREATE INDEX care_guides_family_created_idx ON care_guides (family_id, created_at DESC);
