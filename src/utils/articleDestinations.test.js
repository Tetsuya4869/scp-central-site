import { describe, expect, it } from 'vitest'
import { resolveArticleDestinations } from './articleDestinations.js'

describe('article destination selection', () => {
  it('uses canonical numeric metadata to offer the JP translation and known original', () => {
    expect(resolveArticleDestinations({
      id: 'EN-173', url: 'http://scp-jp.wikidot.com/scp-173',
    })).toEqual({
      primaryUrl: 'http://scp-jp.wikidot.com/scp-173',
      originalUrl: 'http://scp-wiki.wikidot.com/scp-173',
      offersChoice: true,
    })
    expect(resolveArticleDestinations({
      id: 'CN-173', url: 'http://scp-jp.wikidot.com/scp-cn-173',
    })).toMatchObject({
      originalUrl: 'http://scp-wiki-cn.wikidot.com/scp-cn-173', offersChoice: true,
    })
    expect(resolveArticleDestinations({
      id: 'RU-1000', url: 'http://scp-jp.wikidot.com/scp-1000-ru',
    })).toMatchObject({
      originalUrl: 'https://scpfoundation.net/scp-1000-ru', offersChoice: true,
    })
  })

  it('keeps native JP articles direct and does not treat protocol or fragments as alternate resources', () => {
    expect(resolveArticleDestinations({
      id: 'JP-173', url: 'https://scp-jp.wikidot.com/scp-173-jp',
    }).offersChoice).toBe(false)
    const primaryUrl = 'http://SCP-JP.WIKIDOT.COM:80/scp-173#translation'
    const originalUrl = 'https://scp-jp.wikidot.com:443/scp-173#original'
    expect(resolveArticleDestinations({
      id: 'EN-173', url: primaryUrl, originalUrl,
    })).toEqual({ primaryUrl, originalUrl, offersChoice: false })
  })

  it('accepts an explicit original for a custom article without inventing one from its slug', () => {
    const article = {
      id: 'scp-666-j', branchCode: 'EN', number: 666,
      url: 'http://scp-jp.wikidot.com/scp-666-j',
    }
    expect(resolveArticleDestinations(article)).toEqual({
      primaryUrl: article.url, originalUrl: null, offersChoice: false,
    })
    expect(resolveArticleDestinations({
      ...article, originalUrl: 'https://scp-wiki.wikidot.com/scp-666-j',
    })).toEqual({
      primaryUrl: article.url,
      originalUrl: 'https://scp-wiki.wikidot.com/scp-666-j',
      offersChoice: true,
    })
  })

  it('does not generate originals from arbitrary numbers, unknown IDs or out-of-range IDs', () => {
    for (const id of ['custom-example', 'EN-0', 'RU-173', 'XX-173']) {
      expect(resolveArticleDestinations({
        id, branchCode: 'EN', number: 173,
        url: 'http://scp-jp.wikidot.com/custom-example',
      })).toMatchObject({ originalUrl: null, offersChoice: false })
    }
  })

  it('leaves custom links already outside the JP host as direct links', () => {
    expect(resolveArticleDestinations({
      id: 'custom-original', branchCode: 'EN',
      url: 'https://scp-wiki.wikidot.com/custom-original',
      originalUrl: 'https://example.com/another-original',
    }).offersChoice).toBe(false)
  })

  it('normalizes hosts for the choice decision while preserving valid trimmed literal destinations', () => {
    const primaryUrl = 'https://SCP-JP.WIKIDOT.COM/scp-173?view=reader#article'
    const originalUrl = 'https://scp-wiki.wikidot.com/scp-173?view=reader#original'
    expect(resolveArticleDestinations({
      id: 'EN-173', url: `  ${primaryUrl}  `, originalUrl: `\n${originalUrl}\t`,
    })).toEqual({ primaryUrl, originalUrl, offersChoice: true })
  })

  it.each([
    'javascript:alert(1)', 'data:text/html,example', 'mailto:reader@example.com',
    '/scp-173', '//scp-jp.wikidot.com/scp-173', 'http:scp-jp.wikidot.com/scp-173',
    'https://', 'https://reader:password@scp-jp.wikidot.com/scp-173',
  ])('does not turn an invalid primary destination into an active chooser: %s', url => {
    expect(resolveArticleDestinations({
      id: 'EN-173', url, originalUrl: 'https://scp-wiki.wikidot.com/scp-173',
    })).toMatchObject({ primaryUrl: null, offersChoice: false })
  })

  it('rejects invalid explicit originals but can recover an independently known canonical original', () => {
    expect(resolveArticleDestinations({
      id: 'custom-example', branchCode: 'EN',
      url: 'https://scp-jp.wikidot.com/custom-example',
      originalUrl: 'javascript:alert(1)',
    })).toMatchObject({ originalUrl: null, offersChoice: false })
    expect(resolveArticleDestinations({
      id: 'EN-173', url: 'https://scp-jp.wikidot.com/scp-173',
      originalUrl: '//unverified.example/scp-173',
    })).toMatchObject({
      originalUrl: 'http://scp-wiki.wikidot.com/scp-173', offersChoice: true,
    })
  })

  it('handles absent article data without inventing a destination', () => {
    expect(resolveArticleDestinations()).toEqual({ primaryUrl: null, originalUrl: null, offersChoice: false })
    expect(resolveArticleDestinations({})).toEqual({ primaryUrl: null, originalUrl: null, offersChoice: false })
  })
})
