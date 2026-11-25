# MOSHIMATION ORDER — Cloudflare owner setup

**Deployment not yet performed.** This document lets the Owner deploy without sending ChatGPT an API token, account password or admin secret. The script does not register members and does not change the public GitHub Pages site.

## Windows setup

1. Use a trusted Windows PC with Node.js LTS installed.
2. In the development branch, download the \`auth/\` folder (the entire project ZIP is easiest) and extract it to a writable directory.
3. Open PowerShell in the extracted \`auth\` directory.
4. Run \`.\setup-cloudflare.ps1\` after reviewing its contents. If local PowerShell execution policy prevents running a trusted local file, use \`powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-cloudflare.ps1\` for this one session.
5. Sign into the Cloudflare account when Wrangler opens the browser. If D1 is not created yet, follow the script to create \`moshimation-credentials\`, then enter the returned UUID.
6. The script creates the remote SQL schema and deploys the Worker. It then sets a newly generated \`ADMIN_TOKEN\` as a Cloudflare secret and writes an encrypted backup local to your Windows account.
7. **Do not commit the modified \`wrangler.toml\` or local secret backup until reviewed.** The database UUID is not a password, but should be kept out of uncontrolled copies. Never upload the admin token file.
8. Record the Worker URL from Wrangler's deployment output, but leave \`auth-config.js\` empty until a production authentication smoke test passes.

## Required live tests before enabling

- \`GET <worker-url>/api/health\` returns a successful health response.
- An unknown credential returns generic \`AUTH_FAILED\`. Registered accounts do not yet exist.
- Admin request without \`ADMIN_TOKEN\` returns HTTP 401.
- Authorized operator creates a *synthetic* non-001 test record and verifies correct password, wrong password and revocation. Do not put secrets in chat, GitHub, screenshots, curl history or URLs.
- Delete/revoke the synthetic record, confirm it is no longer valid.
- Confirm that no other X origins get credential-bearing CORS permissions.
- Confirm the correct member No.001 key is in the owner's *private issuance package*, not public repository content.
- After direct consent from the holder, register No.001 from the owner's private system and test its exact secret.
- After passing review, set \`window.MO_AUTH_ENDPOINT\` to the deployed HTTPS origin and merge the approved release. Test iPhone, Android and desktop.

## Security notes
- A shared password image is copyable; it is **not** proof that the presenter is the real subscriber.
- The current API returns only an authentication result; it does **not** create a secure login session or protect subscriber-only content. A session layer is required before gating paid content.
- Temporary lockout by member number is vulnerable to nuisance lockouts; use a platform rate limiter and monitoring before public launch.
- If a private appointment or credentials are ever publicly shared, revoke and regenerate immediately.
