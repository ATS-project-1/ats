# Resume JSON Schema

This document describes the JSON structure accepted by the `resumeSchema` Zod validator
defined in [`src/resume/resume.schema.ts`](../src/resume/resume.schema.ts).

The schema is stored in the `content` column (PostgreSQL `JSONB`) of the `resume_json` table
and is validated at runtime on every write.

---

## Top-level: `Resume`

The root object of every resume document.

| Field      | Type              | Required | Description                                           |
|------------|-------------------|----------|-------------------------------------------------------|
| `sections` | `ResumeSection[]` | ✅ Yes   | Ordered list of resume sections. May be an empty array. |

### Minimal valid document

```json
{ "sections": [] }
```

---

## `ResumeSection`

A labelled group of related entries (e.g. "Work Experience", "Education").

| Field     | Type            | Required | Description                                            |
|-----------|-----------------|----------|--------------------------------------------------------|
| `type`    | `SectionType`   | ✅ Yes   | Machine-readable section category. See enum below.     |
| `title`   | `string`        | ✅ Yes   | Human-readable heading displayed on the resume.        |
| `entries` | `ResumeEntry[]` | ✅ Yes   | Ordered list of entries in this section. May be empty. |

### `SectionType` enum

| Value          | Meaning                           |
|----------------|-----------------------------------|
| `"summary"`    | Professional summary / objective  |
| `"experience"` | Work / professional experience    |
| `"education"`  | Academic qualifications           |
| `"skills"`     | Technical or soft skills          |
| `"projects"`   | Personal or professional projects |

> **Note:** Any value outside the list above will cause a `ZodError` at validation time.

### Example

```json
{
  "type": "experience",
  "title": "Work Experience",
  "entries": []
}
```

---

## `ResumeEntry`

A single line item within a section (a job, degree, project, skill group, etc.).

| Field         | Type       | Required | Description                                                   |
|---------------|------------|----------|---------------------------------------------------------------|
| `title`       | `string`   | ✅ Yes   | Primary label (job title, degree name, project name…).        |
| `subtitle`    | `string`   | ❌ No    | Secondary label (company, institution, tech stack…).          |
| `startDate`   | `string`   | ❌ No    | Start date in any human-readable format (e.g. `"Jan 2021"`).  |
| `endDate`     | `string`   | ❌ No    | End date, or `"Present"` for current roles.                   |
| `description` | `string`   | ❌ No    | Free-text paragraph describing the entry.                     |
| `bullets`     | `string[]` | ❌ No    | Ordered list of achievement or responsibility bullets.        |

> All date fields are plain strings — no ISO-8601 enforcement is applied.
> Consumers are responsible for display formatting.

### Example

```json
{
  "title": "Senior Software Engineer",
  "subtitle": "Acme Corp",
  "startDate": "Mar 2021",
  "endDate": "Present",
  "description": "Led the migration of a monolith to microservices.",
  "bullets": [
    "Reduced p99 API latency by 40% through query optimisation.",
    "Mentored a team of four junior engineers."
  ]
}
```

---

## Complete example document

```json
{
  "sections": [
    {
      "type": "summary",
      "title": "Professional Summary",
      "entries": [
        {
          "title": "Full-Stack Engineer",
          "description": "5 years building scalable web applications with TypeScript and Node.js."
        }
      ]
    },
    {
      "type": "experience",
      "title": "Work Experience",
      "entries": [
        {
          "title": "Senior Software Engineer",
          "subtitle": "Acme Corp",
          "startDate": "Mar 2021",
          "endDate": "Present",
          "bullets": [
            "Reduced p99 API latency by 40%.",
            "Mentored four junior engineers."
          ]
        },
        {
          "title": "Software Engineer",
          "subtitle": "Beta Ltd",
          "startDate": "Jun 2019",
          "endDate": "Feb 2021",
          "bullets": [
            "Delivered three major product features on schedule."
          ]
        }
      ]
    },
    {
      "type": "education",
      "title": "Education",
      "entries": [
        {
          "title": "BSc Computer Science",
          "subtitle": "University of Lagos",
          "startDate": "Sep 2015",
          "endDate": "Jul 2019"
        }
      ]
    },
    {
      "type": "skills",
      "title": "Skills",
      "entries": [
        {
          "title": "Languages & Frameworks",
          "bullets": ["TypeScript", "Node.js", "React", "PostgreSQL"]
        }
      ]
    },
    {
      "type": "projects",
      "title": "Projects",
      "entries": [
        {
          "title": "ATS Platform",
          "subtitle": "TypeScript · Express · Prisma · PostgreSQL",
          "description": "Open-source applicant tracking system with AI-assisted resume scoring.",
          "bullets": [
            "Designed the JSONB resume schema and Zod runtime validation layer."
          ]
        }
      ]
    }
  ]
}
```

---

## Validation errors

Violations are surfaced as `ZodError` instances. Each issue contains:

| Field     | Description                                 |
|-----------|---------------------------------------------|
| `path`    | Dot-separated path to the failing field     |
| `message` | Human-readable description of the violation |
| `code`    | Zod error code (e.g. `invalid_enum_value`)  |

### Common mistakes

| Mistake                                    | Error path example             | Zod code             |
|--------------------------------------------|--------------------------------|----------------------|
| Missing required `title` on an entry       | `sections.0.entries.0.title`   | `invalid_type`       |
| Invalid `type` value (e.g. `"hobbies"`)    | `sections.0.type`              | `invalid_enum_value` |
| `bullets` is not an array                  | `sections.1.entries.0.bullets` | `invalid_type`       |
| `sections` is missing from the root object | `sections`                     | `invalid_type`       |
