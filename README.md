# cocido-web

cocido's site: the landing, the principles, the guide and the tutorial, in English (`/`) and Spanish (`/es/`).
Astro 7 with Starlight for the guide, Tailwind 4 and shadcn/ui, in gruvbox's colours.

```sh
nvm use            # Node 22.23.4 or later: Astro 7 refuses older ones
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/
```

## Deploying

A static site: `Dockerfile` builds it with Node and serves `dist/` with nginx (`nginx.conf`). In Coolify,
pick the Dockerfile build pack and port 80. `SITE_URL` (a build argument) is the address it is published
at, for its canonical URLs and sitemap: `https://cocido.dev` unless told otherwise, so while it lives at a
provisional address (`*.sslip.io`), set it to that one.

```sh
docker build --build-arg SITE_URL=http://localhost:8080 -t cocido-web .
docker run --rm -p 8080:80 cocido-web   # http://localhost:8080
```

## Before launch

The site is a teaser. `src/config/site.ts` holds the package names and what is not public yet:

- `PACKAGE`: the npm scope, `@cocido` (`@cocido/core`, `@cocido/plan`, `@cocido/review`). The landing reads it,
  and the docs write `%PKG%` wherever it goes (in text and in code); a remark plugin puts it in at build time.
- `CREATE_COMMAND`: `bun create cocido my-app`, from the `create-cocido` package.
- `GITHUB`: `null` disables every GitHub link and the copy button of the install command.

On launch day, set `GITHUB` and rebuild.

## Where things are

| Path | What it is |
|---|---|
| `src/pages/` | The landing and the principles, one file per language |
| `src/components/landing/` | The landing's sections |
| `src/i18n/` | The landing's and the principles' copy, `en` and `es` (the principles' in `manifesto.ts`) |
| `src/content/docs/` | The guide, the tutorial and the reference (Starlight); Spanish under `es/` |
| `src/components/ui/` | shadcn/ui components |
| `src/styles/theme.css` | The theme's tokens (gruvbox), shared by the landing and the docs |
| `src/styles/docs.css` | Starlight's colours mapped to those tokens |
| `wireframe/` | The wireframe the site was built from (not published) |
| `Dockerfile`, `nginx.conf` | The image Coolify deploys |
