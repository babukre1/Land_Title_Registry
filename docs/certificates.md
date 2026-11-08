# Title certificates

Only a `REGISTRAR` can issue a certificate for a `REGISTERED` parcel with official ownership totaling exactly 100% and an approved history event.

## Issuance

1. A parcel-scoped PostgreSQL advisory lock serializes number allocation.
2. The service records a `PENDING_GENERATION` certificate and an immutable JSON snapshot.
3. PDFKit renders English and Somali PDFs in memory. The actual GeoJSON ring is scaled proportionally into a vector boundary diagram; no geographic scale is invented.
4. The QR code contains only `/verify/<opaque-token>`.
5. The English issuance artifact is stored privately in R2 after both languages render successfully.
6. A final transaction supersedes the previous `CURRENT` certificate, promotes the pending record, and writes an audit event.

If rendering or R2 fails, no new certificate becomes current and the old current certificate is not superseded. Retrying issuance reuses the pending record. Database partial unique indexes permit at most one `CURRENT` and one recoverable pending certificate per parcel.

Downloads are dynamically rendered from the immutable snapshot so a historic PDF clearly displays its current `SUPERSEDED` status. Current owners and authorized staff can download; R2 objects are never public.

## Snapshot contents

Parcel number, region/district, area name, land use, calculated area, official polygon, owners/names/types/shares, active encumbrances at issue time, issue timestamp, registrar, and ownership-event reference. Identity numbers, phone numbers, email, and authentication data are excluded.
