import { scanAd, runTestSuite, classifyViolationLayer } from './qa-engine'
import { getComplianceConfig } from './engine'

describe('QA Engine Integration (Montana)', () => {
  it('Montana config exists', () => {
    expect(getComplianceConfig('MT')).not.toBeNull()
  })

  describe('scanAd', () => {
    it('returns null for unknown state', () => {
      expect(scanAd('test', 'XX')).toBeNull()
    })

    it('finds zero violations in clean ad', () => {
      const result = scanAd(
        'Beautiful 4-bedroom home in Bozeman. Updated kitchen, spacious backyard.',
        'MT'
      )
      expect(result).not.toBeNull()
      expect(result!.violations).toHaveLength(0)
      expect(result!.summary.total).toBe(0)
    })

    it('finds violations in ad with prohibited terms', () => {
      const result = scanAd(
        'Exclusive neighborhood. No children allowed.',
        'MT'
      )
      expect(result).not.toBeNull()
      expect(result!.violations.length).toBeGreaterThan(0)
      expect(result!.summary.hard).toBeGreaterThan(0)
    })

    it('classifies violations into layers', () => {
      const result = scanAd(
        'No children. No section 8. Exclusive community.',
        'MT'
      )
      expect(result).not.toBeNull()
      const totalLayered =
        result!.layerBreakdown.state.length +
        result!.layerBreakdown.federal.length +
        result!.layerBreakdown.industry.length
      expect(totalLayered).toBe(result!.violations.length)
    })
  })

  describe('runTestSuite', () => {
    it('passes clean ad with empty expected violations', () => {
      const { results, summary } = runTestSuite([
        {
          id: 'test-clean',
          name: 'Clean ad',
          state: 'MT',
          text: 'Beautiful home in Bozeman with mountain views.',
          expected_violations: [],
          is_clean: true,
        },
      ])
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(true)
      expect(summary.passed).toBe(1)
      expect(summary.failed).toBe(0)
    })

    it('fails when expected violation is not found', () => {
      const { results } = runTestSuite([
        {
          id: 'test-missed',
          name: 'Missing violation',
          state: 'MT',
          text: 'Beautiful home in Bozeman.',
          expected_violations: [
            { term: 'no children', category: 'familial-status' as any, severity: 'hard' as any },
          ],
          is_clean: false,
        },
      ])
      expect(results[0].passed).toBe(false)
      expect(results[0].mismatches[0].type).toBe('missed')
    })

    it('builds category coverage correctly', () => {
      const { summary } = runTestSuite([
        {
          id: 'test-cov',
          name: 'Coverage test',
          state: 'MT',
          text: 'No children allowed.',
          expected_violations: [
            { term: 'no children', category: 'familial-status' as any, severity: 'hard' as any },
          ],
          is_clean: false,
        },
      ])
      const familialCov = summary.coverage.find((c) => c.category === 'familial-status')
      expect(familialCov?.covered).toBe(true)
      expect(familialCov?.testAdCount).toBe(1)

      const steeringCov = summary.coverage.find((c) => c.category === 'steering')
      expect(steeringCov?.covered).toBe(false)
      expect(steeringCov?.testAdCount).toBe(0)
    })
  })
})
