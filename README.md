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
