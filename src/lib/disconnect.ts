// src/lib/disconnect.ts

export interface TrackerEntry { company: string; category: string }
export type TrackerDB = Readonly<Record<string, TrackerEntry>>

export function buildTrackerDB(raw: Record<string, TrackerEntry>): TrackerDB {
  return Object.freeze({ ...raw })
}

export function matchTracker(
  url: string,
  db: TrackerDB
): ({ domain: string } & TrackerEntry) | null {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return null
  }

  // 尝试从最长到最短的域名后缀匹配
  // e.g. pixel.doubleclick.net → try "pixel.doubleclick.net", "doubleclick.net", "net"
  const parts = hostname.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.')
    if (db[candidate]) {
      return { ...db[candidate], domain: candidate }
    }
  }
  return null
}
