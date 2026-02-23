export const parseResults = (doc: Document): string => {
  const links = Array.from(doc.querySelectorAll('.result__a'))
  const snippets = doc.querySelectorAll('.result__snippet')

  const lines = links.flatMap((link, i) => {
    const title = link.textContent
    if (!title) {
      return []
    }

    const href = link.getAttribute('href')
    const snippet = snippets[i]
    const text = snippet ? snippet.textContent : null

    return [
      title.trim(),
      ...(href ? [href.trim()] : []),
      ...(text ? [text.trim()] : []),
      '',
    ]
  })

  return lines.join('\n').trim()
}
