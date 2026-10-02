# Development Rules

## Working Method

- Work one project phase at a time.
- Before each phase, define the objective, likely files, dependencies, and acceptance criteria.
- Inspect the existing repository before changing code.
- Prefer small, reviewable changes and preserve working code.
- Do not invent unresolved business rules; record assumptions and ask for approval.
- Keep `PROJECT.md` current when architecture or business rules change.

## TypeScript and Code Quality

- Use strict TypeScript.
- Avoid `any` unless the reason is documented.
- Prefer reusable components, services, schemas, and clear names.
- Keep customer and admin concerns separated at authorization boundaries.
- Validate input at API boundaries.
- Never trust price, role, quantity, or total values received from the browser.

## Security

- Hash passwords and never store plaintext passwords.
- Keep secrets in environment variables and out of source control.
- Protect every admin endpoint with explicit role-based authorization.
- Configure CORS intentionally.
- Rate-limit sensitive endpoints where appropriate.
- Record sensitive admin actions in audit logs.
- Never expose supplier cost or supplier identity through customer-facing APIs.

## Validation Before Phase Completion

Run the applicable checks before moving forward:

- Type-check
- Lint
- Tests
- Production build

Fix relevant errors before beginning the next phase.

## Git

- Make small commits after stable milestones.
- Do not commit secrets, local environment files, generated credentials, or build artifacts.
