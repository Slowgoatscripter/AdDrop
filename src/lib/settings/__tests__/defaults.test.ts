import { settingsDefaults } from '@/lib/settings/defaults';
import type { FAQItem } from '@/lib/types/settings';

describe('settingsDefaults', () => {
  describe('CTA description key', () => {
    it('has landing.cta_description key with non-beta default text', () => {
      expect(settingsDefaults['landing.cta_description']).toBe(
        'Create a free account and generate your first campaign in minutes.'
      );
    });

    it('does not have landing.cta_beta key', () => {
      expect('landing.cta_beta' in settingsDefaults).toBe(false);
    });
  });

  describe('FAQ defaults', () => {
    it('first FAQ answer does not contain beta language', () => {
      const faqs = settingsDefaults['landing.faq'] as FAQItem[];
      const firstFaq = faqs[0];
      expect(firstFaq.answer).not.toContain('beta');
      expect(firstFaq.answer).not.toContain('per week');
    });

    it('first FAQ answer references free tier and upgrade options', () => {
      const faqs = settingsDefaults['landing.faq'] as FAQItem[];
      const firstFaq = faqs[0];
      expect(firstFaq.answer).toContain('free tier');
      expect(firstFaq.answer).toContain('Pro');
      expect(firstFaq.answer).toContain('Enterprise');
    });
  });

  describe('no beta text in any default value', () => {
    it('does not contain the word "beta" in any string default value', () => {
      for (const [key, value] of Object.entries(settingsDefaults)) {
        if (typeof value === 'string') {
          expect({ key, containsBeta: value.toLowerCase().includes('beta') }).toEqual({
            key,
            containsBeta: false,
          });
        }
      }
    });

    it('does not contain the word "beta" in any FAQ answer', () => {
      const faqs = settingsDefaults['landing.faq'] as FAQItem[];
      for (const faq of faqs) {
        expect({ question: faq.question, containsBeta: faq.answer.toLowerCase().includes('beta') }).toEqual({
          question: faq.question,
          containsBeta: false,
        });
      }
    });
  });
});
