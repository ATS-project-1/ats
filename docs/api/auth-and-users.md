# Auth and users API (EPIC 1)

Base URL in development: `http://localhost:3000`. All request and response bodies are JSON.

## Conventions

### Authentication

Protected endpoints need `Authorization: Bearer <accessToken>` (the scheme is case-insensitive). Get a token from `POST /auth/login`. Tokens are HS256 JWTs whose lifetime is `JWT_EXPIRES_IN` (`expiresIn` in the login response, in seconds). They contain only the user's id (`sub`) and role.

On every request the server re-reads the user from the database and uses the role stored there, not the one in the token. A suspension or role change therefore applies on the user's next request.

Roles are `CANDIDATE`, `RECRUITER` and `ADMIN`. Role checks are explicit: `ADMIN` has no implicit access to endpoints that list only other roles.

### Error format

Every error uses one shape:

```json
{
  "error": {
    "code": "EMAIL_TAKEN",
    "message": "An account with this email already exists",
    "details": []
  }
}
```

`details` appears only on validation errors, as `[{ "path": "password", "message": "..." }]`. Responses with status 401 and code `AUTH_REQUIRED` or `INVALID_TOKEN` also carry `WWW-Authenticate: Bearer`.

### Errors that any endpoint can return

| Status | Code                | When                                                                                   |
| ------ | ------------------- | -------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`  | Body fails validation (unknown fields are rejected too). `details` lists each problem. |
| 400    | `INVALID_JSON`      | Body is not valid JSON.                                                                |
| 413    | `PAYLOAD_TOO_LARGE` | Body is larger than 100 kB.                                                            |
| 404    | `ROUTE_NOT_FOUND`   | No such route.                                                                         |
| 500    | `INTERNAL_ERROR`    | Unexpected server error (details are only in the server log).                          |

### Errors from protected endpoints

| Status | Code                | When                                                                                       |
| ------ | ------------------- | ------------------------------------------------------------------------------------------ |
| 401    | `AUTH_REQUIRED`     | No `Authorization` header, a scheme other than Bearer, or an empty token.                  |
| 401    | `INVALID_TOKEN`     | Bad signature, expired, wrong issuer or audience, malformed, or the user no longer exists. |
| 403    | `ACCOUNT_SUSPENDED` | The user's account is suspended.                                                           |
| 403    | `FORBIDDEN`         | The user's role is not allowed to call this endpoint.                                      |

These four are not repeated per endpoint below. Each protected endpoint lists its allowed role.

---

## Auth

### POST /auth/register

Public. Creates an account with status `PENDING_VERIFICATION`. It does not create a candidate or recruiter profile; that happens on first access (see Profiles).

| Field      | Rules                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| `email`    | Required. Trimmed, lowercased, valid email, at most 254 characters.    |
| `password` | Required. At least 8 characters and at most 72 bytes in UTF-8.         |
| `fullName` | Required. Trimmed, 1 to 100 characters.                                |
| `role`     | Required. `CANDIDATE` or `RECRUITER`. `ADMIN` cannot be self-assigned. |

Unknown fields are rejected.

**201**

```json
{
  "user": {
    "id": "uuid",
    "email": "ada@example.com",
    "fullName": "Ada Lovelace",
    "role": "CANDIDATE",
    "status": "PENDING_VERIFICATION",
    "createdAt": "2026-10-07T15:56:32.617Z"
  }
}
```

| Status | Code               | When                                                                                         |
| ------ | ------------------ | -------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | See above.                                                                                   |
| 409    | `EMAIL_TAKEN`      | An account with this email exists (case-insensitive), including when two registrations race. |

### POST /auth/login

Public. `PENDING_VERIFICATION` and `ACTIVE` users can log in; `SUSPENDED` users cannot.

| Field      | Rules                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| `email`    | Required. Trimmed, lowercased, valid email.                                         |
| `password` | Required. 1 character to 72 bytes. The registration password rules are not applied. |

Unknown fields are rejected.

**200**

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "...",
    "fullName": "...",
    "role": "RECRUITER",
    "status": "ACTIVE",
    "createdAt": "..."
  }
}
```

| Status | Code                  | When                                                                                                      |
| ------ | --------------------- | --------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | See above.                                                                                                |
| 401    | `INVALID_CREDENTIALS` | Unknown email or wrong password. The two cases return an identical response and take about the same time. |
| 403    | `ACCOUNT_SUSPENDED`   | Correct password, but the account is suspended. Without the right password, the status is never revealed. |

### GET /auth/me

Any authenticated role.

**200** `{ "user": { id, email, fullName, role, status, createdAt } }`

---

## Profiles

Profile routes only ever act on the caller's own profile (identified by the token); no id is taken from the URL or body. A profile is created empty the first time its owner calls GET or PATCH. Concurrent first requests return the same profile.

### GET /candidates/me/profile

Role: `CANDIDATE`.

**200**

```json
{
  "profile": {
    "id": "uuid",
    "headline": null,
    "location": null,
    "phone": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": { "id": "uuid", "email": "...", "fullName": "..." }
  }
}
```

### PATCH /candidates/me/profile

Role: `CANDIDATE`. Send only the fields to change; `null` clears a field; empty strings are rejected. At least one field is required and unknown fields (such as `userId`) are rejected.

| Field      | Rules                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| `headline` | Optional, nullable. Trimmed, 1 to 120 characters.                                   |
| `location` | Optional, nullable. Trimmed, 1 to 100 characters.                                   |
| `phone`    | Optional, nullable. Trimmed, 7 to 20 characters, only digits, spaces and `+ - ( )`. |

**200** `{ "profile": ... }` (same shape as GET). Error: 400 `VALIDATION_ERROR`.

### GET /recruiters/me/profile

Role: `RECRUITER`.

**200**

```json
{
  "profile": {
    "id": "uuid",
    "jobTitle": null,
    "isOrgAdmin": false,
    "organization": null,
    "createdAt": "...",
    "updatedAt": "...",
    "user": { "id": "uuid", "email": "...", "fullName": "..." }
  }
}
```

`organization` is `{ "id": "uuid", "name": "..." }` when the recruiter belongs to one.

### PATCH /recruiters/me/profile

Role: `RECRUITER`. Same rules as the candidate PATCH, with one field. `organizationId` and `isOrgAdmin` are not accepted (400); use the organization endpoints.

| Field      | Rules                                             |
| ---------- | ------------------------------------------------- |
| `jobTitle` | Optional, nullable. Trimmed, 1 to 100 characters. |

**200** `{ "profile": ... }`. Error: 400 `VALIDATION_ERROR`.

---

## Organizations

Role for every endpoint below: `RECRUITER`. Routes act on the caller's own organization; no organization id is accepted from the URL or body. Responses use the organization shape:

```json
{
  "organization": {
    "id": "uuid",
    "name": "Tech Corp",
    "description": null,
    "website": "https://example.com",
    "createdAt": "...",
    "updatedAt": "...",
    "recruiters": [
      {
        "id": "uuid",
        "jobTitle": "Recruiter",
        "isOrgAdmin": true,
        "user": { "id": "uuid", "fullName": "...", "email": "..." }
      }
    ]
  }
}
```

Field rules shared by create and update:

| Field         | Rules                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------- |
| `name`        | Trimmed, 2 to 100 characters.                                                               |
| `description` | Trimmed, at most 2000 characters.                                                           |
| `website`     | Trimmed, at most 200 characters, a valid URL whose protocol is exactly `http:` or `https:`. |

### POST /organizations

Creates an organization and makes the caller its admin, in one transaction. `name` is required; `description` and `website` are optional. Unknown fields (such as `isOrgAdmin`) are rejected.

**201** `{ "organization": ... }`

| Status | Code                      | When                                                                                                            |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`        | See above.                                                                                                      |
| 409    | `ALREADY_IN_ORGANIZATION` | The caller already belongs to an organization. No organization is left behind, including when two creates race. |

### GET /organizations/me

**200** `{ "organization": ... }`

| Status | Code                  | When                            |
| ------ | --------------------- | ------------------------------- |
| 404    | `NOT_IN_ORGANIZATION` | The caller has no organization. |

### PATCH /organizations/me

Organization admins only. All fields optional, at least one required; `description` and `website` may be `null` to clear them. Unknown fields are rejected.

**200** `{ "organization": ... }`

| Status | Code                  | When                                     |
| ------ | --------------------- | ---------------------------------------- |
| 400    | `VALIDATION_ERROR`    | See above.                               |
| 403    | `NOT_IN_ORGANIZATION` | The caller has no organization.          |
| 403    | `ORG_ADMIN_REQUIRED`  | The caller is a member but not an admin. |

### POST /organizations/me/recruiters

Organization admins only. Adds an existing recruiter, by email, to the caller's organization as a non-admin member. The target's recruiter profile is created if they have never had one.

| Field   | Rules                                                                    |
| ------- | ------------------------------------------------------------------------ |
| `email` | Required. Trimmed, lowercased, valid email. Unknown fields are rejected. |

**200** `{ "organization": ... }`

| Status | Code                      | When                                                                        |
| ------ | ------------------------- | --------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`        | See above.                                                                  |
| 403    | `NOT_IN_ORGANIZATION`     | The caller has no organization.                                             |
| 403    | `ORG_ADMIN_REQUIRED`      | The caller is not an admin.                                                 |
| 404    | `RECRUITER_NOT_FOUND`     | No user with this email, or the user is not a recruiter.                    |
| 409    | `ALREADY_IN_ORGANIZATION` | The target already belongs to an organization (including the caller's own). |

Not implemented yet: removing members, transferring admin rights, and deleting organizations.

---

## Other

### GET /health

Public. **200** `{ "status": "ok" }`.

## Development seed accounts

`npm run db:seed` creates these accounts, all with the password `Password123!` (development only):

| Email                             | Role      | Notes                                   |
| --------------------------------- | --------- | --------------------------------------- |
| `recruiter@tech-corp.example.com` | RECRUITER | Admin of "Tech Corp"                    |
| `member@tech-corp.example.com`    | RECRUITER | Non-admin member of "Tech Corp"         |
| `alex.candidate@example.com`      | CANDIDATE | Has a profile, a resume and one version |
