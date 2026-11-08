import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const labels = {
  en: {
    title: "LAND TITLE CERTIFICATE", subtitle: "Shahaadada Lahaanshaha Dhulka", registry: "Land Title Registry — Somalia (Demonstration)",
    certificate: "Certificate number", parcel: "Parcel ID", region: "Region", district: "District", areaName: "Area name", landUse: "Land use", area: "Area", issued: "Issue date",
    ownership: "Ownership information", owner: "Owner", type: "Type", share: "Share", boundary: "Verified parcel boundary", encumbrances: "Active encumbrances",
    none: "No active encumbrances recorded.", registrar: "Issuing registrar", verify: "Scan the QR code or visit the public verification page to check current status.",
    notice: "Demonstration registry certificate. Always verify its current status online.",
  },
  so: {
    title: "SHAHAADADA LAHAANSHAHA DHULKA", subtitle: "LAND TITLE CERTIFICATE", registry: "Diiwaanka Dhulka — Soomaaliya (Tijaabo)",
    certificate: "Lambarka shahaadada", parcel: "Aqoonsiga dhulka", region: "Gobolka", district: "Degmada", areaName: "Aagga", landUse: "Isticmaalka", area: "Baaxadda", issued: "Taariikhda bixinta",
    ownership: "Macluumaadka lahaanshaha", owner: "Milkiile", type: "Nooca", share: "Saamiga", boundary: "Xadka dhulka la xaqiijiyey", encumbrances: "Xayiraadaha firfircoon",
    none: "Ma jiro xayiraad firfircoon oo diiwaangashan.", registrar: "Diiwaan-hayaha bixiyey", verify: "Sawir QR-ka ama booqo bogga xaqiijinta si aad u hubiso xaaladda hadda.",
    notice: "Shahaadadan waa tijaabo. Had iyo jeer xaaladdeeda hadda ka xaqiiji internetka.",
  },
};

function collectPdf(document) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
}

function field(doc, label, value, x, y, width = 240) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text(label.toUpperCase(), x, y, { width });
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(String(value ?? "—"), x, y + 11, { width });
}

function drawPageFrame(doc) {
  doc.rect(0, 0, 595.28, 841.89).fill("#f8fafc");
  doc.roundedRect(24, 24, 547, 794, 12).fillAndStroke("#ffffff", "#1e3a8a");
}

function drawBoundary(doc, geometry, x, y, width, height) {
  const ring = geometry?.coordinates?.[0] || [];
  if (ring.length < 4) throw new Error("Certificate boundary geometry is unavailable");
  const longitudes = ring.map(([longitude]) => longitude);
  const latitudes = ring.map(([, latitude]) => latitude);
  const minX = Math.min(...longitudes); const maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes); const maxY = Math.max(...latitudes);
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1;
  const padding = 16; const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
  const renderedWidth = rangeX * scale; const renderedHeight = rangeY * scale;
  const offsetX = x + (width - renderedWidth) / 2; const offsetY = y + (height - renderedHeight) / 2;
  doc.roundedRect(x, y, width, height, 6).fillAndStroke("#f8fafc", "#cbd5e1");
  ring.forEach(([longitude, latitude], index) => {
    const pointX = offsetX + (longitude - minX) * scale;
    const pointY = offsetY + renderedHeight - (latitude - minY) * scale;
    if (index === 0) doc.moveTo(pointX, pointY); else doc.lineTo(pointX, pointY);
  });
  doc.closePath().fillAndStroke("#bfdbfe", "#2563eb");
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("N ↑", x + width - 34, y + 8);
}

export async function generateCertificatePdf({ certificateNumber, status, snapshot, language = "en", verificationUrl }) {
  const text = labels[language] || labels.en;
  const qr = await QRCode.toBuffer(verificationUrl, { type: "png", width: 120, margin: 1, errorCorrectionLevel: "M" });
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: certificateNumber, Author: "Land Title Registry — Somalia Demonstration" } });
  const output = collectPdf(doc);
  drawPageFrame(doc);
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#172554").text(text.title, 42, 45, { align: "center" });
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#047857").text(text.subtitle, { align: "center" });
  doc.font("Helvetica").fontSize(9).fillColor("#475569").text(text.registry, { align: "center" });
  doc.moveTo(42, 104).lineTo(553, 104).stroke("#cbd5e1");

  field(doc, text.certificate, certificateNumber, 48, 120);
  field(doc, text.parcel, snapshot.parcelNumber, 310, 120);
  field(doc, text.region, snapshot.region, 48, 158);
  field(doc, text.district, snapshot.district, 310, 158);
  field(doc, text.areaName, snapshot.areaName, 48, 196);
  field(doc, text.landUse, snapshot.landUse, 310, 196);
  field(doc, text.area, `${Number(snapshot.areaM2).toLocaleString()} m²`, 48, 234);
  field(doc, text.issued, new Date(snapshot.issuedAt).toISOString().slice(0, 10), 310, 234);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#172554").text(text.ownership, 48, 278);
  let ownerY = 299;
  snapshot.owners.forEach((owner) => {
    doc.font("Helvetica").fontSize(9).fillColor("#0f172a").text(owner.name, 52, ownerY, { width: 260 });
    doc.text(owner.ownerType, 320, ownerY, { width: 90 });
    doc.font("Helvetica-Bold").text(`${owner.sharePercent}%`, 455, ownerY, { width: 75, align: "right" });
    ownerY += 17;
  });

  let mapTop = Math.max(350, ownerY + 10);
  if (mapTop > 400) {
    doc.addPage();
    drawPageFrame(doc);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#172554").text(`${certificateNumber} · ${snapshot.parcelNumber}`, 48, 46, { align: "center", width: 499 });
    mapTop = 82;
  }
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#172554").text(text.boundary, 48, mapTop);
  drawBoundary(doc, snapshot.geometry, 48, mapTop + 20, 499, 145);

  const encumbranceTop = mapTop + 178;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#172554").text(text.encumbrances, 48, encumbranceTop);
  const encumbranceText = snapshot.encumbrances.length ? snapshot.encumbrances.map((item) => `${item.type}: ${item.reference || "Recorded restriction"}`).join("\n") : text.none;
  doc.font("Helvetica").fontSize(9).fillColor("#334155").text(encumbranceText, 48, encumbranceTop + 18, { width: 340, height: 50 });
  doc.image(qr, 445, encumbranceTop - 2, { width: 90 });

  const footerTop = 718;
  doc.moveTo(42, footerTop).lineTo(553, footerTop).stroke("#cbd5e1");
  field(doc, text.registrar, snapshot.issuedBy, 48, footerTop + 12, 250);
  doc.font("Helvetica").fontSize(8).fillColor("#475569").text(text.verify, 48, footerTop + 48, { width: 350 });
  doc.font("Helvetica-Bold").fontSize(7).fillColor(status === "CURRENT" ? "#047857" : "#b45309").text(`${status} · ${text.notice}`, 48, footerTop + 73, { width: 480, align: "center" });
  doc.end();
  const buffer = await output;
  if (buffer.length < 1000 || buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Certificate PDF generation failed validation");
  return buffer;
}
