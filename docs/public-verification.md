# Public certificate verification

`/verify/:token` handles QR links and `/verify` handles manual parcel/certificate input. Neither requires login. Both API methods share one limit of ten requests per minute per IP and return HTTP 429 after the quota.

Results are:

- `CURRENT`: recognized current certificate.
- `SUPERSEDED`: genuine historic certificate replaced by another certificate.
- `INVALID`: unknown, mismatched, pending, or explicitly invalid certificate.

The response includes only certificate/parcel numbers, status, district, area, issue date, owner names/shares from the certificate snapshot, and current boolean encumbrance/dispute indicators. A superseded result may also distinguish current owners. It never returns identity numbers, contact fields, addresses, private files, tokens, or audit data.

The limiter is in memory and is suitable for this demonstration. A horizontally scaled production deployment requires a shared store such as Redis. Vercel is the known proxy topology; Express trusts one proxy hop rather than arbitrary forwarded chains.
