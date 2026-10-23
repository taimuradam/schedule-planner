import type { CategoryId, PlannerState } from '../model/types'

// Starter vocabulary, used until the planner has learned your own words.
// Phrases match whole words in order.
const KEYWORDS: Record<CategoryId, string[]> = {
  job: [
    'apply', 'applied', 'application', 'applications', 'resume', 'cv', 'cover letter', 'interview', 'interviews',
    'recruiter', 'recruiters', 'linkedin', 'referral', 'referrals', 'networking', 'coffee chat', 'informational',
    'offer', 'job', 'jobs', 'hiring', 'career', 'careers', 'behavioral', 'onsite', 'phone screen', 'leetcode',
    'handshake', 'glassdoor', 'indeed', 'salary', 'negotiate', 'internship', 'internships',
  ],
  side: [
    'repo', 'github', 'deploy', 'ship', 'mvp', 'app', 'feature', 'features', 'bug', 'bugs', 'refactor', 'code',
    'coding', 'prototype', 'website', 'landing page', 'domain', 'launch', 'release', 'side project', 'api',
    'database', 'backend', 'frontend', 'ui', 'blog', 'newsletter', 'vercel', 'pull request', 'beta',
  ],
  school: [
    'homework', 'hw', 'problem set', 'pset', 'ps', 'assignment', 'assignments', 'quiz', 'exam', 'exams', 'midterm',
    'final', 'finals', 'lecture', 'lectures', 'class', 'course', 'chapter', 'reading', 'readings', 'essay', 'lab',
    'study', 'studying', 'notes', 'textbook', 'professor', 'office hours', 'recitation', 'syllabus', 'seminar',
    'thesis', 'tutoring',
  ],
}

// Words too common to say anything about a category.
const STOPWORDS = new Set(
  (
    'the a an and or to for of on in at with my by from up do get go make finish start work review prep set new ' +
    'next plan week day call send write read check about into this that it is be some more first last update ' +
    'follow email emails due draft fix'
  ).split(' '),
)

const CATEGORY_IDS: CategoryId[] = ['job', 'side', 'school']

// Letters and digits split apart, so "PS4" reads as "ps" and "4".
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+|\d+/g) ?? []
}

const meaningful = (tokens: string[]) => [...new Set(tokens)].filter((t) => t.length > 1 && !STOPWORDS.has(t))

export interface Example {
  text: string
  category: CategoryId
}

/** Everything already filed under a category, each distinct line once. */
export function examplesFrom(state: PlannerState): Example[] {
  const all: Example[] = [
    ...state.goals,
    ...state.dailyTasks,
    ...state.repeating,
    ...state.backlog,
    ...Object.values(state.weeks).flatMap((w) => w.tasks),
  ]
  const seen = new Set<string>()
  return all.filter((e) => {
    const key = `${e.category}|${e.text.trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Builds a guesser that scores each category by the starter keywords in the
 * text plus how you've filed the same words before; your own history counts
 * double, so it wins over the starter list once it disagrees. Returns
 * undefined unless one category is a clear winner.
 */
export function buildGuesser(examples: Example[]): (text: string) => CategoryId | undefined {
  const counts = new Map<string, Record<CategoryId, number>>()
  for (const e of examples) {
    for (const word of meaningful(tokenize(e.text))) {
      const c = counts.get(word) ?? { job: 0, side: 0, school: 0 }
      c[e.category] += 1
      counts.set(word, c)
    }
  }

  return (text) => {
    const tokens = tokenize(text)
    if (tokens.length === 0) return undefined
    const words = new Set(tokens)
    const joined = ` ${tokens.join(' ')} `
    const score: Record<CategoryId, number> = { job: 0, side: 0, school: 0 }

    for (const id of CATEGORY_IDS) {
      for (const k of KEYWORDS[id]) {
        if (k.includes(' ') ? joined.includes(` ${k} `) : words.has(k)) score[id] += 1
      }
    }
    for (const word of meaningful(tokens)) {
      const c = counts.get(word)
      if (!c) continue
      const n = c.job + c.side + c.school
      // Words seen more often are more trustworthy: 1 sighting counts half.
      for (const id of CATEGORY_IDS) score[id] += 2 * (c[id] / n) * (n / (n + 1))
    }

    const [best, second] = [...CATEGORY_IDS].sort((a, b) => score[b] - score[a])
    return score[best] >= 0.9 && score[best] - score[second] >= 0.4 ? best : undefined
  }
}
