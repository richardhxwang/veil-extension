// tests/dark-pattern-rules.test.ts
import { describe, it, expect } from 'vitest'
import {
  detectPreCheckedBoxes,
  detectShamePatterns,
  detectCountdowns,
  detectHiddenCancel,
  runAllDetectors,
} from '../src/lib/dark-pattern-rules'

function makeDoc(html: string): Document {
  const doc = document.implementation.createHTMLDocument()
  doc.body.innerHTML = html
  return doc
}

describe('detectPreCheckedBoxes', () => {
  it('detects a pre-checked subscription checkbox', () => {
    const doc = makeDoc(`
      <div>
        <input type="checkbox" checked id="sub" />
        <label for="sub">订阅我们的促销邮件，每周$9.99</label>
      </div>
    `)
    const results = detectPreCheckedBoxes(doc)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('预勾选订阅')
  })

  it('ignores unchecked checkboxes', () => {
    const doc = makeDoc('<input type="checkbox" />')
    expect(detectPreCheckedBoxes(doc)).toHaveLength(0)
  })

  it('ignores checked checkbox without money-related label', () => {
    const doc = makeDoc('<input type="checkbox" checked /><label>我同意条款</label>')
    // 没有价格相关词，不应触发
    expect(detectPreCheckedBoxes(doc)).toHaveLength(0)
  })
})

describe('detectShamePatterns', () => {
  it('detects shame/guilt-trip decline button', () => {
    const doc = makeDoc('<button>No thanks, I hate saving money</button>')
    const results = detectShamePatterns(doc)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('羞辱式按钮')
  })

  it('detects Chinese shame pattern', () => {
    const doc = makeDoc('<a>不了，我不需要省钱</a>')
    const results = detectShamePatterns(doc)
    expect(results.length).toBeGreaterThan(0)
  })

  it('ignores normal buttons', () => {
    const doc = makeDoc('<button>提交</button><button>取消</button>')
    expect(detectShamePatterns(doc)).toHaveLength(0)
  })
})

describe('detectCountdowns', () => {
  it('detects countdown element', () => {
    const doc = makeDoc('<div class="countdown-timer">限时优惠：00:59:23</div>')
    const results = detectCountdowns(doc)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('虚假倒计时')
  })

  it('detects timer class', () => {
    const doc = makeDoc('<span class="timer">剩余时间: 02:30</span>')
    const results = detectCountdowns(doc)
    expect(results.length).toBeGreaterThan(0)
  })

  it('ignores elements without countdown classes', () => {
    const doc = makeDoc('<div>普通内容</div>')
    expect(detectCountdowns(doc)).toHaveLength(0)
  })
})

describe('detectHiddenCancel', () => {
  it('detects hidden cancel/unsubscribe link', () => {
    const doc = makeDoc('<a href="/cancel" style="color: #ffffff; font-size: 8px">取消订阅</a>')
    const results = detectHiddenCancel(doc)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('隐藏取消选项')
  })

  it('detects invisible unsubscribe button', () => {
    const doc = makeDoc('<button style="opacity: 0.1">Unsubscribe</button>')
    const results = detectHiddenCancel(doc)
    expect(results.length).toBeGreaterThan(0)
  })

  it('ignores normal visible links', () => {
    const doc = makeDoc('<a href="/cancel">取消订单</a>')
    expect(detectHiddenCancel(doc)).toHaveLength(0)
  })
})

describe('runAllDetectors', () => {
  it('aggregates results from all detectors', () => {
    const doc = makeDoc(`
      <div class="countdown">限时优惠</div>
      <button>No thanks, I love paying more</button>
    `)
    const results = runAllDetectors(doc)
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty array for clean page', () => {
    const doc = makeDoc('<p>普通内容</p>')
    expect(runAllDetectors(doc)).toHaveLength(0)
  })
})
