import {
  compareViolations,
  classifyViolationLayer,
  runCrossStateIsolation,
} from './qa-engine'
import type { ExpectedViolation } from '@/lib/types/compliance-qa'
import type { ComplianceViolation } from '@/lib/types/compliance'

function makeViolation(term: string, category: string, severity: string, law: string = ''): ComplianceViolation {
  return {
    platform: 'general',
    term,
    category: category as any,
    severity: severity as any,
    explanation: '',
    law,
    alternative: '',
    context: '',
  }
}

describe('QA Engine', () => {
  describe('classifyViolationLayer', () => {
    it('classifies federal citations as federal', () => {
      expect(classifyViolationLayer('42 U.S.C. § 3604(c)')).toBe('federal')
    })

    it('classifies Montana citations as state', () => {
      expect(classifyViolationLayer('MCA § 49-2-305')).toBe('state')
    })

    it('classifies Ohio citations as state', () => {
      expect(classifyViolationLayer('ORC §4112.02(H)')).toBe('state')
    })

    it('classifies NAR citations as industry', () => {
      expect(classifyViolationLayer('NAR Code of Ethics Art. 10')).toBe('industry')
    })

    it('classifies unknown citations as federal (safe default)', () => {
      expect(classifyViolationLayer('some other citation')).toBe('federal')
    })
  })

  describe('compareViolations', () => {
    it('returns passed=true when actual matches expected', () => {
      const expected: ExpectedViolation[] = [
        { term: 'no veterans', category: 'military-status' as any, severity: 'hard' },
      ]
      const actual = [makeViolation('no veterans', 'military-status', 'hard')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(true)
      expect(result.mismatches).toHaveLength(0)
    })

    it('detects false positives (found but not expected)', () => {
      const expected: ExpectedViolation[] = []
      const actual = [makeViolation('restricted', 'steering', 'soft')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(false)
      expect(result.mismatches).toHaveLength(1)
      expect(result.mismatches[0].type).toBe('false-positive')
    })

    it('detects missed violations (expected but not found)', () => {
      const expected: ExpectedViolation[] = [
        { term: 'no veterans', category: 'military-status' as any, severity: 'hard' },
      ]
      const actual: ComplianceViolation[] = []
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(false)
      expect(result.mismatches).toHaveLength(1)
      expect(result.mismatches[0].type).toBe('missed')
    })

    it('matches case-insensitively on term', () => {
      const expected: ExpectedViolation[] = [
        { term: 'No Veterans', category: 'military-status' as any, severity: 'hard' },
      ]
      const actual = [makeViolation('no veterans', 'military-status', 'hard')]
      const result = compareViolations(expected, actual)
      expect(result.passed).toBe(true)
    })
  })

  describe('runCrossStateIsolation', () => {
    it('identifies state-specific violations as leaks in other states', () => {
      const violations = [makeViolation('no veterans', 'military-status', 'hard', 'ORC §4112.02(H)')]
      const result = runCrossStateIsolation(violations, 'OH', 'MT')
      expect(result.stateLeaks).toHaveLength(1)
      expect(result.passed).toBe(false)
    })

    it('ignores federal violations (expected to fire everywhere)', () => {
      const violations = [makeViolation('no handicapped', 'disability', 'hard', '42 U.S.C. § 3604(c)')]
      const result = runCrossStateIsolation(violations, 'OH', 'MT')
      expect(result.stateLeaks).toHaveLength(0)
      expect(result.passed).toBe(true)
    })
  })
})
