# UniLib — Jules Project Instructions

## 1. Source of truth

The file:

`docs/UNILIB_FINAL_TECHNICAL_SPECIFICATION_v1.0.md`

is the frozen technical specification for UniLib.

Read it before implementing any task.

Do not redesign the architecture or invent alternative requirements.

If the specification is genuinely ambiguous or contradictory, stop and create a `SPEC-QUESTION` instead of guessing.

---

## 2. Task execution rules

Implement the tasks in the specification in order:

T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18

One task = one branch = one pull request.

Do not implement multiple unrelated tasks in one branch.

After completing a task:

1. Run the required tests.
2. Run lint.
3. Run TypeScript type checking.
4. Run the production build when required.
5. Report exactly what changed.
6. Report files changed.
7. Report tests/checks performed.
8. Report any remaining concerns.

Stop after the requested task.

---

## 3. Scope control

Do not add features that are not explicitly required by the frozen specification.

In particular, do not add:

* study groups
* WebRTC
* payments
* publisher workflows
* OCR
* sophisticated moderation
* notifications
* ratings
* bookmarks
* complex role systems
* document versioning
* vector databases
* embeddings
* AI feedback analysis
* AI-generated notes
* AI-generated quizzes
* AI-generated concept maps
* AI practice questions
* AI revision notes
* AI comments
* PDF processing in the MVP
* comment replies
* unnecessary analytics

Do not add new dependencies unless the specification explicitly permits them or a `SPEC-QUESTION` is resolved.

---

## 4. Security rules

Never create or commit real secrets.

Never create `.env` files containing real credentials.

Never expose:

* Supabase service-role keys
* Anthropic API keys
* other private API keys
* database passwords
* access tokens

Never bypass Row Level Security.

Never weaken authentication or authorization to make a feature easier to implement.

AI provider API calls must remain server-side.

---

## 5. AI rules

AI must be grounded in the UniLib document content according to the specification.

Do not invent unsupported citations.

Citations must refer to real document blocks/paragraphs.

Unsupported questions must receive the specified refusal behavior.

Do not add conversational memory, follow-up chat, saved answers, or other AI features unless explicitly required by the specification.

---

## 6. Architecture rules

Follow the stack and architecture defined by the specification.

Do not replace:

* Next.js
* React
* TypeScript
* Tailwind
* Supabase
* Vercel

with alternative technologies unless explicitly authorized.

Do not redesign the database schema.

Do not change API contracts.

Do not change security rules or thresholds.

If a change appears necessary, create a `SPEC-QUESTION` before implementing it.

---

## 7. Code quality

Use TypeScript strictly.

Avoid `any` unless absolutely unavoidable and explicitly justified.

Prefer small, testable functions.

Keep parsing, normalization, retrieval, prompting, and citation validation logic as pure and testable as practical.

Do not hide errors.

Handle loading, empty, error, and unsupported states explicitly.

---

## 8. Parser requirements

Supported MVP document formats are:

* Markdown
* TXT
* DOCX

PDF is not part of the MVP.

Paragraph/block IDs must remain stable according to the specification.

Do not silently change parser behavior to make tests pass.

---

## 9. Comments

Comments are flat comments.

There are no comment replies in the MVP.

Comments must remain associated with the correct document block/paragraph.

Respect ownership and authorization rules for deleting comments.

---

## 10. AI capabilities

The MVP has exactly these AI capabilities:

1. Ask a question
2. Explain a paragraph
3. Summarize a document

Do not add other AI features.

---

## 11. OpenAlex

Related scholarly readings must use the OpenAlex integration defined in the specification.

The integration must fail gracefully if the external service is unavailable.

Do not make the entire application unusable because OpenAlex is unavailable.

---

## 12. Testing

Tests are part of the implementation, not an optional final step.

Run the appropriate:

* unit tests
* integration tests
* lint
* TypeScript checks
* production build

Do not claim a task is complete if required checks are failing.

---

## 13. Secrets and repository safety

Never print secrets in terminal output, pull requests, logs, screenshots, or responses.

Never commit:

* `.env`
* `.env.local`
* API keys
* service-role keys
* database credentials
* authentication secrets

Use environment variable placeholders only.

---

## 14. Jules behavior

Before each task:

1. Read `AGENTS.md`.
2. Read the relevant sections of the frozen UniLib specification.
3. Inspect the existing implementation.
4. Implement only the requested task.

Do not assume future tasks should already be implemented.

Do not implement future features early.

Do not refactor unrelated code.

Do not change working code unnecessarily.

If something is unclear, stop and raise a `SPEC-QUESTION`.

---

## 15. Definition of done

A task is complete only when:

* the requested functionality is implemented
* relevant tests exist and pass
* lint passes
* TypeScript checks pass
* required build checks pass
* no secrets were introduced
* no out-of-scope features were added
* the implementation follows the frozen specification

Then stop and wait for the next task.
