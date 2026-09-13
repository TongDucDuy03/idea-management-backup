export function reportFileName(fullName: string | undefined, ideaCode: string | undefined): string {
  const safe = (value: string) => value.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, '_');
  const name = safe(fullName || '') || 'Bao_Cao';
  const code = safe(ideaCode || '') || 'bao_cao';
  return `${name}_${code}.pdf`;
}
