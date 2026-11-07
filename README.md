# rghv.ca 2.0

Personal portfolio site built with Next.js App Router and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Build and Production

```bash
npm run build
npm run start
```

## Structure

- `src/app/page.tsx`: Main site UI and interaction logic.
- `src/app/context`, `src/app/work`, `src/app/entries`: Tab-specific entry routes.
- `src/app/api/footer-stats/route.ts`: Footer visitor/location stats endpoint.
- `public/`: Project media assets and local fonts.

## Private visitor log

The private timeline is available at `/private/visitors` after setting `VISITOR_LOG_ACCESS_KEY` in the Vercel project's Production environment. Generate a long random key (for example, `openssl rand -hex 32`) and keep it outside the repository. The existing `REDIS_URL` or `KV_REST_API_URL` and `KV_REST_API_TOKEN` connection must also be configured. Redeploy after adding the variable.

The access key signs a seven-day, HTTP-only login cookie. The page is omitted from navigation and search indexing, and the API checks the cookie before returning records. To keep your own browsing out of the log, visit the home page once with `?ignoreVisitor=1` in your browser; `?ignoreVisitor=0` restores tracking.

Tracking starts after deployment. It stores approximate Vercel city/country, an anonymous visitor cookie, page visits, external link opens, and visible-tab time. It does not store IP addresses or query strings. The log keeps at most 5,000 events and removes events older than 90 days. A session is grouped by tab with a 30-minute inactivity window. Active time is approximate because a browser may close before its final beacon reaches the server.
