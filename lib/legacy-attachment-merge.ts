// Merge source-discovered attachments without erasing previously stored PDFs
// or user-uploaded documents. Discovery alone does not mean text was read.
export function mergeLegacyAttachments(previous: any[], docs: any[]) {
  const discovered = docs.map((doc: any) => {
    const old = previous.find((item: any) => String(item.fileId) === String(doc.fileId));
    return old ? { ...doc, ...old } : {
      ...doc,
      fileExtention: String(doc.fileName || '').split('.').pop()?.toLowerCase() || '',
      downloadUrl: `https://user.tender.gov.mn/mn/download/${doc.fileId}`,
      extractionStatus: 'not_extracted',
    };
  });
  const newlyDiscovered = docs.some((doc: any) => !previous.some((old: any) => String(old.fileId) === String(doc.fileId)));
  return {
    documents: [...discovered, ...previous.filter((old: any) => !docs.some((doc: any) => String(doc.fileId) === String(old.fileId)))],
    newlyDiscovered,
  };
}

export function replacePdfDocumentSections(existing: string, replacements: string[]) {
  const ids = new Set(replacements.map((section) => section.match(/^--- DOCUMENT ([^:]+):/)?.[1]).filter(Boolean));
  const prior = String(existing || '').split(/(?=---\s*DOCUMENT\s+[^:]+:)/i).filter((section) => {
    const id = section.match(/^---\s*DOCUMENT\s+([^:]+):/i)?.[1];
    return !id || !ids.has(id);
  });
  return [...replacements.filter(Boolean), ...prior.filter(Boolean)].join('\n\n').slice(0, 300000);
}
