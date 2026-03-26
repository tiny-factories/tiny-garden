# site-are.na v0.1.0 -- Turn Any Are.na Channel Into a Website

We're excited to share **site-are.na**, a tool that lets you transform any Are.na channel into a live website with one click.

## What it does

site-are.na connects to your Are.na account and generates a static site from your channel content -- images, text blocks, links, media, and attachments all come through. Pick a channel, choose a template, claim a subdomain, and hit publish.

## Key features

- **Are.na OAuth login** -- Sign in with your Are.na account, no separate registration needed.
- **Channel-to-site mapping** -- Each site is powered by a single Are.na channel. Update the channel, rebuild the site.
- **Handlebars templates** -- Sites are generated using customizable Handlebars templates with support for block partials and custom CSS.
- **Subdomain routing** -- Every site gets its own subdomain at `yourname.sitearena.com`.
- **Dashboard management** -- Create, publish, rebuild, and delete sites from a simple dashboard.
- **Block type support** -- Handles all Are.na block types: Image, Text, Link, Media, and Attachment.
- **Stripe billing** -- Free and Pro plans with Stripe subscription management built in.

## How it works

1. Log in with Are.na
2. Select a channel from your account
3. Choose a template and subdomain
4. Hit publish -- site-are.na fetches your blocks, renders them through the template, and outputs static HTML

Under the hood: Next.js 15, React 19, Prisma with SQLite, Tailwind CSS 4, and Handlebars for site generation.

## What's next

- More templates (portfolio, gallery, wiki)
- Custom domain support
- Automatic rebuilds on channel updates via webhooks
- Theme customization UI

---

## Recommended assets to include with this post

| Asset | Description | Suggested format |
|---|---|---|
| **Hero screenshot** | The landing page showing "Turn any Are.na channel into a website" | PNG, 1200x630px (works as OG image too) |
| **Dashboard screenshot** | The "Your sites" dashboard with at least one site listed | PNG, 1200x800px |
| **Before/after comparison** | Side-by-side of an Are.na channel and the generated site | PNG or GIF |
| **Build flow recording** | Screen recording of the full flow: login, select channel, publish, view live site | GIF or MP4, ~30s |
| **Architecture diagram** | Simple diagram: Are.na API -> site-are.na -> Static HTML on subdomain | SVG or PNG |
| **Template preview thumbnails** | Preview of each available template applied to the same channel | PNG, 600x400px each |
| **Logo/wordmark** | site-are.na branding for social sharing | SVG + PNG |
| **OG image** | Social card for link previews (hero screenshot with title overlay works well) | PNG, 1200x630px |
