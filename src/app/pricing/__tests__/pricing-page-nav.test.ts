import fs from 'fs'
import path from 'path'

describe('Pricing page — navigation and structure', () => {
  const pricingPagePath = path.resolve(__dirname, '..', 'page.tsx')
  const footerPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'components',
    'nav',
    'footer.tsx'
  )
  const headerPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'components',
    'nav',
    'app-header.tsx'
  )
  const drawerPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'components',
    'nav',
    'mobile-drawer.tsx'
  )

  describe('Navigation links to /pricing', () => {
    test('footer contains a link to /pricing', () => {
      const source = fs.readFileSync(footerPath, 'utf-8')
      expect(source).toContain('href="/pricing"')
    })

    test('app header contains a link to /pricing', () => {
      const source = fs.readFileSync(headerPath, 'utf-8')
      expect(source).toContain('href="/pricing"')
    })

    test('mobile drawer contains a link to /pricing', () => {
      const source = fs.readFileSync(drawerPath, 'utf-8')
      expect(source).toContain('href="/pricing"')
    })
  })

  describe('Pricing page structure', () => {
    test('imports AppHeader', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('AppHeader')
    })

    test('imports Footer', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('Footer')
    })

    test('imports CTAFooter', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('CTAFooter')
    })

    test('has a trust bar section', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('Fair housing compliance included')
      expect(source).toContain('No credit card for Free tier')
      expect(source).toContain('Cancel anytime')
    })

    test('has an FAQ section with id="faq"', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('id="faq"')
      expect(source).toContain('Frequently Asked Questions')
    })

    test('does NOT link to /faq (broken link)', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).not.toContain('href="/faq"')
    })

    test('links to on-page #faq anchor instead', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('href="#faq"')
    })

    test('has Product structured data', () => {
      const source = fs.readFileSync(pricingPagePath, 'utf-8')
      expect(source).toContain('application/ld+json')
      expect(source).toContain('@type')
    })
  })
})
