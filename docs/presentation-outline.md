# Final presentation outline

1. The problem: paper title records, fraud risk, and fragmented spatial evidence.
2. The solution: a role-separated digital registry backed by PostgreSQL and PostGIS.
3. Architecture: React, Express, services/repositories, Prisma, PostGIS, and private R2.
4. Security boundary: HttpOnly JWT, CSRF, validation, explicit server-side roles, and audit.
5. Demo roles: owner, clerk, surveyor, registrar, and administrator.
6. Register a parcel: draw at least four corners or enter ordered coordinates.
7. Show authoritative area and the protected-status overlap rule.
8. Demonstrate overlap rejection and preserved dispute geometry.
9. Upload private survey evidence and verify the field boundary.
10. Approve registration and show immutable `REGISTRATION` history.
11. Issue/download English and Somali title certificates.
12. Verify a certificate publicly by QR and manual number without leaking private data.
13. Initiate a sale and demonstrate all joint-owner consents.
14. Show buyer acceptance, clerk review, configured fee, mock payment, and receipt.
15. Approve the sale and compare ownership history/certificate lifecycle before and after.
16. Add a court hold, prove the transfer is blocked, then lift it with signed evidence.
17. Open and resolve a dispute; explain why legal boundary correction still requires surveyor and registrar gates.
18. Show role-specific dashboards, recent activity, search, and status-aware map legend.
19. Close with integrity controls, test results, explicit simulations/limitations, and next production steps.
