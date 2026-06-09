import React from 'react'
import type { ScoreData, ViewName } from '../../lib/types'
import { scoreToColor } from '../../lib/scoring'

interface Props { score: ScoreData; onNavigate: (v: ViewName) => void }

// SF Symbols-style SVG icons
const Icons = {
  shield: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="15" r=".5" fill={color}/>
    </svg>
  ),
  eye: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  antenna: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill={color}/>
    </svg>
  ),
  star: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  chevron: () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="#C7C7CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l5 5-5 5"/>
    </svg>
  ),
}

const MODULES = [
  {
    key: 'darkpatterns' as ViewName,
    icon: Icons.shield,
    iconBg: '#FF9500',
    label: '暗模式检测',
    desc: '操纵用户决策的设计陷阱',
    value: (s: ScoreData) => s.darkPatternCount,
    unit: '个陷阱',
  },
  {
    key: 'trackers' as ViewName,
    icon: Icons.antenna,
    iconBg: '#FF3B30',
    label: '追踪器',
    desc: '正在监测你行为的第三方公司',
    value: (s: ScoreData) => s.trackerCount,
    unit: '家公司',
  },
  {
    key: 'xray' as ViewName,
    icon: Icons.eye,
    iconBg: '#AF52DE',
    label: 'X 光隐藏层',
    desc: '藏在页面里的不可见元素',
    value: (s: ScoreData) => s.hiddenElementCount,
    unit: '个元素',
  },
  {
    key: 'galaxy' as ViewName,
    icon: Icons.star,
    iconBg: '#007AFF',
    label: '浏览星系',
    desc: '你过去 30 天的访问轨迹',
    value: (s: ScoreData) => s.visitCount,
    unit: '次访问',
  },
]

function ScoreRing({ score }: { score: number }) {
  const color = scoreToColor(score)
  const r = 52, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const label = score >= 80 ? '良好' : score >= 50 ? '一般' : '危险'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E5EA" strokeWidth="8"/>
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px`, fontSize: 30, fontWeight: 700, fill: '#000', fontFamily: '-apple-system, sans-serif' }}>
          {score}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" dominantBaseline="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px`, fontSize: 12, fill: '#8E8E93', fontFamily: '-apple-system, sans-serif' }}>
          {label}
        </text>
      </svg>
      <p style={{ margin: 0, fontSize: 11, color: '#8E8E93' }}>隐私评分</p>
    </div>
  )
}

export default function Home({ score, onNavigate }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', padding: '16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Veil</span>
        <span style={{ fontSize: 11, color: '#8E8E93', background: '#fff', padding: '3px 10px', borderRadius: 20 }}>本地运行</span>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 20px' }}>
        <ScoreRing score={score.total} />
      </div>

      {/* Module list */}
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 0 rgba(60,60,67,0.08)' }}>
        {MODULES.map((m, i) => {
          const val = m.value(score)
          return (
            <div key={m.key}>
              <button
                onClick={() => onNavigate(m.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: m.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {m.icon('#fff')}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#000' }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>{m.desc}</div>
                </div>
                {/* Value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, color: '#8E8E93' }}>
                    {val > 0 ? <span style={{ color: '#000', fontWeight: 500 }}>{val}</span> : '—'}
                    {val > 0 ? <span style={{ fontSize: 12, color: '#8E8E93' }}> {m.unit}</span> : ''}
                  </span>
                  {Icons.chevron()}
                </div>
              </button>
              {i < MODULES.length - 1 && (
                <div style={{ height: 0.5, background: 'rgba(60,60,67,0.12)', margin: '0 16px 0 64px' }} />
              )}
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#C7C7CC', marginTop: 20 }}>
        数据仅在本机处理 · 零上传
      </p>
    </div>
  )
}
