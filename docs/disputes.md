# Dispute workflow

Disputes can arise automatically from an overlap or survey conflict, or a clerk can open a manual case against one or more parcels. Open and under-review disputes block registration approval and ownership transfer.

Clerks and registrars can view parties, related parcels, candidate/conflict geometry, and the audit timeline. They can upload private PDF/JPEG/PNG evidence to Cloudflare R2 and retrieve it through role-protected API routes. A registrar starts review and records the final resolution.

If a resolution requires a boundary change, the system creates a protected boundary-correction survey and marks the parcel `DISPUTED`. The resolution never edits legal geometry directly. A surveyor must upload evidence and verify the proposed boundary; the registrar then revalidates PostGIS validity and overlap, sets the transaction-local database authorization flag, copies the verified geometry, appends an immutable `CORRECTION` history event, and triggers replacement-certificate issuance. A failed correction leaves the prior legal boundary unchanged.

Candidate outcomes are evidentiary decisions only. Marking a rejected candidate accepted does not silently create legal title; it still requires the ordinary registration checks and approvals.
