import { formatDate } from './format.ts'
import { normalizeBlurb } from './normalize-blurb.ts'
import type { BskyPost } from './providers/bsky-search.ts'
import type { MdnDocument } from './providers/mdn-search.ts'
import type { StandardDocument } from './providers/standard-search.ts'
import type { WikiPage } from './providers/wiki-search.ts'

export const renderDdgText = (text: string): string => text

export const renderBskyPost = (post: BskyPost, index: number): string => (
  `${index + 1}. @${post.author.handle} (${formatDate(post.record.createdAt, true)})
   ${normalizeBlurb(post.record.text)}
   Likes: ${post.likeCount}  Reposts: ${post.repostCount}  Replies: ${post.replyCount}`
)

export const renderStandardDoc = (doc: StandardDocument, index: number): string => {
  const title = doc.date
    ? `${index + 1}. ${doc.title} (${formatDate(doc.date)})`
    : `${index + 1}. ${doc.title}`
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
