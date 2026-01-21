# HRMS Backend API Documentation 🔧

> Quick reference for frontend developers: how the system works, API flows, and integration examples.

---

## 🔍 Overview

- **Base URL:** /api/v1
- **Server:** Express + Prisma + Redis + Cloudinary (for file uploads)
- **Auth:** JWT (access token + refresh token)
- **Rate limiting & security:** Redis-backed rate limiting, brute-force protection for auth, IP blocklist, per-endpoint limits
- **Error format:** JSON objects with an `error` field on failures, or `{ status: "success", data: ... }` on success in many endpoints.

---

## ⚙️ How the system works (high level)

1. Client communicates with the backend using HTTPS at `/api/v1`.
2. Requests pass through global middlewares: security headers (Helmet), CORS, body size limits, sanitization, rate limiting, upload-guard and caching helpers.
3. Authentication: Clients obtain tokens via `/auth/login` and include `Authorization: Bearer <accessToken>` on protected routes.
4. Redis is used for caching, rate limiting, token/lockout storage and audit logs.
5. Files are uploaded via multipart/form-data and streamed to Cloudinary (memory upload using multer).
6. Background jobs handle tasks like contract upload checking and expiring document notifications.

---

## 🔐 Authentication & session flow

- Login: `POST /api/v1/auth/login` → returns `tokens` object: `{ accessToken, refreshToken }`.
  - Access tokens expire quickly (about 15 minutes) and are used on the `Authorization` header.
  - Refresh tokens expire in ~7 days and are used at `POST /api/v1/auth/refresh` to get new tokens.
- Logout: `POST /api/v1/auth/logout` revokes the access token (requires `Authorization` header).
- Password reset & signup use OTP endpoints under `/auth/*` (request, verify, complete flows).

Security notes for frontend:
- Best practice: keep the access token in memory and the refresh token in a secure location (HttpOnly cookie if possible). This backend currently returns refresh tokens in JSON—be careful storing them in localStorage.
- On 401 errors, call `/api/v1/auth/refresh` with the `refreshToken` to obtain new tokens and retry the original request.
- Handle 429 (Too many requests) by backing off (exponential backoff) — there is no Retry-After header.

---

## 🧭 Common conventions

- Protected routes require header: `Authorization: Bearer <accessToken>`.
- Pagination: use `page` and `take` (or `skip`) query params. Response pagination shape:
  ```json
  {
    "data": [...],
    "total": 123,
    "skip": 0,
    "take": 50,
    "page": 1,
    "totalPages": 3
  }
  ```
- Errors:
  - Generic error responses: `{ "error": "Message" }` with appropriate HTTP status codes (400/401/403/404/429/500)
  - Validation uses request validation middleware; validation errors typically return 400.
- Caching for GETs: `Cache-Control: public, max-age=300` and `ETag` header are set for GET responses.
- Upload guard: multipart upload sizes are limited by `MAX_UPLOAD_BYTES` (default 10 MB); excessive size returns 413.

---

## 📚 Top-level module endpoints (summary)

All routes are mounted under `/api/v1`.

- Auth
  - `POST /auth/register` — register new account
  - `POST /auth/login` — authenticate and receive tokens
  - `POST /auth/logout` — revoke access token
  - `POST /auth/refresh` — exchange refresh token for a new pair
  - OTP/password routes: `/auth/signup/*`, `/auth/reset/*`

- Employees (`/employees`)
  - `GET /employees` — list (permission: `employees:list`)
  - `POST /employees` — create (permission: `employees:create`)
  - `GET /employees/:id` — read (permission: `employees:read`)
  - `PATCH /employees/:id` — update (permission: `employees:update`)
  - `DELETE /employees/:id` — delete (permission: `employees:delete`)
  - Subroutes (per employee): `/employees/:employeeId/contracts`, `/employees/:employeeId/documents`, `/employees/:employeeId/disciplinary-records` (documents expect multipart/form-data with `file` field)

- Payroll (`/payroll`)
  - `POST /payroll/process` — process payroll (permission: `payroll:process`)
  - `GET /payroll/runs` — list payroll runs
  - `GET /payroll/runs/:id` — get details
  - Subroutes: `/payroll/payslips`, `/payroll/salary-structures`, `/payroll/statutory-deductions`.

- Attendance (`/attendance`)
  - `POST /attendance/mark` — mark attendance
  - `POST /attendance` — create attendance record
  - `GET /attendance` — list records
  - `GET /attendance/:id`, `PATCH /attendance/:id`, `DELETE /attendance/:id`

- Performance (`/performance`)
  - `GET /performance` — overview
  - `GET /performance/kpis` — list KPIs
  - `POST /performance/kpis` — create KPI (permission: `performance:kpis:create`)
  - Evaluations: `POST /performance/evaluations`, `GET /performance/evaluations/employee/:employeeId`

- Users (`/users`) — user management and listing (permissions enforced)

(For full lists of subroutes and exact request/response bodies, refer to the individual module schemas in `src/modules/*/schema.ts` files.)

---

## 🔁 Example integration snippets (frontend)

- Minimal login + subsequent request with fetch:

```js
// Login
const loginRes = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data } = await loginRes.json();
const { accessToken, refreshToken } = data.tokens;

// Fetch protected resource
const res = await fetch('/api/v1/employees', {
  headers: { Authorization: `Bearer ${accessToken}` }
});

// On 401 => call refresh
const refreshRes = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
const newTokens = await refreshRes.json();
```

- Axios interceptor recommended pattern (pseudo):

```js
// Attach access token to requests
axios.interceptors.request.use(cfg => {
  cfg.headers = cfg.headers || {};
  cfg.headers.Authorization = `Bearer ${getAccessToken()}`;
  return cfg;
});

// Refresh on 401
axios.interceptors.response.use(null, async err => {
  if (err.response?.status === 401) {
    // try refresh
    const r = await axios.post('/api/v1/auth/refresh', { refreshToken: getRefreshToken() });
    setTokens(r.data.data);
    // retry original request with new token
    err.config.headers.Authorization = `Bearer ${getAccessToken()}`;
    return axios(err.config);
  }
  throw err;
});
```

Security tip: prefer storing refresh token in an HttpOnly cookie (requires backend changes) to reduce XSS risk.

---

## ⚠️ Edge cases & troubleshooting

- 429 Too Many Requests: implement backoff and retries.
- 401 "Invalid token": refresh token or force login.
- 403 "Forbidden": permission/role missing—ensure the user has required permissions.
- 413 Payload too large: file exceeds `MAX_UPLOAD_BYTES` limit; compress or chunk uploads.

---

## 🛠️ Developer notes & where to look in the codebase

- Router registration: `src/routes/modules.ts`
- App middleware and base mount path: `src/app.ts` (`app.use('/api/v1', routes)`)
- Auth: `src/modules/auth/*` (controller, service, schema)
- File uploads: `src/modules/employee/documents` and `src/middlewares/multer.ts`
- Rate limiting & security helpers: `src/middlewares/security.ts`
- Pagination helpers: `src/common/pagination.ts`

---

If you'd like, I can expand this into a full OpenAPI spec (YAML/JSON) or add concrete request/response body examples pulled from the module schemas. ✅
