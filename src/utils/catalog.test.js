import { describe, expect, it } from 'vitest'
import { BRANCHES } from '../data/branches.js'
import {
  CATALOG_IDS,
  CATALOG_IDS_BY_BRANCH,
  CATALOG_INDEX,
  CATALOG_SIZE,
  getCatalogEntry,
  getCatalogIdsForBranch,
  isCatalogArticle,
} from './catalog.js'

describe('published catalog index', () => {
  it('keeps the global set, index, and branch lists consistent', () => {
    const flattened = [...CATALOG_IDS_BY_BRANCH.values()].flat()

    expect(CATALOG_SIZE).toBe(CATALOG_IDS.size)
    expect(CATALOG_INDEX.size).toBe(CATALOG_IDS.size)
    expect(new Set(flattened).size).toBe(flattened.length)
    expect(new Set(flattened)).toEqual(CATALOG_IDS)
    expect(CATALOG_IDS_BY_BRANCH.size).toBe(BRANCHES.length)
  })

  it('excludes predicted numeric rows while retaining the active boundary', () => {
    expect(isCatalogArticle('JP-4000')).toBe(true)
    expect(isCatalogArticle('JP-4001')).toBe(false)
    expect(getCatalogEntry('JP-4000')).toMatchObject({
      branchCode: 'JP',
      seriesId: 5,
      number: 4000,
    })
  })

  it('deduplicates repeated custom article IDs using the first occurrence', () => {
    const duplicateId = 'scp-flavor:00539'
    const jpIds = getCatalogIdsForBranch('JP')

    expect(jpIds.filter(id => id === duplicateId)).toHaveLength(1)
    expect(getCatalogEntry(duplicateId)).toMatchObject({
      branchCode: 'JP',
      seriesId: 'scp-flavor',
    })
  })

  it('returns a stable empty list for an unknown branch', () => {
    expect(getCatalogIdsForBranch('UNKNOWN')).toEqual([])
    expect(getCatalogIdsForBranch('UNKNOWN')).toBe(getCatalogIdsForBranch('UNKNOWN'))
  })
})
