# PRIVATE LINE — Deployment and issuance playbook (draft)

Status: **NOT DEPLOYED / NOT LIVE.** Working branch only. Do not merge or share the holder page as live until deployed.

## Backend setup (Cloudflare account required)
1. Install Node/npm and Cloudflare Wrangler CLI.
2. Authenticate with Cloudflare: `npx wrangler login`.
3. Create D1: `npx wrangler d1 create moshimation-credentials`.
4. Insert the returned database UUID in `auth/wrangler.toml`; run Wrangler with `--config auth/wrangler.toml`.
5. Create schema: `npx wrangler d1 execute moshimation-credentials --remote --file=auth/schema.sql`.
6. Generate a high-entropy `ADMIN_TOKEN` with a secure local random generator. Add with `npx wrangler secret put ADMIN_TOKEN --config auth/wrangler.toml`. Never commit it.
7. Deploy: `npx wrangler deploy --config auth/wrangler.toml` (test under a non-public origin before production).
8. Set `window.MO_AUTH_ENDPOINT` in `auth-config.js` to the deployed HTTPS Worker origin (no trailing path) only after real testing and Owner sign-off.
9. Confirm CORS origin is the exact official Pages origin `https://polishoritius.github.io`, and deploy from a reviewed branch.

## Issue member 001 only after consent and operator confirmation
- Review candidate: SUMIRE / @yu_cotte24 / 親善広報大使.
- Confirm that the holder accepts their private credentials and any proposed publication of profile image/name.
- The current generated appointment bears a provisional key; its password must be transferred directly to the holder, not posted publicly.
- From an authenticated administrator CLI, POST an issuance request over TLS to `/api/admin/issue` with:
  `{"number":"001","callsign":"SUMIRE","rank":"親善広報大使","version":1,"password":"<copy private key securely>"}`
  and header `Authorization: Bearer <ADMIN_TOKEN>`.
- Check that response is `201`, and verify `/api/authenticate` with exact number and key in a test client.
- Store private credentials outside GitHub. Mark issued in approved private issuer ledger, **then** generate final dated appointment.
- Update public registry only with the holder's explicit publishing consent; do not use the private key in QR, HTML, logs, URLs, or public images.

## Controls and limitations
- PBKDF2-SHA256 salted hash only in D1; no plaintext password stored on server.
- 8 failures lock one credential for 15 min. An attacker can intentionally trigger a temporary lockout; a more advanced IP-aware rate limiter / Turnstile is recommended before wide exposure.
- Fixed secrets printed on private certificates are copyable; this is not robust proof of the identity of a certificate holder.
- No membership account login/session is established: `/api/authenticate` returns an answer only. Do not use client-side successful response alone to gate sensitive pages.
- Compromised or lost keys require admin revocation and issuance of a new credential under a reviewed process.
- The Worker cannot be deployed using GitHub Pages by itself. Cloudflare account/D1/secret setup is mandatory.

## Gates
- [x] Worker & SQL schema implemented in development branch.
- [x] Local mock checks for issue / verify / revoke performed (worker draft).
- [ ] Real Cloudflare deployment and D1 setup.
- [ ] Verified production origin / rate-limiting / security review.
- [ ] Private issuance record created for 001.
- [ ] Holder explicitly approves use of name/portrait and receipt method.
- [ ] iPhone, Android, desktop cross-browser tests.
- [ ] Owner approves public release.
