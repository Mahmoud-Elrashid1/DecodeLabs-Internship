/**
 * DecodeLabs — Project 2: Backend API
 * Full Stack Industrial Training Kit | Batch 2026
 *
 * Architecture: RESTful API following the IPO Model
 *   INPUT  → validate → PROCESS → respond → OUTPUT
 *
 * Resources: /users, /posts
 * Principles: Resources are Nouns. Methods are Verbs.
 *             Never Trust the Client. (The Gatekeeper Rule)
 */

'use strict';

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════
// MIDDLEWARE  (Blood-Brain Barrier / Gatekeeper)
// ═══════════════════════════════════════════════
app.use(cors());
app.use(express.json());

// Request logger — every request leaves a trace
app.use((req, _res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════
// IN-MEMORY DATA STORE  (no DB required for P2)
// Simulates Temporal Lobe: Memory Storage
// ═══════════════════════════════════════════════
let users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@decodelabs.tech', role: 'admin',    createdAt: '2026-01-10T08:00:00Z' },
  { id: 2, name: 'Bob Sharma',   email: 'bob@decodelabs.tech',   role: 'intern',   createdAt: '2026-01-11T09:00:00Z' },
  { id: 3, name: 'Carol Lee',    email: 'carol@decodelabs.tech', role: 'intern',   createdAt: '2026-01-12T10:00:00Z' },
];

let posts = [
  { id: 1, userId: 1, title: 'Welcome to DecodeLabs Batch 2026', body: 'This is your first milestone. Build with integrity.',   createdAt: '2026-01-10T10:00:00Z' },
  { id: 2, userId: 2, title: 'My Project 1 Experience',           body: 'Responsive design taught me to think mobile-first.',   createdAt: '2026-01-13T11:00:00Z' },
  { id: 3, userId: 3, title: 'API Design Principles',             body: 'Resources are Nouns. Methods are Verbs. Never forget.', createdAt: '2026-01-14T12:00:00Z' },
];

let nextUserId = 4;
let nextPostId = 4;

// ═══════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════

/** Standard success response */
const ok = (res, data, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({ success: true, data, ...meta });

/** Standard error response */
const fail = (res, statusCode, message, details = null) =>
  res.status(statusCode).json({ success: false, error: { code: statusCode, message, details } });

/** Validate email format */
const isEmail = str => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

/** Check required string fields */
const requireFields = (body, fields) => {
  const missing = fields.filter(f => !body[f] || String(body[f]).trim() === '');
  return missing.length ? missing : null;
};


// ═══════════════════════════════════════════════
// ROOT — GET /
// Health check / API index
// ═══════════════════════════════════════════════
app.get('/', (_req, res) => {
  res.status(200).json({
    name:        'DecodeLabs Backend API',
    version:     '1.0.0',
    project:     'Project 2 — Backend API Development',
    batch:       '2026',
    description: 'Project 1 was the skin. Project 2 is the life.',
    endpoints: {
      users: {
        'GET    /users':          'List all users',
        'POST   /users':          'Create a user',
        'GET    /users/:id':      'Get user by ID',
        'PUT    /users/:id':      'Update user by ID',
        'DELETE /users/:id':      'Delete user by ID',
        'GET    /users/:id/posts':'Get all posts by user',
      },
      posts: {
        'GET    /posts':     'List all posts',
        'POST   /posts':     'Create a post',
        'GET    /posts/:id': 'Get post by ID',
        'PUT    /posts/:id': 'Update post by ID',
        'DELETE /posts/:id': 'Delete post by ID',
      },
      system: {
        'GET /health': 'System health check',
        'GET /status': 'API stats',
      }
    },
  });
});


// ═══════════════════════════════════════════════
// HEALTH — GET /health
// ═══════════════════════════════════════════════
app.get('/health', (_req, res) => {
  ok(res, {
    status:    'healthy',
    uptime:    `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    memory:    process.memoryUsage().rss,
  });
});


// ═══════════════════════════════════════════════
// STATUS — GET /status
// ═══════════════════════════════════════════════
app.get('/status', (_req, res) => {
  ok(res, {
    users: users.length,
    posts: posts.length,
    serverTime: new Date().toISOString(),
  });
});


// ═══════════════════════════════════════════════
// USERS RESOURCE
// ═══════════════════════════════════════════════

/**
 * GET /users
 * List all users (supports ?role= filter)
 * Status: 200 OK
 */
app.get('/users', (req, res) => {
  let result = [...users];

  // Optional filter: ?role=admin or ?role=intern
  if (req.query.role) {
    result = result.filter(u => u.role === req.query.role);
  }

  ok(res, result, 200, { total: result.length });
});


/**
 * POST /users
 * Create a new user
 * Body: { name, email, role? }
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
app.post('/users', (req, res) => {
  // ── SYNTACTIC VALIDATION (Is the format correct?) ──
  const missing = requireFields(req.body, ['name', 'email']);
  if (missing) {
    return fail(res, 400, 'Missing required fields', { missing });
  }

  const { name, email, role = 'intern' } = req.body;

  if (!isEmail(email)) {
    return fail(res, 400, 'Invalid email format', { field: 'email', received: email });
  }

  const validRoles = ['admin', 'intern', 'mentor'];
  if (!validRoles.includes(role)) {
    return fail(res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`, { field: 'role', received: role });
  }

  if (name.trim().length < 2 || name.trim().length > 60) {
    return fail(res, 400, 'Name must be between 2 and 60 characters', { field: 'name' });
  }

  // ── SEMANTIC VALIDATION (Is the logic valid?) ──
  const duplicate = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (duplicate) {
    return fail(res, 409, 'A user with this email already exists', { field: 'email' });
  }

  const newUser = {
    id:        nextUserId++,
    name:      name.trim(),
    email:     email.toLowerCase().trim(),
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  ok(res, newUser, 201);
});


/**
 * GET /users/:id
 * Get single user by ID
 * Status: 200 OK | 400 Bad Request | 404 Not Found
 */
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'User ID must be a number');

  const user = users.find(u => u.id === id);
  if (!user) return fail(res, 404, `User with ID ${id} not found`);

  ok(res, user);
});


/**
 * PUT /users/:id
 * Full update of a user
 * Body: { name?, email?, role? }
 * Status: 200 OK | 400 | 404 | 409
 */
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'User ID must be a number');

  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return fail(res, 404, `User with ID ${id} not found`);

  const { name, email, role } = req.body;

  // Validate only fields that were provided
  if (email !== undefined) {
    if (!isEmail(email)) return fail(res, 400, 'Invalid email format', { field: 'email' });
    const dup = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (dup) return fail(res, 409, 'Email already in use by another user');
  }

  const validRoles = ['admin', 'intern', 'mentor'];
  if (role !== undefined && !validRoles.includes(role)) {
    return fail(res, 400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  if (name !== undefined && (name.trim().length < 2 || name.trim().length > 60)) {
    return fail(res, 400, 'Name must be between 2 and 60 characters');
  }

  // Merge update
  users[idx] = {
    ...users[idx],
    ...(name  ? { name:  name.trim() }              : {}),
    ...(email ? { email: email.toLowerCase().trim() } : {}),
    ...(role  ? { role }                             : {}),
    updatedAt: new Date().toISOString(),
  };

  ok(res, users[idx]);
});


/**
 * DELETE /users/:id
 * Remove a user (and their posts)
 * Status: 200 OK | 400 | 404
 */
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'User ID must be a number');

  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return fail(res, 404, `User with ID ${id} not found`);

  const deleted = users.splice(idx, 1)[0];

  // Cascade delete: remove associated posts
  const removedPosts = posts.filter(p => p.userId === id).length;
  posts = posts.filter(p => p.userId !== id);

  ok(res, { deleted, cascadeDeletedPosts: removedPosts });
});


/**
 * GET /users/:id/posts
 * Get all posts by a specific user
 * Status: 200 OK | 400 | 404
 */
app.get('/users/:id/posts', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'User ID must be a number');

  const user = users.find(u => u.id === id);
  if (!user) return fail(res, 404, `User with ID ${id} not found`);

  const userPosts = posts.filter(p => p.userId === id);
  ok(res, userPosts, 200, { total: userPosts.length, user: { id: user.id, name: user.name } });
});


// ═══════════════════════════════════════════════
// POSTS RESOURCE
// ═══════════════════════════════════════════════

/**
 * GET /posts
 * List all posts (supports ?userId= filter)
 * Status: 200 OK
 */
app.get('/posts', (req, res) => {
  let result = posts.map(post => {
    const author = users.find(u => u.id === post.userId);
    return { ...post, author: author ? { id: author.id, name: author.name } : null };
  });

  if (req.query.userId) {
    const uid = parseInt(req.query.userId, 10);
    result = result.filter(p => p.userId === uid);
  }

  ok(res, result, 200, { total: result.length });
});


/**
 * POST /posts
 * Create a new post
 * Body: { userId, title, body }
 * Status: 201 Created | 400 | 404
 */
app.post('/posts', (req, res) => {
  const missing = requireFields(req.body, ['userId', 'title', 'body']);
  if (missing) return fail(res, 400, 'Missing required fields', { missing });

  const { userId, title, body } = req.body;
  const uid = parseInt(userId, 10);

  if (isNaN(uid)) return fail(res, 400, 'userId must be a number', { field: 'userId' });

  // Semantic: does the referenced user exist?
  const user = users.find(u => u.id === uid);
  if (!user) return fail(res, 404, `Cannot create post — user with ID ${uid} not found`);

  if (title.trim().length < 3 || title.trim().length > 120) {
    return fail(res, 400, 'Title must be between 3 and 120 characters', { field: 'title' });
  }

  if (body.trim().length < 10) {
    return fail(res, 400, 'Body must be at least 10 characters', { field: 'body' });
  }

  const newPost = {
    id:        nextPostId++,
    userId:    uid,
    title:     title.trim(),
    body:      body.trim(),
    createdAt: new Date().toISOString(),
  };

  posts.push(newPost);
  ok(res, { ...newPost, author: { id: user.id, name: user.name } }, 201);
});


/**
 * GET /posts/:id
 * Get single post by ID
 * Status: 200 OK | 400 | 404
 */
app.get('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'Post ID must be a number');

  const post = posts.find(p => p.id === id);
  if (!post) return fail(res, 404, `Post with ID ${id} not found`);

  const author = users.find(u => u.id === post.userId);
  ok(res, { ...post, author: author ? { id: author.id, name: author.name } : null });
});


/**
 * PUT /posts/:id
 * Update a post
 * Body: { title?, body? }
 * Status: 200 OK | 400 | 404
 */
app.put('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'Post ID must be a number');

  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return fail(res, 404, `Post with ID ${id} not found`);

  const { title, body } = req.body;

  if (title !== undefined && (title.trim().length < 3 || title.trim().length > 120)) {
    return fail(res, 400, 'Title must be between 3 and 120 characters');
  }
  if (body !== undefined && body.trim().length < 10) {
    return fail(res, 400, 'Body must be at least 10 characters');
  }

  posts[idx] = {
    ...posts[idx],
    ...(title ? { title: title.trim() } : {}),
    ...(body  ? { body:  body.trim()  } : {}),
    updatedAt: new Date().toISOString(),
  };

  ok(res, posts[idx]);
});


/**
 * DELETE /posts/:id
 * Remove a post
 * Status: 200 OK | 400 | 404
 */
app.delete('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return fail(res, 400, 'Post ID must be a number');

  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return fail(res, 404, `Post with ID ${id} not found`);

  const deleted = posts.splice(idx, 1)[0];
  ok(res, { deleted });
});


// ═══════════════════════════════════════════════
// GLOBAL ERROR HANDLERS
// ═══════════════════════════════════════════════

// 404 — Route not found
app.use((req, res) => {
  fail(res, 404, `Route not found: ${req.method} ${req.path}`, {
    hint: 'Visit GET / to see all available endpoints.'
  });
});

// 500 — Internal server error (circuit breaker)
app.use((err, _req, res, _next) => {
  console.error('[500 Internal Error]', err);
  fail(res, 500, 'Internal server error. The system is self-healing.', {
    message: err.message
  });
});


// ═══════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   DecodeLabs — Project 2: Backend API        ║');
  console.log('║   Batch 2026 | Build with Integrity          ║');
  console.log(`║   Server running at http://localhost:${PORT}    ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('  GET  /          → API index & docs');
  console.log('  GET  /health    → System health');
  console.log('  GET  /users     → List users');
  console.log('  POST /users     → Create user');
  console.log('  GET  /posts     → List posts');
  console.log('  POST /posts     → Create post\n');
});

module.exports = app;
