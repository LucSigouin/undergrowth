# Deploying Undergrowth

The game is a folder of static files. There is no server, no database, no login. Cloudflare Pages
takes the built `dist/` folder and serves it on a URL. That is the whole deployment.

Nothing here has been deployed yet. The Pages project does not exist yet either. The steps below
are written for the first time you do it.

## First time, once

1. Sign in to Cloudflare from the terminal, if you have not already:

   ```sh
   npx wrangler login
   ```

   That opens a browser tab and saves a login on this machine. You only do it once. If you would
   rather not use the browser login, put a `CLOUDFLARE_API_TOKEN` line in
   `/Users/ls/Claude-Workspace/personal/.env` instead. The account id is already in that file as
   `CLOUDFLARE_ACCOUNT_ID`, and the deploy script reads both from there.

2. Create the Pages project. This reserves the name and the free `undergrowth.pages.dev` URL. It
   uploads nothing:

   ```sh
   npx wrangler pages project create undergrowth --production-branch main
   ```

3. Check it is there:

   ```sh
   npx wrangler pages project list
   ```

## Every deploy after that

```sh
./deploy/deploy.sh
```

That one command runs the unit tests, replays the behaviour freeze, refuses to continue if `src/`
has uncommitted changes, builds `dist/`, runs the ship gate, and only then uploads. Any failure
stops it before anything reaches Cloudflare. Nothing in `package.json` runs it, so a stray
`npm` command cannot deploy by accident.

## Verify the deploy

Do not trust the "success" line. Compare what the URL serves against what you built. The built
`index.html` names its own JavaScript and CSS files, and those names change every build, so
matching them is a real check.

```sh
# the file you built
shasum -a 256 dist/index.html

# the file Cloudflare is serving
curl -s https://undergrowth.pages.dev/ | shasum -a 256
```

The two hashes must match. If they do not, the upload did not land, or a cached copy is still
being served. Wait a few seconds and try again before assuming something is broken.

Then check the asset the page actually loads, since a matching index.html with a missing script is
still a blank screen:

```sh
asset=$(grep -o '/assets/[^"]*\.js' dist/index.html | head -1)
shasum -a 256 "dist$asset"
curl -s "https://undergrowth.pages.dev$asset" | shasum -a 256
```

Last, open the URL and play one wave. WebGL has to work in the visitor's browser, and no command
line check can tell you that.

## A custom domain, later

Skip this until the `pages.dev` URL has been played and is good. When you want a real domain, add
it in the Cloudflare dashboard under the Pages project, in Custom domains. The DNS record is
created for you if the zone is already on this Cloudflare account. Nothing in this repo needs to
change for it.

## What the deploy script will not do

- It will not create the Pages project. That is the one manual step above.
- It will not deploy a dirty `src/`.
- It will not deploy with failing tests or a red ship gate.
- It will not print or copy any credential.
