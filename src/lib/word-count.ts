const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;

export function countWords(text: string): number {
  const cjk = (text.match(CJK_RE) ?? []).length;
  const latin = (text.replace(CJK_RE, ' ').match(/[A-Za-z0-9']+/g) ?? []).length;
  return cjk + latin;
}
