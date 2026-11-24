import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import {
  extractMarkdownPlainText,
  type MarkdownPlainTextMode,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { HistoryItem } from '../host/rpc.ts'

const TURN_MARK_HEIGHT = 16
const TURN_MARK_INSET = 6

export interface SideChatTurnMessage {
  readonly item: HistoryItem
  readonly sourceIndex: number
}

export interface SideChatTurn {
  readonly key: string
  readonly prompt: string
  readonly response: string
  readonly messages: readonly SideChatTurnMessage[]
}

interface MutableSideChatTurn {
  key: string
  prompt: string
  response: string
  messages: SideChatTurnMessage[]
}

function compactText(text: string, mode: MarkdownPlainTextMode): string {
  try {
    return extractMarkdownPlainText(text, { mode }).replace(/\s+/gu, ' ').trim()
  } catch {
    return text.replace(/\s+/gu, ' ').trim()
  }
}

/** Group each user prompt with the assistant messages that answer it. */
export function groupSideChatTurns(items: readonly HistoryItem[]): readonly SideChatTurn[] {
  const turns: MutableSideChatTurn[] = []
  items.forEach((item, sourceIndex) => {
    let turn = turns.at(-1)
    if (item.role === 'user' || turn === undefined) {
      turn = {
        key: 'turn:' + item.messageId,
        prompt: item.role === 'user'
          ? compactText(item.text, 'first-paragraph')
          : '',
        response: '',
        messages: [],
      }
      turns.push(turn)
    }
    turn.messages.push({ item, sourceIndex })
    if (item.role === 'assistant' && item.text.trim()) {
      const response = compactText(item.text, 'all')
      turn.response = turn.response ? turn.response + ' ' + response : response
    }
  })
  return turns
}

function turnRows(scroller: HTMLElement): HTMLElement[] {
  return Array.from(scroller.querySelectorAll<HTMLElement>(
    ':scope > .sc-msg-list > [data-sidechat-turn]',
  ))
}

function visibleTurnIndex(scroller: HTMLElement, turnCount: number): number {
  if (turnCount <= 0) return 0
  const rows = turnRows(scroller)
  if (rows.length === 0) return 0
  if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
    return Math.min(turnCount - 1, rows.length - 1)
  }
  const viewport = scroller.getBoundingClientRect()
  const readingLine = viewport.top + Math.min(96, scroller.clientHeight * 0.2)
  let active = 0
  for (let index = 0; index < rows.length; index++) {
    if ((rows[index] as HTMLElement).getBoundingClientRect().top > readingLine) break
    active = index
  }
  return Math.min(active, turnCount - 1)
}

function jumpToTurn(scroller: HTMLElement, index: number): void {
  const row = turnRows(scroller)[index]
  if (!row) return
  const behavior = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  scroller.scrollTo({
    top: Math.max(
      0,
      scroller.scrollTop + row.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top - 12,
    ),
    behavior,
  })
}

interface SideChatTurnNavigatorProps {
  readonly turns: readonly SideChatTurn[]
  readonly scrollerRef: RefObject<HTMLDivElement>
}

/** Left-edge turn dots with focus/hover previews and transcript scroll tracking. */
export function SideChatTurnNavigator({ turns, scrollerRef }: SideChatTurnNavigatorProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState<number | undefined>()
  const [railScrollTop, setRailScrollTop] = useState(0)
  const railRef = useRef<HTMLDivElement | null>(null)
  const markRefs = useRef<Array<HTMLButtonElement | null>>([])
  const animationFrame = useRef<number | null>(null)
  const pointerInside = useRef(false)
  const previewId = useId()

  const updateActiveTurn = useCallback(() => {
    animationFrame.current = null
    const scroller = scrollerRef.current
    if (!scroller) return
    const next = visibleTurnIndex(scroller, turns.length)
    setActiveIndex(current => current === next ? current : next)
  }, [scrollerRef, turns.length])

  const scheduleActiveTurn = useCallback(() => {
    if (animationFrame.current !== null) return
    animationFrame.current = requestAnimationFrame(updateActiveTurn)
  }, [updateActiveTurn])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    updateActiveTurn()
    const list = scroller.querySelector<HTMLElement>(':scope > .sc-msg-list')
    const observer = typeof ResizeObserver === 'undefined'
      ? undefined : new ResizeObserver(scheduleActiveTurn)
    observer?.observe(scroller)
    if (list) observer?.observe(list)
    scroller.addEventListener('scroll', scheduleActiveTurn, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', scheduleActiveTurn)
      observer?.disconnect()
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }
  }, [scheduleActiveTurn, scrollerRef, turns.length, updateActiveTurn])

  useEffect(() => {
    setActiveIndex(current => Math.min(current, Math.max(0, turns.length - 1)))
  }, [turns.length])

  useEffect(() => {
    if (pointerInside.current) return
    const rail = railRef.current
    const mark = markRefs.current[activeIndex]
    if (!rail || !mark) return
    const top = mark.offsetTop
    const bottom = top + mark.offsetHeight
    const visibleTop = rail.scrollTop + TURN_MARK_HEIGHT
    const visibleBottom = rail.scrollTop + rail.clientHeight - TURN_MARK_HEIGHT
    if (top >= visibleTop && bottom <= visibleBottom) return
    rail.scrollTo({
      top: Math.max(0, top - rail.clientHeight / 2 + mark.offsetHeight / 2),
      behavior: typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [activeIndex, turns.length])

  if (turns.length < 2) return null
  const preview = previewIndex === undefined ? undefined : turns[previewIndex]
  const previewNumber = (previewIndex ?? 0) + 1
  const previewTop = previewIndex === undefined ? 0
    : TURN_MARK_INSET + previewIndex * TURN_MARK_HEIGHT + TURN_MARK_HEIGHT / 2 - railScrollTop

  return (
    <nav className="sc-turn-nav" aria-label="侧聊轮次导航"
      onPointerEnter={() => { pointerInside.current = true }}
      onPointerLeave={() => {
        pointerInside.current = false
        setPreviewIndex(undefined)
      }}>
      <div ref={railRef} className="sc-turn-nav-scroll"
        onScroll={event => setRailScrollTop(event.currentTarget.scrollTop)}>
        <div className="sc-turn-nav-marks">
          {turns.map((turn, index) => (
            <button
              key={turn.key}
              ref={element => { markRefs.current[index] = element }}
              type="button"
              className="sc-turn-mark"
              data-active={index === activeIndex}
              data-preview={index === previewIndex}
              aria-label={'跳转到第 ' + (index + 1) + ' 轮'}
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-describedby={index === previewIndex ? previewId : undefined}
              onPointerEnter={() => setPreviewIndex(index)}
              onFocus={() => setPreviewIndex(index)}
              onBlur={() => setPreviewIndex(undefined)}
              onClick={() => {
                const scroller = scrollerRef.current
                if (scroller) jumpToTurn(scroller, index)
              }}>
              <svg className="sc-turn-dot" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="3.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>
      {preview && (
        <div
          id={previewId}
          role="tooltip"
          className="sc-turn-preview"
          style={{ '--sc-turn-preview-top': previewTop + 'px' } as CSSProperties}>
          <div className="sc-turn-preview-prompt">
            {preview.prompt || '第 ' + previewNumber + ' 轮'}
          </div>
          {preview.response && (
            <div className="sc-turn-preview-response">{preview.response}</div>
          )}
        </div>
      )}
    </nav>
  )
}
