# Demo guide

Use the demo accounts listed in the root README and the configured `DEMO_PASSWORD`. Never place the password in screenshots, source files, or this guide. Start with a freshly seeded demo database when a repeatable starting state is required.

## Readiness at a glance

| Scenario | Readiness | Important note |
|---|---|---|
| Register and verify a parcel | Ready | Uses clerk, surveyor, and registrar role separation |
| Detect overlap | Ready | Creates conflict evidence/dispute, not an active parcel |
| Transfer ownership | Ready | Includes buyer-only idempotent mock payment and receipt |
| Court hold | Ready | Registrar add/lift workflow requires signed lifting evidence |
| Certificate and QR verification | Ready | Supports protected bilingual downloads and public verification |

## Demo 1 — Register and verify a parcel

1. Sign in as the clerk and create or select an owner.
2. Open **Register parcel**, select a district, and draw a non-overlapping polygon with four or more corners.
3. Save it. Confirm that the parcel receives an official district sequence number and enters `PENDING_SURVEY`.
4. Sign in as the surveyor, open the task, upload a valid PDF/JPEG/PNG report, adjust the boundary if needed, and verify it.
5. Sign in as the registrar and approve the verified registration.
6. Open the parcel detail.

Expected: the parcel is `REGISTERED`, its authoritative PostGIS area is displayed, and the timeline contains one immutable initial `REGISTRATION` ownership event.

## Demo 2 — Detect overlap

1. Sign in as the clerk and begin another parcel registration.
2. Draw a polygon that overlaps an active parcel by more than 1 m².
3. Preview and submit it.

Expected: registration is blocked, the proposed/conflicting geometry is shown, rejected-candidate evidence and a dispute are stored, and no conflicting active parcel is created. A shared boundary with zero-area intersection is allowed.

## Demo 3 — Transfer ownership

1. Sign in as the current owner and initiate a whole-parcel `SALE` to the seeded buyer.
2. Complete every current joint-owner consent using each linked account.
3. Sign in as the buyer, accept, and upload the supporting transfer document.
4. Sign in as the clerk and approve document completeness.
5. As the buyer, use **Mock mobile-money payment**, enter a payer number and confirmation reference, and retain the displayed receipt.
6. Sign in as the registrar and approve.

Expected: current ownership is replaced atomically, one `SALE` history event is appended, the old certificate becomes `SUPERSEDED`, and a replacement certificate becomes `CURRENT`. If PDF/R2 generation fails, the legal transfer remains committed and certificate issuance remains visibly recoverable.

## Demo 4 — Court hold

1. Sign in as the registrar, open a registered parcel, and add a `COURT_HOLD` with a court-case number and description.
2. Sign in as its owner and attempt a transfer.
3. Return as registrar, enter a lifting reason, attach signed PDF/JPEG/PNG evidence, and lift the hold.
4. Return as owner and initiate the transfer again.

Expected: the active hold blocks the first attempt. The lifted record remains in history with protected evidence, and a second attempt is allowed only when no other active restriction or unresolved dispute exists.

## Demo 5 — Certificate and QR verification

1. Sign in as the registrar, open a registered parcel, and issue its certificate.
2. Sign in as a current owner and download both English and Somali PDFs.
3. Confirm the PDF includes the certificate/parcel numbers, owner shares, proportional parcel boundary, QR code, issue data, and demo notice.
4. Open **Verify certificate** without signing in. Scan/open the QR URL or enter the parcel and certificate numbers manually.
5. Repeat with a superseded certificate and with unknown values.

Expected: results visibly distinguish `CURRENT`, `SUPERSEDED`, and `INVALID`. Public data excludes identity numbers, phone numbers, private documents, and raw storage paths.

## Final presentation checks

- Use a private/incognito window to prove verification needs no login.
- Keep browser zoom and map framing readable.
- Show the ownership timeline before and after a transfer.
- Explain that PostGIS and database constraints remain authoritative; the client map is only an input/visualization layer.
- State clearly that mobile-money and SMS are simulated adapters, not live providers.
- Do not claim every workflow screen is translated; full-screen bilingual coverage remains incomplete.
