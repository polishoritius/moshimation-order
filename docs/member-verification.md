# MOSHIMATION ORDER — Official Member Verification Pilot

Status: **DRAFT / NOT LAUNCHED**. This branch is for preparation only; the published GitHub Pages site remains on main.

## Operational rules
- Official member count: **0** until expressly updated by the Owner.
- **000** is reserved for Police Horitius (First Caller); reserved does **not** mean issued or registered.
- Certificates are an intended X subscription benefit, not yet active. Do not publish an enrollment form or issuance button.
- No visitor can create an entry via the verification page.
- Authorized operator updates `members/registry.json` and an approved official certificate image in `assets/members/` **only after** confirming a subscription entitlement, issuing the certificate, and obtaining express consent for any public-facing name, role, and image.
- Each record: `number` (3–6 digit string), `callsign`, `rank`, `status` (`active` or `revoked`), `issuedOn` (ISO date), `version` (positive integer), `certificateImage` (approved local image path). Reserve numbers permanently, including revoked numbers; never reuse.
- Publish a new registry revision when status changes. Store no private identifying information or X account IDs in public GitHub.
- If public portrait/name consent has not been obtained, **do not issue a public lookup entry** until an appropriate private verification system is ready.

## Security boundaries
- The registry is **public**. Anyone can inspect it, copy a QR code or reuse a certificate image.
- A lookup confirms only that the displayed record exists and has the published status. It does **not** authenticate the presenter or prevent copying.
- Do not put passwords, private keys or secret verification tokens in GitHub Pages.
- For entitlement-gated entry or stronger assurance, later use server-side authenticated membership checks and optionally digitally signed certificates (private signing key stored outside public hosting).

## Release gate
1. Confirm zero-member and unknown-number behavior.
2. Test a synthetic active entry and a synthetic revoked entry **locally or in a test branch only**, then remove them.
3. Check on iPhone and desktop, including a registry network outage.
4. Confirm official emblem unchanged.
5. Confirm the public announcement and website release only with Owner approval.

## File map
- `verify.html`: public read-only lookup UI, designed for a future deployment.
- `members/registry.json`: only authorized issuer edits this file; initially contains no member records.
