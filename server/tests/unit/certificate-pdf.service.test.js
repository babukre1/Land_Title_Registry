import { describe, expect, it } from "vitest";
import { generateCertificatePdf } from "../../src/services/certificate-pdf.service.js";

const snapshot = {
  parcelNumber: "MGQ-HDN-000123", region: "Banaadir", district: "Hodan", areaName: "Taleex", landUse: "RESIDENTIAL", areaM2: "500.00",
  geometry: { type: "Polygon", coordinates: [[[45.31, 2.04], [45.32, 2.04], [45.32, 2.05], [45.31, 2.05], [45.31, 2.04]]] },
  owners: [{ name: "Aamina Xasan", ownerType: "PERSON", sharePercent: "100.00" }], encumbrances: [], issuedAt: "2026-11-08T10:00:00.000Z", issuedBy: "Registrar Test",
};

describe("certificate PDF rendering", () => {
  for (const language of ["en", "so"]) {
    it(`renders a valid ${language} PDF with the stored boundary`, async () => {
      const pdf = await generateCertificatePdf({ certificateNumber: "LTC-MGQ-HDN-000123-001", verificationToken: "token", status: "CURRENT", snapshot, language, verificationUrl: "http://localhost:5173/verify/test-token" });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(3000);
    });
  }
});
