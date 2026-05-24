# DecodeLabs — Project 2: Backend API
**Full Stack Industrial Training Kit | Batch 2026**

> "Project 1 was the skin. Project 2 is the life."

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
node server.js

# Server runs at: http://localhost:3000
```

---

## 📐 Architecture

This API follows the **IPO Model** taught in the training:

```
INPUT (HTTP Request)
  → Syntactic Validation (Is the format correct?)
  → Semantic Validation  (Is the logic valid?)
  → PROCESS (Business logic)
  → OUTPUT (JSON Response with correct status code)
```

**The Gatekeeper Rule:** Never Trust the Client. All input is validated before processing.

**RESTful Naming:** Resources are Nouns. Methods are Verbs.
- ✅ `GET /users`        — correct
- ❌ `GET /getUsers`     — wrong
- ✅ `POST /users`       — correct
- ❌ `POST /createUser`  — wrong

---

## 📡 API Endpoints

### System

| Method | Endpoint  | Description         | Status |
|--------|-----------|---------------------|--------|
| GET    | `/`       | API index & docs    | 200    |
| GET    | `/health` | System health check | 200    |
| GET    | `/status` | API statistics      | 200    |

---

### Users Resource — `/users`

#### GET /users
List all users. Supports optional `?role=` filter.

```
GET /users
GET /users?role=admin
GET /users?role=intern
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Alice Johnson", "email": "alice@decodelabs.tech", "role": "admin", "createdAt": "..." }
  ],
  "total": 3
}
```

---

#### POST /users
Create a new user.

```
POST /users
Content-Type: application/json

{
  "name":  "Jane Doe",
  "email": "jane@example.com",
  "role":  "intern"
}
```

**Validation Rules:**
- `name` — required, 2–60 characters
- `email` — required, valid email format, must be unique
- `role` — optional, must be `admin` | `intern` | `mentor` (default: `intern`)

**Response 201:**
```json
{ "success": true, "data": { "id": 4, "name": "Jane Doe", "email": "jane@example.com", "role": "intern", "createdAt": "..." } }
```

**Response 400** (missing field):
```json
{ "success": false, "error": { "code": 400, "message": "Missing required fields", "details": { "missing": ["email"] } } }
```

**Response 409** (duplicate email):
```json
{ "success": false, "error": { "code": 409, "message": "A user with this email already exists" } }
```

---

#### GET /users/:id
Get a single user by ID.

```
GET /users/1
```

**Response 200 / 404**

---

#### PUT /users/:id
Update a user. All fields optional.

```
PUT /users/1
Content-Type: application/json

{ "name": "Alice Smith", "role": "mentor" }
```

**Response 200 / 400 / 404 / 409**

---

#### DELETE /users/:id
Delete a user and cascade-delete their posts.

```
DELETE /users/2
```

**Response 200:**
```json
{ "success": true, "data": { "deleted": { ... }, "cascadeDeletedPosts": 1 } }
```

---

#### GET /users/:id/posts
Get all posts written by a user.

```
GET /users/1/posts
```

**Response 200:**
```json
{ "success": true, "data": [...], "total": 2, "user": { "id": 1, "name": "Alice Johnson" } }
```

---

### Posts Resource — `/posts`

#### GET /posts
List all posts with author info. Supports `?userId=` filter.

```
GET /posts
GET /posts?userId=1
```

---

#### POST /posts
Create a new post.

```
POST /posts
Content-Type: application/json

{
  "userId": 1,
  "title":  "My First Backend Post",
  "body":   "The Gatekeeper Rule says never trust the client."
}
```

**Validation Rules:**
- `userId` — required, must reference an existing user
- `title`  — required, 3–120 characters
- `body`   — required, minimum 10 characters

**Response 201 / 400 / 404**

---

#### GET /posts/:id
Get a single post with author info.

---

#### PUT /posts/:id
Update title and/or body of a post.

---

#### DELETE /posts/:id
Delete a post.

---

## 📊 HTTP Status Codes Used

| Code | Meaning          | When used                            |
|------|------------------|--------------------------------------|
| 200  | OK               | Successful GET, PUT, DELETE          |
| 201  | Created          | Successful POST                      |
| 400  | Bad Request      | Invalid input / missing fields       |
| 404  | Not Found        | Resource doesn't exist               |
| 409  | Conflict         | Duplicate entry (email already used) |
| 500  | Internal Error   | Unexpected server crash              |

---

## 🔒 Validation — The Gatekeeper Rule

Two layers of validation on every POST/PUT:

**Layer 1 — Syntactic (Format check):**
- Are required fields present?
- Is the email format valid?
- Are strings within length limits?
- Is the role one of the allowed values?

**Layer 2 — Semantic (Logic check):**
- Is the email unique (no duplicates)?
- Does the referenced userId actually exist?

---

## 🧪 Quick Test with curl

```bash
# Health check
curl http://localhost:3000/health

# Get all users
curl http://localhost:3000/users

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","role":"intern"}'

# Get user by ID
curl http://localhost:3000/users/1

# Get posts by user
curl http://localhost:3000/users/1/posts

# Create a post
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"title":"My Post Title","body":"This is the body of the post, at least 10 chars."}'

# Update a user
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"role":"mentor"}'

# Delete a post
curl -X DELETE http://localhost:3000/posts/1

# Test 404
curl http://localhost:3000/users/999

# Test 400 (bad email)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bad","email":"not-an-email"}'
```

---

## 📁 Project Structure

```
project2/
├── server.js       ← Main API server (all endpoints)
├── README.md       ← This file (API documentation)
└── package.json    ← Node.js config
```

---

## 🏗️ Key Concepts Demonstrated

| Concept | Where |
|---|---|
| GET endpoints | `GET /users`, `GET /posts`, `GET /users/:id/posts` |
| POST endpoints | `POST /users`, `POST /posts` |
| PUT endpoints | `PUT /users/:id`, `PUT /posts/:id` |
| DELETE endpoints | `DELETE /users/:id`, `DELETE /posts/:id` |
| Input validation | Every POST and PUT handler |
| Error handling | Global 404 + 500 middleware |
| Correct status codes | 200, 201, 400, 404, 409, 500 |
| RESTful naming | `/users`, `/users/:id`, `/users/:id/posts` |
| JSON responses | All endpoints return structured JSON |
| Query parameters | `?role=`, `?userId=` filters |

---

*DecodeLabs · www.decodelabs.tech · Batch 2026*
