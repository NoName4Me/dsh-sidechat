import type { HistoryBlock, HistoryReader, SideChatHistory, HistoryItem } from './rpc.ts'
import type { SideChat } from '../domain/types.ts'
import type { ObservedSession, ObservedEvent } from './dsh-session-adapter.ts'
import { SideChatError } from '../domain/errors.ts'

const HISTORY_TEXT_LIMIT = 16_000
const HISTORY_REASONING_LIMIT = 8_000

export interface HistoryRuntime {
  observe(sessionId: string): Promise<ObservedSession>
  isRunning(sessionId: string): boolean
}

function messageOf(event: ObservedEvent): {
  id: string
  content: readonly unknown[]
  source?: { kind?: string }
} | undefined {
  const value = event.data
  if (!value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>
  const record = event.type === 'user/message' ? data : data.message
  if (!record || typeof record !== 'object') return undefined
  const message = record as Record<string, unknown>
  if (typeof message.id !== 'string' || !Array.isArray(message.content)) return undefined
  return {
    id: message.id,
    content: message.content,
    ...(message.source && typeof message.source === 'object'
      ? { source: message.source as { kind?: string } } : {}),
  }
}

function extractBlocks(content: readonly unknown[]): HistoryBlock[] {
  const blocks: HistoryBlock[] = []
  let remainingText = HISTORY_TEXT_LIMIT
  let remainingReasoning = HISTORY_REASONING_LIMIT
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const value = block as { type?: unknown; text?: unknown }
    if (typeof value.text !== 'string' || value.text.length === 0) continue
    if (value.type !== 'text' && value.type !== 'reasoning') continue
    const remaining = value.type === 'text' ? remainingText : remainingReasoning
    if (remaining <= 0) continue
    const text = value.text.slice(0, remaining)
    blocks.push({ kind: value.type, text })
    if (value.type === 'text') remainingText -= text.length
    else remainingReasoning -= text.length
  }
  return blocks
}

function extractText(blocks: readonly HistoryBlock[]): string {
  return blocks.filter(block => block.kind === 'text')
    .map(block => block.text)
    .join('\n')
}

export class DshHistoryReader implements HistoryReader {
  private readonly runtime: HistoryRuntime

  constructor(runtime: HistoryRuntime) {
    this.runtime = runtime
  }

  async read(note: SideChat): Promise<SideChatHistory> {
    if (!note.childSessionId) {
      throw new SideChatError('INVALID_STATE', 'note has no child Session')
    }
    const session = await this.runtime.observe(note.childSessionId)
    try {
      const items: HistoryItem[] = []
      for (const event of session.events) {
        // Forks inherit the main transcript for model context, not for
        // duplication in the visible SideChat conversation.
        if (event.seq < (session.inheritedEventCount ?? 0)) continue
        if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
        const message = messageOf(event)
        if (!message) continue
        if (event.type === 'user/message' && message.source?.kind !== 'user') continue
        const blocks = extractBlocks(message.content)
        const text = extractText(blocks)
        if (blocks.length === 0) continue
        items.push({
          messageId: message.id,
          role: event.type === 'user/message' ? 'user' : 'assistant',
          text,
          blocks,
          seq: event.seq,
          ...(typeof event.time === 'number' ? { time: event.time } : {}),
        })
      }
      return {
        childSessionId: note.childSessionId,
        items: items.slice(-50),
        busy: this.runtime.isRunning(note.childSessionId),
      }
    } finally {
      session.release()
    }
  }
}
