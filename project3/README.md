# DecodeLabs — Project 3: Database Integration
**Full Stack Industrial Training Kit | Batch 2026**

> "You cannot interact with data until you connect to it.
>  You cannot connect until you design it.
>  Once it is built, you must protect it."

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Server runs at: http://localhost:3000
# 4. Database file auto-created at: data/database.json
```

**Data persists across restarts** — stop the server, start again, your data is still there.

---

## 🏗️ The 4 Pillars

| Pillar | What | Where in code |
|--------|------|---------------|
| 1 — Blueprint  | Schema & Design         | `SCHEMA` object in `database.js` |
| 2 — Bridge     | Integration & Connection| `database.js` ↔ `server.js`      |
| 3 — Action     | CRUD & RESTful HTTP     | All route handlers in `server.js` |
| 4 — Shield     | Integrity & Security    | Constraint validation in `database.js` |

---

## 📐 Database Schema (Entity-Relationship Design)

```
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│           USERS             │       │              POSTS               │
├─────────────────────────────┤       ├──────────────────────────────────┤
│ id        INTEGER  PK  AUTO │◄──┐   │ id        INTEGER  PK  AUTO      │
│ name      TEXT     NOT NULL │   │   │ userId    INTEGER  NOT NULL  FK──┘│
│ email     TEXT     NOT NULL │   └───│ title     TEXT     NOT NULL       │
│           UNIQUE            │       │           minLen:3  maxLen:120    │
│ role      TEXT     NOT NULL │       │ body      TEXT     NOT NULL       │
│           CHECK(admin,      │       │           minLen:10               │
│           intern, mentor)   │       │ category  TEXT                    │
│ bio       TEXT              │       │           CHECK(general,          │
│ createdAt TEXT     NOT NULL │       │           project, announcement)  │
│ updatedAt TEXT              │       │ createdAt TEXT     NOT NULL       │
└─────────────────────────────┘       │ updatedAt TEXT                    │
                                      └──────────────────────────────────┘

Relationship: User (1) ──── (Many) Posts    [One-to-Many / 1:M]
```

---

## 🗺️ CRUD → HTTP → SQL Mapping

| CRUD   | HTTP Method | SQL Statement | Endpoint example          |
|--------|-------------|---------------|---------------------------|
| CREATE | POST        | INSERT        | `POST /users`             |
| READ   | GET         | SELECT        | `GET /users`              |
| UPDATE | PUT         | UPDATE        | `PUT /users/:id`          |
| DELETE | DELETE      | DELETE        | `DELETE /users/:id`       |

---

## 🔒 Database Constraints (Pillar 4: The Shield)

Every write operation is validated at the **database layer** — not just the app layer.

| Constraint  | Columns             | Effect                                     |
|-------------|---------------------|--------------------------------------------|
| `NOT NULL`  | name, email, role, title, body, userId | Field cannot be empty  |
| `UNIQUE`    | email               | No two users can share an email            |
| `CHECK`     | role, category      | Only allowed values accepted               |
| `FOREIGN KEY` | posts.userId      | Must reference an existing user            |
| `CASCADE DELETE` | posts (on user delete) | Posts deleted when user is deleted |
| `minLen/maxLen` | name, title, body | Length bounds enforced                |

**Parameterized approach** — all user input is handled as data, never concatenated into query strings. This prevents SQL Injection.

---

## 📡 API Endpoints

### System
```
GET  /        → API index & endpoint list
GET  /health  → System health check
GET  /schema  → Full database schema definition
GET  /stats   → Row counts, role breakdown, category breakdown
```

### Users Resource
```
GET    /users              → SELECT * FROM users
GET    /users?role=intern  → SELECT * FROM users WHERE role = ?
POST   /users              → INSERT INTO users
GET    /users/:id          → SELECT * FROM users WHERE id = ?
PUT    /users/:id          → UPDATE users SET ... WHERE id = ?
DELETE /users/:id          → DELETE FROM users WHERE id = ? (+ CASCADE)
GET    /users/:id/posts    → SELECT * FROM posts WHERE userId = ? (JOIN)
```

### Posts Resource
```
GET    /posts                   → SELECT posts.*, users.name FROM posts JOIN users
GET    /posts?userId=1          → Filter by user
GET    /posts?category=project  → Filter by category
POST   /posts                   → INSERT INTO posts (FK check)
GET    /posts/:id               → SELECT * FROM posts WHERE id = ? (JOIN)
PUT    /posts/:id               → UPDATE posts SET ... WHERE id = ?
DELETE /posts/:id               → DELETE FROM posts WHERE id = ?
```

---

## 🧪 Test with curl

```bash
# View schema
curl http://localhost:3000/schema

# View stats
curl http://localhost:3000/stats

# Get all users
curl http://localhost:3000/users

# Create user (INSERT INTO users)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Dana Ahmed","email":"dana@example.com","role":"intern","bio":"Learning full stack."}'

# Restart server → data still there (persistent!)
# curl http://localhost:3000/users   → Dana is still in the list

# Test UNIQUE constraint
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Clone","email":"dana@example.com","role":"intern"}'
# → 400: UNIQUE constraint failed

# Test NOT NULL constraint
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"NoEmail"}'
# → 400: NOT NULL constraint — email is required

# Test CHECK constraint
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad Role","email":"bad@test.com","role":"superadmin"}'
# → 400: CHECK constraint failed

# Create a post (with FOREIGN KEY check)
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"title":"My First Persisted Post","body":"This data survives a server restart!","category":"project"}'

# Test FOREIGN KEY constraint
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"userId":999,"title":"Orphan Post","body":"This should fail with FK error."}'
# → 404: FOREIGN KEY constraint failed

# Join query — posts with author info
curl http://localhost:3000/posts

# Update (UPDATE SET)
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"role":"mentor","bio":"Updated bio."}'

# Cascade delete — deletes user AND their posts
curl -X DELETE http://localhost:3000/users/2
```

---

## 📁 Project Structure

```
project3/
├── server.js         ← Express API (The Bridge — Pillar 2)
├── database.js       ← Database engine (Schema + CRUD + Constraints)
├── README.md         ← This documentation
├── package.json      ← Node.js config
├── node_modules/     ← Dependencies
└── data/
    └── database.json ← Your persistent database (auto-created)
```

---

## 💡 Key Concepts Demonstrated

| Concept | Implementation |
|---|---|
| Schema design | `SCHEMA` object with typed columns and constraints |
| Primary Keys | `id` field with AUTO INCREMENT on each table |
| Foreign Keys | `posts.userId` references `users.id` |
| NOT NULL | Validated on every INSERT |
| UNIQUE | Email uniqueness checked before INSERT/UPDATE |
| CHECK | role and category validated against allowed values |
| Cascade Delete | Deleting a user removes all their posts |
| JOIN query | `GET /posts` and `GET /users/:id/posts` return related data |
| Parameterization | Input never concatenated — always treated as data |
| Data Persistence | All writes saved to `data/database.json` |
| CRUD ↔ REST ↔ SQL | Full mapping: POST=INSERT, GET=SELECT, PUT=UPDATE, DELETE=DELETE |

---

*DecodeLabs · www.decodelabs.tech · Batch 2026*
