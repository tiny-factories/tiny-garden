# tiny.garden CLI (`tg`)

Customer CLI for creating and managing tiny.garden sites from terminal.

## Install (from this repo)

```bash
npm --prefix cli install
npm --prefix cli run build
```

Run with:

```bash
npm --prefix cli run start -- --help
```

## Auth

Generate a token from your tiny.garden account, then:

```bash
npm --prefix cli run start -- auth login --token tg_pat_...
```

Verify:

```bash
npm --prefix cli run start -- auth whoami
```

## Common commands

Create a site:

```bash
npm --prefix cli run start -- new --wait
```

Search sites:

```bash
npm --prefix cli run start -- search notes --scope all
```

Edit site CSS:

```bash
npm --prefix cli run start -- site css edit my-subdomain
```

Set theme values directly:

```bash
npm --prefix cli run start -- site theme set my-subdomain --bg "#101010" --text "#f5f5f5" --accent "#78ffd6"
```

Refresh and wait:

```bash
npm --prefix cli run start -- site refresh my-subdomain --wait
```

Backup hosted HTML:

```bash
npm --prefix cli run start -- site backup my-subdomain --out ~/Sites/my-site --mode html
```

Mirror HTML and assets:

```bash
npm --prefix cli run start -- site backup my-subdomain --out ~/Sites/my-site --mode mirror
```
