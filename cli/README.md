# tiny.garden CLI (`tg`)

Customer CLI for creating and managing tiny.garden sites from terminal.

## Install

### From npm (target public install)

```bash
npm install -g @tiny-garden/cli
tg --help
```

### From this repository (development)

```bash
npm --prefix cli install
npm --prefix cli run build
node cli/dist/index.js --help
```

## Auth

Generate a token from your tiny.garden account, then:

```bash
tg auth login --token tg_pat_...
```

Verify:

```bash
tg auth whoami
```

## Common commands

Create a site:

```bash
tg new --wait
```

Search sites:

```bash
tg search notes --scope all
```

Edit site CSS:

```bash
tg site css edit my-subdomain
```

Set theme values directly:

```bash
tg site theme set my-subdomain --bg "#101010" --text "#f5f5f5" --accent "#78ffd6"
```

Refresh and wait:

```bash
tg site refresh my-subdomain --wait
```

Backup hosted HTML:

```bash
tg site backup my-subdomain --out ~/Sites/my-site --mode html
```

Mirror HTML and assets:

```bash
tg site backup my-subdomain --out ~/Sites/my-site --mode mirror
```

## Release notes

- Package is configured for public publishing (`access: public`).
- `prepublishOnly` compiles TypeScript before publish.
- Published files are restricted via the `files` allowlist and `.npmignore`.
