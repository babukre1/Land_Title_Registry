# Encumbrances and court holds

Registrar users can add a `MORTGAGE` or `COURT_HOLD` to a registered parcel from its detail page. Active restrictions remain visible to authorized staff and current owners and block transfer initiation and final approval.

Lifting is a legal action, not deletion. It requires a written reason and a signed PDF/JPEG/PNG evidence file up to 10 MB. The private evidence is stored in Cloudflare R2, a `Document` metadata row is linked to the encumbrance, the original record is changed to `LIFTED`, and an audit entry captures the actor and reason. Historical lifted restrictions remain visible. Authorized evidence download streams through the API; object keys and credentials are never exposed to the client.

The service locks the encumbrance and rechecks state before lifting. Database constraints require evidence and a reason on every lifted record. Tests use the isolated in-memory object-store adapter.
