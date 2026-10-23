import { describe, expect, it } from 'vitest'
import { extractCategory } from './categoryTokens'

describe('extractCategory', () => {
  it('waits for a space before acting on a tag while typing', () => {
    expect(extractCategory('Mock interview #j', false)).toEqual({ text: 'Mock interview #j' })
    expect(extractCategory('#j ', false)).toEqual({ text: '', category: 'job' })
    expect(extractCategory('#s Deploy', false)).toEqual({ text: 'Deploy', category: 'side' })
  })

  it('takes a trailing tag on submit', () => {
    expect(extractCategory('Mock interview #j', true)).toEqual({ text: 'Mock interview', category: 'job' })
    expect(extractCategory('Read ch. 7 #H', true)).toEqual({ text: 'Read ch. 7', category: 'school' })
  })

  it('accepts ids and a few aliases', () => {
    expect(extractCategory('PS4 #hw', true)).toEqual({ text: 'PS4', category: 'school' })
    expect(extractCategory('Repo #side', true)).toEqual({ text: 'Repo', category: 'side' })
    expect(extractCategory('Laundry #p', true)).toEqual({ text: 'Laundry', category: 'personal' })
    expect(extractCategory('Dentist #errands', true)).toEqual({ text: 'Dentist', category: 'personal' })
  })

  it('leaves unknown tags and mid-word hashes alone', () => {
    expect(extractCategory('Learn #rust', true)).toEqual({ text: 'Learn #rust' })
    expect(extractCategory('Issue#j fix', true)).toEqual({ text: 'Issue#j fix' })
  })

  it('uses the last tag when there are several', () => {
    expect(extractCategory('#j Thing #s', true)).toEqual({ text: 'Thing', category: 'side' })
  })
})
