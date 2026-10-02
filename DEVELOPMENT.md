# Development setup

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB Atlas cluster for database-backed phases

## First setup

From the repository root:

```sh
npm install
cp .env.example .env
```

Update `MONGODB_URI` in `.env` with the connection string from Atlas. Create a database user under **Database Access**, allow your current IP under **Network Access**, and URL-encode special characters in the username or password. Also replace `JWT_SECRET` before enabling authentication.

For local development, `.env.local` can override values from `.env` without replacing shared deployment settings. A local MongoDB instance uses:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ik_shop
```

An Atlas SRV URI usually looks like:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/ik_shop?retryWrites=true&w=majority
```

Use the database name `ik_shop` unless you intentionally choose another name. Atlas provides TLS automatically through the `mongodb+srv` connection string. The server connects during startup; if Atlas is unavailable, the server still starts and the health endpoint reports `status: "degraded"`.

## Run locally

Use separate terminals from the repository root:

```sh
npm run dev:server
npm run dev:client
```

To load repeatable placeholder catalog data into the configured MongoDB database:

```sh
npm run --workspace server seed:catalog
```

To load only the six baseline categories without creating brands or products:

```sh
npm run --workspace server seed:categories
```

This creates or updates three categories, two brands, and six demo products by stable slugs and SKUs.

The client runs at `http://localhost:5173` and the server runs at `http://localhost:4000`.

Verify the server with:

```sh
curl http://localhost:4000/api/v1/health
```

Expect `database: "connected"` and `status: "ok"` when the credentials and database URI are correct.

## Verification

Run the full workspace checks before completing a phase:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

After a successful production build, start the compiled API with:

```sh
npm run start:server
```

Environment variables are loaded from `.env` and validated when the server starts. Keep `.env` out of version control.
