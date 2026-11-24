import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  DisclosureRow,
  IconThinkOutlineRegular,
  MarkdownText,
  type MarkdownLabels,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SideChat } from '../domain/types.ts'
import type { HistoryBlock, SideChatHistory } from '../host/rpc.ts'
import type { SideChatApi } from './api.ts'
import type { SideChatCatalog } from './catalog.ts'
import type { SideChatIntent, SideChatIntentStore } from './intent.ts'
import { SideChatIcon, SideChatIconButton } from './Icon.tsx'
import { SideChatComposer } from './SideChatComposer.tsx'
import { groupSideChatTurns, SideChatTurnNavigator } from './SideChatTurnNavigator.tsx'
import { jumpToSource } from './source-anchor.ts'
import { sideChatTitle } from './title.ts'

interface CurrentSessionSource {
  getSnapshot(): { key?: string }
  subscribe(listener: () => void): () => void
}
interface NativeSessionListSource {
  getSnapshot(): { readonly byId: Readonly<Record<string, unknown>> }
  subscribe(listener: () => void): () => void
}
interface SideChatOverlayProps {
  readonly api: SideChatApi
  readonly catalog: SideChatCatalog
  readonly bringBack: (parentSessionId: string, title: string, text: string) => boolean
  readonly intent: SideChatIntentStore
  readonly currentSession: CurrentSessionSource
  readonly sessionList: NativeSessionListSource
  readonly openNativeSession: (sessionId: string) => void
}
type View = 'directory' | 'create' | 'thread'
const QUOTE_PREVIEW_LIMIT = 72

const MARKDOWN_LABELS: MarkdownLabels = {
  code: {
    copyLabel: '复制代码',
    copiedLabel: '已复制',
    toolbarLabels: {
      codeLabel: '代码',
      wrapLabel: '自动换行',
      unwrapLabel: '取消自动换行',
    },
  },
  footnotes: '脚注',
}

function SideChatMarkdown({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={'sc-markdown' + (compact ? ' sc-markdown-compact' : '')}>
      <MarkdownText text={text} labels={MARKDOWN_LABELS}
        variant={compact ? 'compact' : 'body'} />
    </div>
  )
}

function reasoningText(text: string): string {
  if (!text.startsWith('<signature>')) return text
  const end = text.indexOf('</signature>', '<signature>'.length)
  return end === -1 ? '' : text.slice(end + '</signature>'.length).replace(/^(?:\r?\n)+/u, '')
}

function SideChatReasoning({ text, running }: { text: string; running: boolean }) {
  const [open, setOpen] = useState(false)
  const display = reasoningText(text)
  const summary = display.split(/\r?\n/u, 1)[0]?.replaceAll('**', '') ?? ''
  if (!display.trim()) return null
  return (
    <div className="sc-reasoning">
      <DisclosureRow
        icon={<IconThinkOutlineRegular size={14} />}
        title="思考"
        open={open}
        expandable
        expandOnRowClick
        running={running}
        onToggle={() => setOpen(value => !value)}
        collapsedContent={summary
          ? <span className="sc-reasoning-summary">{summary}</span>
          : undefined}>
        <div className="sc-reasoning-body">
          <SideChatMarkdown text={display} compact />
        </div>
      </DisclosureRow>
    </div>
  )
}

function QuoteMark() {
  return (
    <svg className="sc-quote-mark" width="16" height="16" viewBox="0 0 16 16"
      aria-hidden="true">
      <path d="M2 2.5h4.5V7H4.4c0 2 .9 3.1 2.8 3.5V13C4.2 12.6 2 10.2 2 6.8V2.5Zm7.5 0H14V7h-2.1c0 2 .9 3.1 2.8 3.5V13c-3-.4-5.2-2.8-5.2-6.2V2.5Z"
        fill="currentColor" />
    </svg>
  )
}

function AssistantBlocks({ blocks, running }: {
  blocks: readonly HistoryBlock[]
  running: boolean
}) {
  return (
    <div className="sc-assistant-blocks">
      {blocks.map((block, index) => block.kind === 'reasoning'
        ? <SideChatReasoning key={'reasoning:' + index} text={block.text} running={running} />
        : <SideChatMarkdown key={'text:' + index} text={block.text} />)}
    </div>
  )
}

function messageDateTime(time: number | undefined): { label: string; value: string } | undefined {
  if (time === undefined || !Number.isFinite(time)) return undefined
  const date = new Date(time)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const datePart = sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return { label: `${datePart} ${clock}`, value: date.toISOString() }
}

function statusOf(note: SideChat): string {
  if (note.status === 'archived') return '已归档'
  if (note.status === 'promoted') return '已升格'
  return note.mode === 'fork' ? '继承上下文' : '独立上下文'
}

/** Native right-Sidebar page: one screen at a time, never a second floating rail. */
export function SideChatOverlay({
  api, catalog, bringBack, intent, currentSession, sessionList, openNativeSession,
}: SideChatOverlayProps) {
  const state = useSyncExternalStore(catalog.subscribe, catalog.getSnapshot)
  const nativeSessions = useSyncExternalStore(sessionList.subscribe, sessionList.getSnapshot)
  const [sessionId, setSessionId] = useState<string | undefined>(() => currentSession.getSnapshot().key)
  const [request, setRequest] = useState<SideChatIntent | undefined>(() => intent.getSnapshot())
  const [view, setView] = useState<View>('directory')
  const [activeId, setActiveId] = useState<string | undefined>()
  const [mode, setMode] = useState<'light' | 'fork'>('light')
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<SideChatHistory | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [copied, setCopied] = useState<string | undefined>()
  const [revision, setRevision] = useState(0)
  const threadScrollerRef = useRef<HTMLDivElement>(null)
  const refresh = useCallback(() => setRevision(n => n + 1), [])

  useEffect(() => currentSession.subscribe(() => setSessionId(currentSession.getSnapshot().key)), [currentSession])
  useEffect(() => intent.subscribe(() => setRequest(intent.getSnapshot())), [intent])
  useEffect(() => {
    setActiveId(undefined)
    setHistory(undefined)
    setView('directory')
    setDraft('')
    setError(undefined)
    catalog.setSession(sessionId)
  }, [sessionId, catalog])
  useEffect(() => {
    if (!sessionId) return
    void catalog.refresh(sessionId).catch(error => setError(String(error)))
  }, [catalog, sessionId, revision])
  useEffect(() => {
    if (!request || request.sessionId !== sessionId) return
    setError(undefined); setHistory(undefined)
    if (request.existingNoteId) {
      setActiveId(request.existingNoteId)
      catalog.setActive(request.existingNoteId)
      setView('thread')
    } else {
      setActiveId(undefined)
      catalog.setActive(undefined)
      setView('create')
      setDraft('')
    }
  }, [request, sessionId, catalog])
  useEffect(() => {
    if (!sessionId || !activeId || view !== 'thread') return
    let closed = false
    let inFlight = false
    const load = async () => {
      if (inFlight || closed) return
      inFlight = true
      try {
        const latest = await api.history(sessionId, activeId)
        if (!closed) {
          setHistory(latest)
          catalog.preview(activeId, latest)
        }
      } catch (err) {
        if (!closed) setError(String(err))
      } finally { inFlight = false }
    }
    void load()
    const timer = window.setInterval(() => void load(), 1250)
    return () => { closed = true; window.clearInterval(timer) }
  }, [api, catalog, sessionId, activeId, view])

  const notes = state.sessionId === sessionId ? state.notes : []
  const displayTitle = (note: SideChat): string => {
    const question = state.questions[note.id]
    const stored = note.title.trim()
    const legacyTitle = !stored
      || stored === '侧聊'
      || stored === 'New side chat'
      || stored === note.anchor.selectedText?.trim()
    if (legacyTitle && question) return sideChatTitle(question)
    return stored || sideChatTitle(question ?? '')
  }
  const active = notes.find(note => note.id === activeId)
  const turns = groupSideChatTurns(history?.items ?? [])
  const query = search.trim().toLowerCase()
  const createQuote = (request?.selectedText || request?.sourceTitle || 'AI 回复')
    .replace(/\s+/gu, ' ').trim()
  const filtered = notes.filter(note => {
    const searchable = [
      note.title,
      note.anchor.selectedText ?? '',
      state.questions[note.id] ?? '',
      state.previews[note.id] ?? '',
    ].join(' ')
    return searchable.toLowerCase().includes(query)
  })
  const back = () => {
    setActiveId(undefined); setView('directory'); setHistory(undefined)
    catalog.setActive(undefined); setError(undefined)
  }
  const nativeSessionExists = (note: SideChat): note is SideChat & { childSessionId: string } =>
    note.childSessionId !== null && nativeSessions.byId[note.childSessionId] !== undefined
  const openPromotedSession = (note: SideChat): void => {
    if (!nativeSessionExists(note)) {
      setError('正式会话已不存在。')
      return
    }
    setError(undefined)
    catalog.setActive(undefined)
    openNativeSession(note.childSessionId)
  }
  const openNote = (noteId: string) => {
    setActiveId(noteId); setView('thread')
    setHistory(undefined); setDraft(''); setError(undefined)
    catalog.setActive(noteId)
  }
  const invoke = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError(undefined)
    try {
      await action()
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally { setBusy(false) }
  }
  const create = () => {
    if (!sessionId || !request || request.sessionId !== sessionId || !draft.trim()) return
    const question = draft.trim()
    void invoke(async () => {
      const note = await api.create({
        parentSessionId: sessionId,
        clientRequestId: crypto.randomUUID(),
        anchor: {
          messageId: request.messageId,
          ...(request.selectedText ? { selectedText: request.selectedText } : {}),
        },
        mode,
        title: sideChatTitle(question),
      })
      catalog.upsert(note)
      openNote(note.id)
      await api.followup(sessionId, note.id, question)
      setDraft('')
    })
  }
  const send = () => {
    if (!sessionId || !activeId || !draft.trim()) return
    const question = draft.trim()
    void invoke(async () => {
      await api.followup(sessionId, activeId, question)
      setDraft('')
    })
  }
  const summarize = () => {
    if (!sessionId || !activeId || active?.status !== 'active') return
    void invoke(() => api.followup(sessionId, activeId,
      '请概括本次侧聊已经确定的结论、关键依据和待解决的问题。请简洁准确，不引入没有讨论过的假设。'))
  }
  const change = (operation: 'archive' | 'restore' | 'promote') => {
    if (!sessionId || !activeId) return
    void invoke(async () => {
      const note = await api[operation](sessionId, activeId)
      catalog.upsert(note)
      if (operation === 'archive') back()
    })
  }
  const jump = () => {
    if (!active) return
    const result = jumpToSource(active.anchor.messageId, active.anchor.selectedText)
    if (result === 'not-loaded') setError('来源消息尚未加载。可先滚动主会话加载对应历史。')
    else if (result === 'quote-not-found') setError('原文内容已变化，无法精确定位选中片段。')
    else setError(undefined)
  }
  const copy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
    }).catch(() => setError('复制失败，请选中文本后复制'))
  }
  const quote = (text: string) => {
    if (!sessionId || !active) return
    if (bringBack(sessionId, displayTitle(active), text)) setError(undefined)
    else setError('主对话编辑器暂不可用，请稍后重试')
  }
  if (!sessionId) return <div className="sc-empty">选择一段主对话后即可使用侧聊</div>

  return (
    <section className="sc-root" aria-label="旁敲侧击 · Side Chat">
      <header className="sc-header">
        {view !== 'directory' && <SideChatIconButton label="返回侧聊目录" icon="back" onClick={back} />}
        <div className="sc-heading">{view === 'thread' ? active ? displayTitle(active) : '侧边对话' :
          view === 'create' ? '发起侧聊' : '旁敲侧击'}</div>
        {view === 'directory' && <span className="sc-status">{notes.filter(n => n.status === 'active').length} 条侧聊</span>}
        {view === 'thread' && active && (
          <div className="sc-toolbar">
            <SideChatIconButton label="定位并高亮原消息" icon="locate" onClick={jump} />
            {active.status === 'active' && <SideChatIconButton label="生成侧聊摘要" icon="sparkle" disabled={busy} onClick={summarize} />}
            {active.status === 'active' && <SideChatIconButton label="归档侧聊" icon="archive" disabled={busy} onClick={() => change('archive')} />}
            {active.status === 'archived' && <SideChatIconButton label="恢复侧聊" icon="restore" disabled={busy} onClick={() => change('restore')} />}
            {active.status !== 'promoted' && <SideChatIconButton
              label="升格为正式对话"
              icon="promote" disabled={busy} onClick={() => change('promote')} />}
          </div>
        )}
      </header>

      {view === 'directory' && (
        <div className="sc-scroll">
          <div className="sc-padded" style={{ paddingBottom: 8 }}>
            <div className="sc-directory-help" style={{ marginBottom: 10 }}>
              围绕主对话的独立讨论，不打断原有上下文。
            </div>
            <div className="sc-search">
              <input className="sc-search-input" aria-label="搜索侧聊"
                placeholder="搜索引用内容或回答..." value={search}
                onChange={event => setSearch(event.target.value)} />
              {search && (
                <SideChatIconButton label="清空搜索" icon="clear"
                  onClick={() => setSearch('')} />
              )}
            </div>
          </div>
          <div style={{ padding: '0 9px 16px' }}>
            {filtered.length === 0 && <p className="sc-empty">{query ? '没有找到匹配内容' : '选中回复中的文字，或点击消息下方的侧聊图标，即可开始。'}</p>}
            {filtered.map(note => (
              <button type="button" key={note.id} className="sc-item"
                data-active={activeId === note.id} onClick={() => openNote(note.id)}>
                <div className="sc-item-title">{displayTitle(note)}</div>
                <div className="sc-item-preview">{state.previews[note.id] || '暂无回答'}</div>
                <div className="sc-status" style={{ marginTop: 5 }}>{statusOf(note)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'create' && (
        <>
          <div className="sc-scroll sc-padded" style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
            <div>
              <div className="sc-section-label">引用自主对话</div>
              <blockquote className={'sc-quote sc-quote-clamped'
                + (createQuote.length > QUOTE_PREVIEW_LIMIT ? ' sc-quote-truncated' : '')}>
                <QuoteMark />
                <span className="sc-quote-text">{createQuote}</span>
              </blockquote>
            </div>
            <fieldset className="sc-context-options">
              <legend className="sc-section-label">上下文范围</legend>
              <label className="sc-radio-option">
                <input type="radio" name="sc-context-mode" value="light"
                  checked={mode === 'light'}
                  onChange={() => setMode('light')} />
                <span>轻量 · 围绕引用讨论</span>
              </label>
              <label className="sc-radio-option">
                <input type="radio" name="sc-context-mode" value="fork"
                  checked={mode === 'fork'}
                  onChange={() => setMode('fork')} />
                <span>继承 · 带入此前主对话</span>
              </label>
            </fieldset>
          </div>
          <SideChatComposer value={draft} onChange={setDraft} onSend={create}
            busy={busy} autoFocus placeholder="想就这段内容问什么？" />
        </>
      )}

      {view === 'thread' && active && (
        <>
          <div className="sc-message-header">
            <blockquote className="sc-quote">
              <QuoteMark />
              <span className="sc-quote-text">
                {active.anchor.selectedText || displayTitle(active)}
              </span>
            </blockquote>
          </div>
          <div className="sc-thread-pane">
            <div ref={threadScrollerRef} className="sc-scroll" role="log" aria-live="polite">
              <div className="sc-msg-list">
                {turns.map((turn, turnIndex) => (
                  <div className="sc-turn" data-sidechat-turn={turnIndex} key={turn.key}>
                    {turn.messages.map(({ item, sourceIndex }) => {
                      const dateTime = messageDateTime(item.time)
                      const running = history?.busy === true
                        && sourceIndex === (history?.items.length ?? 0) - 1
                      const hasReplyText = item.blocks.some(block =>
                        block.kind === 'text' && block.text.trim() !== '')
                      return (
                        <div className={'sc-msg ' + (item.role === 'user'
                          ? 'sc-msg-user' : 'sc-msg-assistant')}
                          key={item.messageId}>
                          {item.role === 'assistant'
                            ? <AssistantBlocks blocks={item.blocks} running={running} />
                            : <div className="sc-msg-text">{item.text}</div>}
                          {item.role === 'assistant' && hasReplyText && (
                            <div className="sc-msg-actions">
                              <SideChatIconButton
                                label={copied === item.messageId ? '已复制' : '复制回答'}
                                icon={copied === item.messageId ? 'check' : 'copy'}
                                onClick={() => copy(item.messageId, item.text)} />
                              <SideChatIconButton label="引用到主对话草稿（不会自动发送）"
                                icon="quote" onClick={() => quote(item.text)} />
                              {dateTime && <time className="sc-msg-time"
                                dateTime={dateTime.value}>{dateTime.label}</time>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
                {!history && <div className="sc-empty">正在读取对话记录…</div>}
                {history?.busy && <div className="sc-status">正在生成回答…</div>}
                {history?.items.length === 0 && !history.busy &&
                  <div className="sc-empty">这是一个新的侧聊，输入问题即可开始。</div>}
              </div>
            </div>
            <SideChatTurnNavigator turns={turns} scrollerRef={threadScrollerRef} />
          </div>
          {active.status === 'active' ? (
            <SideChatComposer value={draft} onChange={setDraft} onSend={send}
              onStop={() => void invoke(() => api.cancel(sessionId, active.id))}
              busy={busy} generating={history?.busy === true} placeholder="继续追问…" />
          ) : active.status === 'archived'
            ? <div className="sc-composer sc-status">已归档，可通过顶部操作恢复。</div>
            : <div className="sc-composer">
              <div className="sc-promoted-notice">
                <span className="sc-promoted-copy">{nativeSessionExists(active)
                  ? '已升格，可在正式会话中继续。'
                  : '已升格，但正式会话已不存在。'}</span>
                {nativeSessionExists(active) && (
                  <button type="button" className="sc-inline-action"
                    onClick={() => openPromotedSession(active)}>
                    <span>打开正式会话</span>
                    <SideChatIcon name="promote" />
                  </button>
                )}
              </div>
            </div>}
        </>
      )}
      {view === 'thread' && !active && <div className="sc-empty">侧聊不存在或已被删除，请返回目录。</div>}
      {error && <div className="sc-alert" role="alert">{error}</div>}
    </section>
  )
}
