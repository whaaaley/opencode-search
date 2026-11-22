import { formatDate, formatDateTime } from './format.ts'
import { normalizeBlurb } from './normalize-blurb.ts'
import type { BskyPost } from './providers/bsky-search.ts'
import type { GnewsResult } from './providers/gnews-search.ts'
import type { MdnDocument } from './providers/mdn-search.ts'
import type { RfcResult } from './providers/rfc-search.ts'
import type { StandardDocument } from './providers/standard-search.ts'
import type { W3cResult } from './providers/w3c-search.ts'
import type { WhatwgResult } from './providers/whatwg-search.ts'
import type { WikiPage } from './providers/wiki-search.ts'
import type { WebResult } from './web-result.ts'

export const renderWebResult = (result: WebResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.url}
   ${normalizeBlurb(result.abstract)}`
}

export const renderGnewsItem = (result: GnewsResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.source}${result.date ? ' — ' + formatDate(result.date) : ''}
   ${result.url}`
}

export const renderBskyPost = (post: BskyPost, index: number): string =>
  `${index + 1}. @${post.author.handle} (${formatDateTime(post.record.createdAt)})
   ${normalizeBlurb(post.record.text)}
   Likes: ${post.likeCount}  Reposts: ${post.repostCount}  Replies: ${post.replyCount}`

export const renderStandardDoc = (doc: StandardDocument, index: number): string => {
  const title = doc.date ? `${index + 1}. ${doc.title} (${formatDate(doc.date)})` : `${index + 1}. ${doc.title}`
  return `${title}
   ${doc.url}
   ${normalizeBlurb(doc.snippet)}`
}

export const renderWikiPage = (page: WikiPage, index: number): string => {
  const desc = page.description ? `\n   ${normalizeBlurb(page.description)}` : ''
  return `${index + 1}. ${page.title}
   https://en.wikipedia.org/wiki/${page.key}${desc}
   ${normalizeBlurb(page.excerpt)}`
}

export const renderMdnDoc = (doc: MdnDocument, index: number): string => {
  return `${index + 1}. ${doc.title}
   https://developer.mozilla.org${doc.mdn_url}
   ${normalizeBlurb(doc.summary)}`
}

export const renderRfc = (result: RfcResult, index: number): string => {
  return `${index + 1}. ${result.id} — ${result.title}
   ${result.url}
   ${normalizeBlurb(result.abstract)}`
}

export const renderW3c = (result: W3cResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.url}`
}

export const renderWhatwg = (result: WhatwgResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.url}
   ${normalizeBlurb(result.abstract)}`
}
