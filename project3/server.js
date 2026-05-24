/**
 * server.js — DecodeLabs Project 3
 * ─────────────────────────────────────────────────────────
 * Express API + Persistent Database Integration
 *
 * This file is the BRIDGE (Pillar 2):
 *   HTTP Request → validate → db.operation() → HTTP Response
 *
 * All data now persists to disk in data/database.json
 * Restart the server — your data is still there.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const db      = require('./database');   // ← The Vault

const app  = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════
// RESPONSE HELPERS
// ═══════════════════════════════════════════════
const ok   = (res, data, status = 200, meta = {}) =>
  res.status(status).json({ success: true, data, ...meta });

const fail = (res, status, message, details = null) =>
  res.status(status).json({ success: false, error: { code: status, message, details } });

const parseId = (param) => {
  const n = parseInt(param, 10);
  return isNaN(n) ? null : n;
};

// ═══════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════
app.get('/', (_req, res) => {
  res.json({
    name:    'DecodeLabs Backend API',
    project: 'Project 3 — Database Integration',
    batch:   '2026',
    motto:   'Design your schema. Bridge the gap. Map CRUD to REST. Shield your data.',
    database: 'Persistent JSON Database (file: data/database.json)',
    endpoints: {
      'GET  /schema'           : 'View the full database schema & constraints',
      'GET  /stats'            : 'Database statistics',
      'GET  /health'           : 'System health',
      'GET  /users'            : 'SELECT * FROM users',
      'POST /users'            : 'INSERT INTO users',
      'GET  /users/:id'        : 'SELECT * FROM users WHERE id = ?',
      'PUT  /users/:id'        : 'UPDATE users SET ... WHERE id = ?',
      'DELETE /users/:id'      : 'DELETE FROM users WHERE id = ?',
      'GET  /users/:id/posts'  : 'SELECT * FROM posts WHERE userId = ? (JOIN)',
      'GET  /posts'            : 'SELECT posts.*, users.name FROM posts JOIN users',
      'POST /posts'            : 'INSERT INTO posts (with FOREIGN KEY check)',
      'GET  /posts/:id'        : 'SELECT * FROM posts WHERE id = ? (JOIN)',
      'PUT  /posts/:id'        : 'UPDATE posts SET ... WHERE id = ?',
      'DELETE /posts/:id'      : 'DELETE FROM posts WHERE id = ?',
    }
  });
});

// ═══════════════════════════════════════════════
// SYSTEM ROUTES
// ═══════════════════════════════════════════════
app.get('/health', (_req, res) => {
  ok(res, { status: 'healthy', uptime: `${Math.floor(process.uptime())}s`, timestamp: new Date().toISOString() });
});

app.get('/schema', (_req, res) => {
  ok(res, db.getSchema());
});

app.get('/stats', (_req, res) => {
  ok(res, db.getStats());
});

// ═══════════════════════════════════════════════
// USERS  (SELECT / INSERT / UPDATE / DELETE)
// ═══════════════════════════════════════════════

/** READ — SELECT * FROM users */
app.get('/users', (req, res) => {
  const users = db.getUsers({ role: req.query.role });
  ok(res, users, 200, { total: users.length });
});

/** CREATE — INSERT INTO users */
app.post('/users', (req, res) => {
  const result = db.createUser(req.body);
  if (!result.success) return fail(res, 400, 'Database constraint violation', result.error);
  ok(res, result.data, 201);
});

/** READ — SELECT * FROM users WHERE id = ? */
app.get('/users/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'User ID must be a valid integer');

  const user = db.getUserById(id);
  if (!user) return fail(res, 404, `No record found: users WHERE id = ${id}`);
  ok(res, user);
});

/** UPDATE — UPDATE users SET ... WHERE id = ? */
app.put('/users/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'User ID must be a valid integer');

  const result = db.updateUser(id, req.body);
  if (!result.success) {
    const status = result.error[0]?.includes('not found') ? 404 : 400;
    return fail(res, status, 'Database constraint violation', result.error);
  }
  ok(res, result.data);
});

/** DELETE — DELETE FROM users WHERE id = ? (CASCADE) */
app.delete('/users/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'User ID must be a valid integer');

  const result = db.deleteUser(id);
  if (!result.success) return fail(res, 404, result.error[0]);
  ok(res, result.data);
});

/** READ (JOIN) — SELECT * FROM posts WHERE userId = ? */
app.get('/users/:id/posts', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'User ID must be a valid integer');

  const user = db.getUserById(id);
  if (!user) return fail(res, 404, `No record found: users WHERE id = ${id}`);

  const posts = db.getPostsByUser(id);
  ok(res, posts, 200, { total: posts.length, user: { id: user.id, name: user.name } });
});

// ═══════════════════════════════════════════════
// POSTS  (SELECT / INSERT / UPDATE / DELETE)
// ═══════════════════════════════════════════════

/** READ — SELECT posts.*, users.name FROM posts JOIN users */
app.get('/posts', (req, res) => {
  const posts = db.getPosts({ userId: req.query.userId, category: req.query.category });
  ok(res, posts, 200, { total: posts.length });
});

/** CREATE — INSERT INTO posts (with FOREIGN KEY check) */
app.post('/posts', (req, res) => {
  const result = db.createPost(req.body);
  if (!result.success) {
    const status = result.error[0]?.includes('FOREIGN KEY') ? 404 : 400;
    return fail(res, status, 'Database constraint violation', result.error);
  }
  ok(res, result.data, 201);
});

/** READ — SELECT * FROM posts WHERE id = ? */
app.get('/posts/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Post ID must be a valid integer');

  const post = db.getPostById(id);
  if (!post) return fail(res, 404, `No record found: posts WHERE id = ${id}`);
  ok(res, post);
});

/** UPDATE — UPDATE posts SET ... WHERE id = ? */
app.put('/posts/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Post ID must be a valid integer');

  const result = db.updatePost(id, req.body);
  if (!result.success) {
    const status = result.error[0]?.includes('not found') ? 404 : 400;
    return fail(res, status, 'Database constraint violation', result.error);
  }
  ok(res, result.data);
});

/** DELETE — DELETE FROM posts WHERE id = ? */
app.delete('/posts/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Post ID must be a valid integer');

  const result = db.deletePost(id);
  if (!result.success) return fail(res, 404, result.error[0]);
  ok(res, result.data);
});

// ═══════════════════════════════════════════════
// GLOBAL ERROR HANDLERS
// ═══════════════════════════════════════════════
app.use((req, res) =>
  fail(res, 404, `Route not found: ${req.method} ${req.path}`, { hint: 'GET / for all endpoints' })
);

app.use((err, _req, res, _next) => {
  console.error('[500]', err);
  fail(res, 500, 'Internal server error', { message: err.message });
});

// ═══════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   DecodeLabs — Project 3: Database Integration ║');
  console.log('║   Batch 2026 | Data persists to disk          ║');
  console.log(`║   Server → http://localhost:${PORT}              ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
});

module.exports = app;
