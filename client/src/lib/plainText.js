const blockClosingPattern = /<\/(p|div|li|h[1-6]|blockquote)>/gi;
const lineBreakPattern = /<br\s*\/?\s*>/gi;

const normalizeSpacing = (value) => value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const toPlainText = (value) => {
    if (value == null) return '';
    const source = String(value);
    if (!source) return '';

    const withBreaks = source
        .replace(lineBreakPattern, '\n')
        .replace(blockClosingPattern, '\n');

    if (typeof DOMParser !== 'undefined') {
        const documentValue = new DOMParser().parseFromString(withBreaks, 'text/html');
        return normalizeSpacing(documentValue.body.textContent || '');
    }

    return normalizeSpacing(withBreaks
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'"));
};
