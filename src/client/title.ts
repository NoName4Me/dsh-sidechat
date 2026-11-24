import { extractMarkdownPlainText } from '@deepseek-ai/dsh-client-ui-primitives'

const MAX_TITLE_LENGTH = 60

/** Build a compact, list-friendly title from the first question. */
export function sideChatTitle(text: string): string {
  let plain: string
  try {
    plain = extractMarkdownPlainText(text, { mode: 'first-line' })
  } catch {
    plain = text
  }
  const compact = plain.replace(/\s+/gu, ' ').trim()
  if (!compact) return '侧聊'
  const firstSentence = /^.*?[。！？!?]/u.exec(compact)?.[0]?.trim() ?? compact
  return firstSentence.length > MAX_TITLE_LENGTH
    ? firstSentence.slice(0, MAX_TITLE_LENGTH).trimEnd() + '…'
    : firstSentence
}
