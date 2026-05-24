/**
 * database.js — DecodeLabs Project 3
 * ─────────────────────────────────────────────────────────
 * The Digital Vault: Persistent JSON Database Engine
 *
 * Pillar 1 — The Blueprint  : Schema design with constraints
 * Pillar 2 — The Bridge     : db.js connects app ↔ storage
 * Pillar 3 — The Action     : Full CRUD mapped to SQL concepts
 * Pillar 4 — The Shield     : UNIQUE, NOT NULL, CHECK enforced
 *                             + parameterized queries (no injection)
 *
 * CRUD ↔ SQL ↔ HTTP mapping (from the slides):
 *   CREATE → INSERT → POST
 *   READ   → SELECT → GET
 *   UPDATE → UPDATE → PUT
 *   DELETE → DELETE → DELETE
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════
// SCHEMA DEFINITION  (Pillar 1: The Blueprint)
// ─────────────────────────────────────────────
// Defines tables, column types, and constraints.
// The database ENFORCES these — the app cannot bypass them.
// ═══════════════════════════════════════════════
const SCHEMA = {
  users: {
    columns: {
      id:        { type: 'INTEGER', primaryKey: true, autoIncrement: true },
      name:      { type: 'TEXT',    notNull: true,  minLen: 2, maxLen: 60 },
      email:     { type: 'TEXT',    notNull: true,  unique: true, format: 'email' },
      role:      { type: 'TEXT',    notNull: true,  check: ['admin', 'intern', 'mentor'], default: 'intern' },
      bio:       { type: 'TEXT',    notNull: false, maxLen: 300 },
      createdAt: { type: 'TEXT',    notNull: true,  autoSet: true },
      updatedAt: { type: 'TEXT',    notNull: false },
    },
    // Relationships: one User has many Posts (1:Many)
    relations: { posts: { type: '1:Many', foreignKey: 'userId' } }
  },
  posts: {
    columns: {
      id:        { type: 'INTEGER', primaryKey: true, autoIncrement: true },
      userId:    { type: 'INTEGER', notNull: true,  foreignKey: 'users.id' },
      title:     { type: 'TEXT',    notNull: true,  minLen: 3, maxLen: 120 },
      body:      { type: 'TEXT',    notNull: true,  minLen: 10 },
      category:  { type: 'TEXT',    notNull: false, check: ['general', 'project', 'announcement'], default: 'general' },
      createdAt: { type: 'TEXT',    notNull: true,  autoSet: true },
      updatedAt: { type: 'TEXT',    notNull: false },
    },
    // Relationships: one Post belongs to one User (M:1)
    relations: { user: { type: 'M:1', foreignKey: 'userId' } }
  }
};

// ═══════════════════════════════════════════════
// DATABASE FILE PATH
// ═══════════════════════════════════════════════
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// ═══════════════════════════════════════════════
// DATABASE CLASS  (The Vault)
// ═══════════════════════════════════════════════
class Database {
  constructor() {
    this._ensureDataDir();
    this._db = this._load();
    this._counters = this._db.__counters || { users: 3, posts: 3 };
    console.log('[DB] ✓ Database loaded:', {
      users: this._db.users.length,
      posts: this._db.posts.length,
    });
  }

  // ── Private: ensure /data folder exists ──
  _ensureDataDir() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // ── Private: load from disk (or seed if first run) ──
  _load() {
    if (fs.existsSync(DB_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      } catch {
        console.warn('[DB] Corrupt database file — resetting to seed data');
      }
    }
    return this._seed();
  }

  // ── Private: write to disk ──
  _save() {
    this._db.__counters = this._counters;
    this._db.__schema   = Object.keys(SCHEMA);
    this._db.__savedAt  = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(this._db, null, 2), 'utf8');
  }

  // ── Private: seed initial data ──
  _seed() {
    const data = {
      users: [
        { id: 1, name: 'Alice Johnson', email: 'alice@decodelabs.tech', role: 'admin',  bio: 'Lead instructor at DecodeLabs.',          createdAt: '2026-01-10T08:00:00Z', updatedAt: null },
        { id: 2, name: 'Bob Sharma',    email: 'bob@decodelabs.tech',   role: 'intern', bio: 'Full stack intern, batch 2026.',          createdAt: '2026-01-11T09:00:00Z', updatedAt: null },
        { id: 3, name: 'Carol Lee',     email: 'carol@decodelabs.tech', role: 'intern', bio: 'Passionate about databases and systems.', createdAt: '2026-01-12T10:00:00Z', updatedAt: null },
      ],
      posts: [
        { id: 1, userId: 1, title: 'Welcome to DecodeLabs Batch 2026',  body: 'Build with integrity. Validate everything. Respect the architecture.',  category: 'announcement', createdAt: '2026-01-10T10:00:00Z', updatedAt: null },
        { id: 2, userId: 2, title: 'Lessons from Project 1',            body: 'Responsive design means thinking mobile-first every single time.',      category: 'project',      createdAt: '2026-01-13T11:00:00Z', updatedAt: null },
        { id: 3, userId: 3, title: 'Why Parameterized Queries Matter',  body: 'SQL injection exploits string concatenation. Never trust the client.',  category: 'project',      createdAt: '2026-01-14T12:00:00Z', updatedAt: null },
      ],
      __counters: { users: 3, posts: 3 },
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('[DB] ✓ Database seeded with initial data');
    return data;
  }

  // ═══════════════════════════════════════════
  // SCHEMA-LEVEL CONSTRAINT VALIDATION
  // (Pillar 4: The Shield — data integrity)
  // ═══════════════════════════════════════════

  /**
   * Validate a row against the schema for a given table.
   * This is the database-level enforcement layer — equivalent
   * to NOT NULL, UNIQUE, CHECK constraints in SQL.
   *
   * Returns: { valid: true } | { valid: false, errors: [...] }
   */
  validate(table, data, isUpdate = false) {
    const schema  = SCHEMA[table];
    if (!schema) return { valid: false, errors: [`Unknown table: ${table}`] };

    const errors = [];
    const cols   = schema.columns;

    for (const [col, rules] of Object.entries(cols)) {
      if (rules.primaryKey || rules.autoIncrement || rules.autoSet) continue;
      const val = data[col];
      const provided = val !== undefined && val !== null && val !== '';

      // NOT NULL — required field must be present on create
      if (rules.notNull && !isUpdate && !provided && !rules.default) {
        errors.push(`${col}: NOT NULL constraint — field is required`);
        continue;
      }

      if (!provided) continue; // optional or not provided on update

      const str = String(val);

      // TYPE check
      if (rules.type === 'INTEGER' && !Number.isInteger(Number(val))) {
        errors.push(`${col}: must be an integer`);
      }

      // minLen / maxLen — equivalent to CHECK(LENGTH(...))
      if (rules.minLen && str.trim().length < rules.minLen) {
        errors.push(`${col}: minimum length is ${rules.minLen} characters`);
      }
      if (rules.maxLen && str.trim().length > rules.maxLen) {
        errors.push(`${col}: maximum length is ${rules.maxLen} characters`);
      }

      // format: email
      if (rules.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        errors.push(`${col}: invalid email format`);
      }

      // CHECK constraint — allowed values
      if (rules.check && !rules.check.includes(str)) {
        errors.push(`${col}: CHECK constraint failed — must be one of: ${rules.check.join(', ')}`);
      }
    }

    return errors.length ? { valid: false, errors } : { valid: true };
  }

  /**
   * Check UNIQUE constraint for a column.
   * Equivalent to: CREATE UNIQUE INDEX ON table(column)
   */
  isUnique(table, column, value, excludeId = null) {
    return !this._db[table].some(
      row => String(row[column]).toLowerCase() === String(value).toLowerCase()
            && row.id !== excludeId
    );
  }

  /**
   * Check FOREIGN KEY constraint.
   * Ensures referenced row actually exists.
   */
  foreignKeyExists(refTable, id) {
    return this._db[refTable].some(row => row.id === Number(id));
  }

  // ═══════════════════════════════════════════
  // CRUD OPERATIONS — USERS
  // ═══════════════════════════════════════════

  /** SELECT * FROM users [WHERE role = ?] */
  getUsers(filters = {}) {
    let rows = [...this._db.users];
    if (filters.role) rows = rows.filter(u => u.role === filters.role);
    return rows;
  }

  /** SELECT * FROM users WHERE id = ? */
  getUserById(id) {
    return this._db.users.find(u => u.id === Number(id)) || null;
  }

  /** SELECT * FROM users WHERE email = ? */
  getUserByEmail(email) {
    return this._db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  /**
   * INSERT INTO users (name, email, role, bio, createdAt) VALUES (?, ?, ?, ?, ?)
   * Returns: { success, data, error }
   */
  createUser(data) {
    // Schema validation (NOT NULL, CHECK, format)
    const check = this.validate('users', data);
    if (!check.valid) return { success: false, error: check.errors };

    // UNIQUE constraint on email
    if (!this.isUnique('users', 'email', data.email)) {
      return { success: false, error: ['email: UNIQUE constraint failed — email already exists'] };
    }

    const newUser = {
      id:        ++this._counters.users,
      name:      data.name.trim(),
      email:     data.email.toLowerCase().trim(),
      role:      data.role || 'intern',
      bio:       data.bio ? data.bio.trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    this._db.users.push(newUser);
    this._save();
    return { success: true, data: newUser };
  }

  /**
   * UPDATE users SET ... WHERE id = ?
   * Returns: { success, data, error }
   */
  updateUser(id, data) {
    const idx = this._db.users.findIndex(u => u.id === Number(id));
    if (idx === -1) return { success: false, error: [`User ${id} not found`] };

    const check = this.validate('users', data, true);
    if (!check.valid) return { success: false, error: check.errors };

    if (data.email && !this.isUnique('users', 'email', data.email, Number(id))) {
      return { success: false, error: ['email: UNIQUE constraint failed — email already in use'] };
    }

    const updated = {
      ...this._db.users[idx],
      ...(data.name  ? { name:  data.name.trim()                    } : {}),
      ...(data.email ? { email: data.email.toLowerCase().trim()     } : {}),
      ...(data.role  ? { role:  data.role                           } : {}),
      ...(data.bio !== undefined ? { bio: data.bio ? data.bio.trim() : null } : {}),
      updatedAt: new Date().toISOString(),
    };

    this._db.users[idx] = updated;
    this._save();
    return { success: true, data: updated };
  }

  /**
   * DELETE FROM users WHERE id = ?
   * + CASCADE DELETE posts WHERE userId = ?
   */
  deleteUser(id) {
    const idx = this._db.users.findIndex(u => u.id === Number(id));
    if (idx === -1) return { success: false, error: [`User ${id} not found`] };

    const deleted = this._db.users.splice(idx, 1)[0];

    // CASCADE DELETE (referential integrity)
    const cascaded = this._db.posts.filter(p => p.userId === Number(id)).length;
    this._db.posts = this._db.posts.filter(p => p.userId !== Number(id));

    this._save();
    return { success: true, data: { deleted, cascadeDeletedPosts: cascaded } };
  }

  // ═══════════════════════════════════════════
  // CRUD OPERATIONS — POSTS
  // ═══════════════════════════════════════════

  /** SELECT posts.*, users.name FROM posts JOIN users ON posts.userId = users.id */
  getPosts(filters = {}) {
    let rows = this._db.posts.map(post => ({
      ...post,
      author: (() => {
        const u = this._db.users.find(u => u.id === post.userId);
        return u ? { id: u.id, name: u.name, role: u.role } : null;
      })()
    }));
    if (filters.userId) rows = rows.filter(p => p.userId === Number(filters.userId));
    if (filters.category) rows = rows.filter(p => p.category === filters.category);
    return rows;
  }

  /** SELECT * FROM posts WHERE id = ? JOIN users */
  getPostById(id) {
    const post = this._db.posts.find(p => p.id === Number(id));
    if (!post) return null;
    const user = this._db.users.find(u => u.id === post.userId);
    return { ...post, author: user ? { id: user.id, name: user.name, role: user.role } : null };
  }

  /** SELECT * FROM posts WHERE userId = ? */
  getPostsByUser(userId) {
    return this._db.posts.filter(p => p.userId === Number(userId));
  }

  /**
   * INSERT INTO posts (userId, title, body, category, createdAt) VALUES (?, ?, ?, ?, ?)
   */
  createPost(data) {
    const check = this.validate('posts', data);
    if (!check.valid) return { success: false, error: check.errors };

    // FOREIGN KEY constraint — userId must reference an existing user
    if (!this.foreignKeyExists('users', data.userId)) {
      return { success: false, error: [`userId: FOREIGN KEY constraint failed — user ${data.userId} does not exist`] };
    }

    const newPost = {
      id:        ++this._counters.posts,
      userId:    Number(data.userId),
      title:     data.title.trim(),
      body:      data.body.trim(),
      category:  data.category || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    this._db.posts.push(newPost);
    this._save();

    const user = this._db.users.find(u => u.id === newPost.userId);
    return { success: true, data: { ...newPost, author: user ? { id: user.id, name: user.name } : null } };
  }

  /** UPDATE posts SET ... WHERE id = ? */
  updatePost(id, data) {
    const idx = this._db.posts.findIndex(p => p.id === Number(id));
    if (idx === -1) return { success: false, error: [`Post ${id} not found`] };

    const check = this.validate('posts', data, true);
    if (!check.valid) return { success: false, error: check.errors };

    this._db.posts[idx] = {
      ...this._db.posts[idx],
      ...(data.title    ? { title:    data.title.trim()    } : {}),
      ...(data.body     ? { body:     data.body.trim()     } : {}),
      ...(data.category ? { category: data.category        } : {}),
      updatedAt: new Date().toISOString(),
    };

    this._save();
    return { success: true, data: this._db.posts[idx] };
  }

  /** DELETE FROM posts WHERE id = ? */
  deletePost(id) {
    const idx = this._db.posts.findIndex(p => p.id === Number(id));
    if (idx === -1) return { success: false, error: [`Post ${id} not found`] };

    const deleted = this._db.posts.splice(idx, 1)[0];
    this._save();
    return { success: true, data: { deleted } };
  }

  // ═══════════════════════════════════════════
  // META / STATS
  // ═══════════════════════════════════════════

  getSchema() { return SCHEMA; }

  getStats() {
    const roleCount = this._db.users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1; return acc;
    }, {});
    const catCount = this._db.posts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1; return acc;
    }, {});
    return {
      tables:     Object.keys(SCHEMA),
      users:      { total: this._db.users.length, byRole: roleCount },
      posts:      { total: this._db.posts.length, byCategory: catCount },
      dbPath:     DB_PATH,
      lastSaved:  this._db.__savedAt || null,
    };
  }
}

// Export a single shared instance (singleton pattern)
module.exports = new Database();
