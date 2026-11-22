// `&amp;` decodes after the other names, so an escaped `&amp;lt;` stays `&lt;` instead of decoding twice.
const decodeEntities = (text: string): string => {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

export const normalizeBlurb = (text: string): string => {
  const stripped = text.replace(/<[^>]*>/g, ' ')
  const decoded = decodeEntities(stripped)
  return decoded.replace(/[\s\n\r\t]+/g, ' ').trim()
}
