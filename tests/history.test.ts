import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DshHistoryReader } from '../src/host/history.ts'
import type { ObservedSession } from '../src/host/dsh-session-adapter.ts'
import type { SideChat } from '../src/domain/types.ts'

const note: SideChat = {
  id: 'n1', clientRequestId: 'request', parentSessionId: 'main',
  childSessionId: 'child', title: 'Test', mode: 'fork', status: 'active',
  anchor: { messageId: 'main-msg' }, createdAt: '', updatedAt: '', revision: 1,
}

describe('DshHistoryReader', () => {
  it('shows only child-authored messages, not inherited main messages', async () => {
    let released = 0
    const observed: ObservedSession = {
      header: { id: 'child' },
      inheritedEventCount: 2,
      events: [
        { type: 'assistant/message', seq: 0, time: 1, data: { message: { id: 'main-msg', content: [{ type: 'text', text: 'Main conversation' }] } } },
        { type: 'turn/end', seq: 1, time: 2, data: {} },
        { type: 'user/message', seq: 2, time: 3, data: { id: 'side-user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Side question' }] } },
        {
          type: 'assistant/message', seq: 3, time: 4,
          data: {
            message: {
              id: 'side-answer',
              content: [
                { type: 'reasoning', text: 'First inspect the issue.' },
                { type: 'text', text: 'Side answer' },
              ],
            },
          },
        },
      ],
      release() { released++ },
    }
    const reader = new DshHistoryReader({
      observe: async () => observed,
      isRunning: () => false,
    })
    const result = await reader.read(note)
    assert.deepEqual(result.items.map(item => item.text), ['Side question', 'Side answer'])
    assert.deepEqual(result.items[1]?.blocks, [
      { kind: 'reasoning', text: 'First inspect the issue.' },
      { kind: 'text', text: 'Side answer' },
    ])
    assert.equal(result.items[1]?.time, 4)
    assert.equal(released, 1)
  })

  it('keeps the answer body when reasoning reaches its own cap', async () => {
    const reader = new DshHistoryReader({
      async observe() {
        return {
          header: { id: 'child' },
          inheritedEventCount: 0,
          events: [
            {
              type: 'assistant/message',
              seq: 0,
              data: {
                message: {
                  id: 'answer',
                  content: [
                    { type: 'reasoning', text: 'r'.repeat(9_000) },
                    { type: 'text', text: 'Visible answer' },
                  ],
                },
              },
            },
          ],
          release() {},
        } satisfies ObservedSession
      },
      isRunning: () => false,
    })
    const result = await reader.read(note)
    assert.equal(result.items[0]?.blocks[0]?.text.length, 8_000)
    assert.equal(result.items[0]?.text, 'Visible answer')
  })
})
