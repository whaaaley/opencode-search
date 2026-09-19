import { formatDate, formatDateTime } from './format.ts'
import { normalizeBlurb } from './normalize-blurb.ts'
import type { BskyPost } from './providers/bsky-search.ts'
import type { DdgResult } from './providers/ddg-search.ts'
import type { GnewsResult } from './providers/gnews-search.ts'
import type { MdnDocument } from './providers/mdn-search.ts'
import type { WikiPage } from './providers/wiki-search.ts'

export const renderDdgResult = (result: DdgResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.url}
   ${normalizeBlurb(result.abstract)}`
}

// Brave and DuckDuckGo return the same title/url/abstract shape.
export const renderWebResult = renderDdgResult

export const renderGnewsItem = (result: GnewsResult, index: number): string => {
  return `${index + 1}. ${result.title}
   ${result.source}${result.date ? ' — ' + formatDate(result.date) : ''}
   ${result.url}`
}

export const renderBskyPost = (post: BskyPost, index: number): string => (
  `${index + 1}. @${post.author.handle} (${formatDateTime(post.record.createdAt)})
   ${normalizeBlurb(post.record.text)}
   Likes: ${post.likeCount}  Reposts: ${post.repostCount}  Replies: ${post.replyCount}`
)


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
