/** Certificate handlers issue/list/show metadata and stream authorized English/Somali PDFs. */
import { downloadCertificate, getCertificate, issueTitleCertificate, listCertificates, listParcelCertificates } from "../services/certificate.service.js";

export async function issue(request, response) { response.status(201).json({ success: true, data: await issueTitleCertificate(request.validated.params.id, request.user) }); }
export async function listForParcel(request, response) { response.json({ success: true, data: await listParcelCertificates(request.validated.params.id, request.user) }); }
export async function index(request, response) { response.json({ success: true, data: await listCertificates(request.user) }); }
export async function show(request, response) { response.json({ success: true, data: await getCertificate(request.validated.params.id, request.user) }); }
export async function download(request, response) {
  const pdf = await downloadCertificate(request.validated.params.id, request.user, request.validated.query.lang);
  response.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdf.filename}"`, "Content-Length": pdf.buffer.length });
  response.send(pdf.buffer);
}
