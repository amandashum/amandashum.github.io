# Amanda Shum — AI Engineer portfolio

A DOS-inspired personal portfolio built with static HTML, CSS, and native JavaScript modules. No website dependencies, package installation, bundler, or live AI service are required. Content remains readable without JavaScript.

## Local setup

From the repository root:

```sh
node tools/build-portfolio.mjs
python -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173`. Python 3 serves the files; Node.js is needed only when regenerating HTML after content edits. An existing static development server also works. Use HTTP rather than opening `index.html` directly because browser modules need a server.

## Editing content

Edit `portfolio-content.mjs`, then run `node tools/build-portfolio.mjs`. The generator creates the checked-in `index.html`, including all portfolio sections. Avoid editing generated HTML directly. Reusable section renderers are in `tools/build-portfolio.mjs`.

- Biography, positioning, projects, experience, education, skills, and certification are in the content module.
- `links.github`, `links.site`, certification verification, and project case study/GitHub/demo URLs are unset until a real public URL is supplied.
- Configured external project/profile links must use HTTPS. Empty links are omitted.
- `links.site` enables canonical and Open Graph URL metadata. Page title, description, and summary-card metadata already exist. No fabricated preview-image URL is used.
- `styles.css` contains shared tokens, component styles, and responsive rules. It uses local monospace font fallbacks.
- `portfolio.js` owns navigation, form handling, and optional terminal commands. `terminal-animation.js` owns the automatic IBM-inspired typing/loading/ready/prompt loop. `impact-animation.js` alternates the highlight sets every seven seconds with a restrained flip. Startup copy is in `boot`; highlight content is in `impact` and `academicImpact`. Reduced motion shows the completed boot text and all six highlights statically; the footer includes a shared pause control. There is no replay button.

The original three project cards retain their existing format. Fruit classification/ripeness detection, pothole detection, and Gridworld coverage use the same renderer and grid. Set `collapsible: true` on a project to place its detailed story, tags, and note in a native disclosure, as used for the academic projects. Fruit accuracy is specific to classification; MiDaS supplies relative depth, not physical pothole depth; Gridworld reports area-coverage success. No unverified accuracy or public source/demo link is added.

The supplied brief and current resume provide the impact figures. Internal work uses an honest public summary with no fake demo or source buttons. The current brief supersedes earlier documented visual directions and the older treatment of the Copilot metric as aspirational.

## Resume replacement

The supplied `Amanda Shum Resume.pdf` was copied to `Amanda_Shum_Resume.pdf`, the existing public download path. It includes the phone number and other contact details in the source. Replace this file with your preferred public version and rerun the build. The generator hides resume links when the configured file is missing.

The supplied certification PDF is not copied into public assets. Only its credential name and dates appear in the website; certification identifiers are omitted.

## Contact configuration

With `contact.endpoint: null`, the form validates name/email/message and prepares an **Open email draft** link. It does not send messages or claim success. Visitors can also use the direct email and LinkedIn links. No drafts are stored in cookies or browser storage.

To enable actual submission, configure an approved HTTPS server or form service adapter in `portfolio-content.mjs`, then rebuild. The endpoint must accept:

```http
POST /your-contact-endpoint
Content-Type: application/json
Accept: application/json
```

```json
{"name":"Visitor name","email":"visitor@example.com","message":"A message of at least 10 characters."}
```

After receiving the message successfully, return a 2xx status with JSON:

```json
{"success":true}
```

Other statuses, network failure, a 15-second timeout, malformed JSON, or missing/false `success` produce an error and preserve the visitor’s text. During submission the button is disabled and the form announces a busy state. The success message confirms receipt by the service, not delivery to an inbox.

For a cross-origin endpoint, configure CORS for the deployed portfolio origin, `POST`, and `Content-Type`. Keep service secrets on the server. Server validation, abuse controls, storage/retention, and delivery are the endpoint owner’s responsibility. Most hosted form services need an adapter to match this JSON contract. No endpoint, external account, or delivery integration has been provisioned by this implementation.

## Build and hosting

`node tools/build-portfolio.mjs` is the build command. Commit the generated `index.html` together with its source changes when approved. A static host such as GitHub Pages can serve the repository root without a Node runtime or new deployment workflow. The active runtime files are:

- `index.html`, `styles.css`, `portfolio.js`, `terminal-animation.js`, `impact-animation.js`, `portfolio-content.mjs`
- `assets/favicon.svg`, and the configured public resume

GitHub Pages cannot run a contact server, so retain the email fallback or configure a separately hosted endpoint. Publishing, Git commits, and service provisioning are separate steps. No changes have been committed or published automatically.

## Verification

Syntax checks:

```sh
node --check portfolio-content.mjs
node --check tools/build-portfolio.mjs
node --check portfolio.js
node --check terminal-animation.js
node --check impact-animation.js
node tools/build-portfolio.mjs
```

`tools/verify-dos-portfolio.js` is a Playwright CLI `run-code` acceptance script for a preview running at `http://127.0.0.1:4173`. With an available Playwright CLI:

```powershell
npx --yes --package @playwright/cli playwright-cli -s=dos-portfolio open http://127.0.0.1:4173
npx --yes --package @playwright/cli playwright-cli -s=dos-portfolio run-code --filename tools/verify-dos-portfolio.js
```

Browser tooling is optional and is not a site dependency. The acceptance script checks widths 320/390/768/1024/1440, overflow, keyboard/mobile navigation and disclosures, anchors, commands, automatic typing/spinner/prompt looping, highlight rotation in both directions, offscreen/user pause, reduced motion, email-draft validation, mocked endpoint states, and JavaScript-disabled content. Mock submissions never contact a real external service. Screenshots and a verification report are saved in ignored `output/playwright/`.

Also review desktop/mobile screenshots and use a screen reader when preparing a release. Automated interaction checks are not a full assistive-technology audit. A real configured contact service needs its own integration test before claiming live delivery.

## Retained assets and rollback

The earlier pothole demo, skill icons, and perception scene are retained but are not loaded by the active page. Their older browser tests target the previous scene rather than this design. Preserve `assets/perception/EVIDENCE.md` when reusing those assets. Review sample-image publication provenance before bringing that demo back into the public UI.

The pre-redesign versions of changed existing files were saved locally in ignored `output/dos-backup/`, including the existing uncommitted edits. These backups are local handover aids, not published website assets.
