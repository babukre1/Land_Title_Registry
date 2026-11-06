# Land registration flow

## Accepted proposal

1. A clerk selects a district, owners and exact shares, then draws a single polygon or enters ordered longitude/latitude corners.
2. Preview validates references, polygon validity, authoritative PostGIS area, unusual-area warnings, and overlap without writing legal state.
3. Submit carries a stable browser-generated idempotency key.
4. A transaction takes the registry advisory lock and repeats every authoritative check.
5. If no protected parcel overlaps by more than 1 m², the district counter is incremented atomically and a number such as `MGQ-HDN-000123` is assigned.
6. The parcel is saved as `PENDING_SURVEY`, ownership shares are attached, an unassigned `PENDING` survey is created, and the action is audited.

## Blocked proposal

1. The same locked transaction finds every protected parcel whose intersection area exceeds 1 m².
2. It does not create an active parcel or change any existing parcel.
3. It stores the proposed geometry, calculated area, land use, owners, shares, and idempotency key as a blocked parcel candidate.
4. It creates an `OPEN` dispute, links all conflicting parcels and proposed parties, stores each overlap area, and writes an audit record.
5. The API returns structured `409 PARCEL_OVERLAP` evidence. The UI shows the proposal in blue and conflicts in red and links to the dispute record.

Shared edges and shared corners have zero intersection area and are allowed. Overlap of 1 m² or less is also allowed; only overlap strictly greater than 1 m² blocks registration. Retrying the same idempotency key returns the original outcome.

## Survey and correction

A surveyor opens the preserved survey attempt and uploads a private PDF/JPEG/PNG field report. Verification either keeps the boundary or validates, measures, and overlap-checks an adjustment. Success stores the exact verified geometry and moves both survey and parcel to `VERIFIED`. A conflicting adjustment creates candidate/dispute evidence and leaves the parcel unverified. Cannot Verify preserves the reason and returns the parcel; a clerk correction is fully revalidated and creates a new attempt without deleting the old one.

## Registrar approval

The registrar queue contains only verified parcels with reports. Approval uses the registry lock and a parcel row lock, verifies that the current and surveyed boundaries are equal, rechecks validity, overlap, open disputes and exact 100% ownership, then atomically registers the parcel, records registrar/time, appends the initial ownership snapshot, and audits the event. A partial unique database index and the service's idempotent response prevent duplicate initial history.

Title certificate issuance, transfers, payments, encumbrances, dispute resolution, and approved post-registration boundary correction remain future work.
