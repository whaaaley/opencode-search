export const parseResults = (doc: Document): string => {
  const links = doc.querySelectorAll('.result__a')
  const snippets = doc.querySelectorAll('.result__snippet')
  const lines: string[] = []

  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) {
      continue
    }

    const title = link.textContent
    if (!title) {
      continue
    }

    const snippet = snippets[i]
    const href = link.getAttribute('href')

    lines.push(title.trim())

    if (href) {
      lines.push(href.trim())
    }

    if (snippet && snippet.textContent) {
      lines.push(snippet.textContent.trim())
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}
