import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LIMITS,
  ipLimitIdentity,
  quarantineBuckets,
  secondsToNextHour,
  submissionBuckets,
  utcHour,
  visualizationBucket,
  warsawDay,
} from '@/lib/submissions/limits'

describe('okna limitów', () => {
  it('doba liczy się według czasu polskiego, także przy zmianie czasu', () => {
    // 20.10.2026 22:30 UTC = 21.10 00:30 czasu letniego w Polsce
    expect(warsawDay(new Date('2026-10-20T21:59:59Z'))).toBe('2026-10-20')
    expect(warsawDay(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
    // 25.10.2026 zmiana na czas zimowy: północ 26.10 to 23:00 UTC
    expect(warsawDay(new Date('2026-10-25T22:59:59Z'))).toBe('2026-10-25')
    expect(warsawDay(new Date('2026-10-25T23:00:00Z'))).toBe('2026-10-26')
  })

  it('limit IP liczy pełną godzinę UTC, Retry-After wskazuje jej koniec', () => {
    expect(utcHour(new Date('2026-10-20T17:59:59Z'))).toBe('2026-10-20T17')
    expect(secondsToNextHour(new Date('2026-10-20T17:59:30Z'))).toBe(30)
    expect(secondsToNextHour(new Date('2026-10-20T17:00:00Z'))).toBe(3600)
  })

  it('klucze liczników zawierają okno i przedrostek', () => {
    const now = new Date('2026-10-20T17:20:00Z')
    const [ip, day] = submissionBuckets('test:', 'abc', now, DEFAULT_LIMITS)
    expect(ip).toMatchObject({ key: 'test:ip:abc:2026-10-20T17', limit: 5, scope: 'ip' })
    expect(day).toMatchObject({ key: 'test:dzien:2026-10-20', limit: 40, scope: 'day' })
    expect(visualizationBucket('', now, 10)).toMatchObject({
      key: 'wizualizacje:2026-10-20',
      limit: 10,
    })
  })

  it('kwarantanna: osobne, ostrzejsze liczniki (1 na godzinę z IP, 10 na dobę)', () => {
    const now = new Date('2026-10-20T17:20:00Z')
    const [ip, day] = quarantineBuckets('test:', 'abc', now, DEFAULT_LIMITS)
    expect(ip).toMatchObject({
      key: 'test:kwarantanna-ip:abc:2026-10-20T17',
      limit: 1,
      scope: 'quarantine',
    })
    expect(day).toMatchObject({
      key: 'test:kwarantanna-dzien:2026-10-20',
      limit: 10,
      scope: 'quarantine',
    })
    // klucze nie nachodzą na zwykłe liczniki
    const regular = submissionBuckets('test:', 'abc', now, DEFAULT_LIMITS).map((b) => b.key)
    expect(regular).not.toContain(ip.key)
    expect(regular).not.toContain(day.key)
  })
})

describe('tożsamość adresu do limitu IP', () => {
  it('IPv4 bez zmian, także zapisany jako IPv6', () => {
    expect(ipLimitIdentity('203.0.113.7')).toBe('203.0.113.7')
    expect(ipLimitIdentity('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('IPv6 po prefiksie /64: zmiana adresu w tej samej sieci nie obchodzi limitu', () => {
    const a = ipLimitIdentity('2001:db8:abcd:12::1')
    expect(a).toBe('2001:0db8:abcd:0012::/64')
    expect(ipLimitIdentity('2001:0DB8:ABCD:0012:ffff:1:2:3')).toBe(a)
    expect(ipLimitIdentity('[2001:db8:abcd:12::99]')).toBe(a)
    expect(ipLimitIdentity('2001:db8:abcd:12::5%en0')).toBe(a)
    expect(ipLimitIdentity('2001:db8:abcd:13::1')).not.toBe(a)
    expect(ipLimitIdentity('::1')).toBe('0000:0000:0000:0000::/64')
  })
})
