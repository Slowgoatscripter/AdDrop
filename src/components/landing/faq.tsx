'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const faqs = [
  {
    question: 'Is AdDrop really free?',
    answer:
      'Yes — AdDrop is completely free during our beta period. No account, no credit card, no catch. We want you to try it and tell us what you think.',
  },
  {
    question: 'What information do I need to get started?',
    answer:
      'Just your MLS number. AdDrop pulls the property details automatically. You can also enter property details manually if you prefer.',
  },
  {
    question: 'How does the AI know what to write?',
    answer:
      "AdDrop's AI is trained specifically for real estate marketing. It understands platform best practices, character limits, tone variations, and fair housing compliance. It writes ads that sound like they came from a professional copywriter.",
  },
  {
    question: 'Is the ad copy compliant with fair housing laws?',
    answer:
      'AdDrop includes built-in compliance checking that automatically flags and corrects problematic language. Currently optimized for Montana MLS requirements, with more states coming soon.',
  },
  {
    question: 'Can I edit the generated ads?',
    answer:
      'Absolutely. Every ad is fully editable. Use the AI output as a starting point and customize it to match your voice and brand.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      "Instagram, Facebook, Google Ads, Twitter/X, Zillow, Realtor.com, print ads, direct mail postcards, magazine ads, and more. We're adding new platforms regularly.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left group"
      >
        <span className="text-base font-medium group-hover:text-gold transition-colors duration-200">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 ml-4 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-40 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Questions? We&apos;ve Got Answers.
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Everything you need to know about AdDrop.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="border-t border-border/50">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
