/**
 * Génération de documents PDF minimalistes (quittances de loyer).
 * PDF 1.4 une page, police Helvetica, sans dépendance externe.
 */

/** Retire les accents : la police de base PDF ne les encodant pas fiablement. */
function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapePdfText(value: string): string {
  return stripAccents(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(title: string, lines: string[]): Buffer {
  const textCommands = [
    `BT /F1 18 Tf 60 780 Td (${escapePdfText(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 12 Tf 60 ${740 - i * 22} Td (${escapePdfText(line)}) Tj ET`),
  ].join('\n');
  const stream = textCommands + '\n';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
