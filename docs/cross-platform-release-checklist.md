# Official Credential Verification — Cross-platform Release Checklist

Status: **PRE-RELEASE — NOT APPROVED**. Do not merge to main or announce before the Owner explicitly approves.

## Platform matrix (manual / real-device; not yet executed)

| Platform | Browser | Screen | Status |
|---|---|---|---|
| iPhone | Safari | portrait / landscape | NOT TESTED |
| iPhone | X in-app browser | portrait | NOT TESTED |
| Android | Chrome | portrait / landscape | NOT TESTED |
| Android | Samsung Internet | portrait | NOT TESTED |
| Android | X in-app browser | portrait | NOT TESTED |
| Windows | Chrome / Edge / Firefox | desktop / narrow resize | NOT TESTED |
| macOS | Safari / Chrome / Firefox | desktop / narrow resize | NOT TESTED |
| iPad / Android tablet | Safari / Chrome | portrait / landscape | NOT TESTED |

## Acceptance criteria — each platform above

1. Header displays the **unaltered original official emblem** and does not crop the gold laurel / antique phone.
2. No horizontal overflow at 320, 375, 390, 768, 1024, 1440 CSS px; input/button do not overlap.
3. Verify using a typed 3-digit number without needing a camera or QR scanner; keypad/focus works.
4. Query parameter link `verify.html?no=001` pre-fills number and performs lookup after registry loads.
5. Empty registry: `000` and any other number show **NO RECORD**; no official card is issued.
6. Invalid value such as `1` is rejected; never treated as valid.
7. Missing/unavailable registry: show **not verifiable**, never **not registered**; retry button recovers when connection returns.
8. Test branch **synthetic** active and revoked records return distinct messages, and use plain-text DOM APIs (no HTML injection).
9. A cloned image or QR code must not be described as identity verification; registry status only.
10. Browser accessibility: keyboard submission, focus outline, screen reader live status, reduced motion.
11. Navigation back to main official website works.
12. Phone number, private identity data, subscription ID, passwords and signing secrets are never included in public registry.

## Operational release gate

- [x] Main branch unchanged; implementation isolated in development branch.
- [x] Registry initialized with 0 members (000 reserved, not issued).
- [x] Developer-level simulated scenarios for unregistered / active / revoked / offline / invalid.
- [x] Retry and standard non-QR number entry implemented.
- [ ] Manual real-browser testing on each supported platform above.
- [ ] Approval of official member-card design, issuer rules, and portrait-use consent.
- [ ] Operator-only publication/withdrawal process demonstrated and audited.
- [ ] Owner reviews then explicitly authorizes merge and announcement.

## Release scope

A static GitHub Pages registry allows **public record checking**, not identity or entitlement authentication. Never imply a scan or lookup proves the presenter is the genuine subscriber; stronger authentication requires a backend or validated digital signatures and secure key management.
