export const parseResults = (doc: Document): string => {
  const links = doc.querySelectorAll('.result__a')
  const snippets = doc.querySelectorAll('.result__snippet')
  const lines: string[] = []

  for (let i = 0; i < links.length; i++) {
    const title = links[i].textContent
    const snippet = snippets[i] ? snippets[i].textContent : ''
    const href = links[i].getAttribute('href')

    if (!title) {
      continue
    }

    lines.push(title.trim())
    if (href) lines.push(href.trim())
    if (snippet) lines.push(snippet.trim())
    lines.push('')
  }

  return lines.join('\n').trim()
}
