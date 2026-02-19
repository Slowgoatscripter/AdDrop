'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import type { FAQItem as FAQItemType } from '@/lib/types/settings';
import { getSupportedStatesText } from '@/lib/compliance/supported-states';

const defaultFaqs: FAQItemType[] = [
  {
    question: 'Is AdDrop really free?',
    answer:
      'Yes — AdDrop is completely free during beta. Create a free account, get 2 campaigns per week, and never see a credit card form. We want you to try it and tell us what you think.',
  },
  {
    question: 'Why do I need an account?',
    answer:
      'Your account lets us save your campaigns, track your usage, and give you a dashboard to manage everything. Sign up with email and password. No credit card, no commitments.',
  },
  {
    question: 'What information do I need to get started?',
    answer:
      'Just your property address, a few photos, and basic details like beds, baths, and price. Typically ready in a few minutes, depending on listing complexity.',
  },
  {
    question: 'How does the AI know what to write?',
    answer:
      "AdDrop's AI is designed for real estate marketing workflows. It understands platform best practices, character limits, tone variations, and fair housing compliance. It writes ads designed to sound polished and professional.",
  },
  {
    question: 'Is the ad copy compliant with fair housing laws?',
    answer: `AdDrop includes built-in compliance checking that helps identify and suggests corrections for problematic language. Currently supports ${getSupportedStatesText()} MLS requirements, with more states planned.`,
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

const propertyImages = [
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&q=80',
  'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&q=80',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400&q=80',
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gold/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left group"
      >
        <span className="text-cream font-medium text-lg group-hover:text-gold transition-colors duration-200">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 ml-4 transition-all duration-200 ${
            open ? 'rotate-180 text-gold' : 'text-muted-foreground'
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

interface FAQProps {
  faqs?: FAQItemType[];
}

const COMPLIANCE_QUESTION = 'Is the ad copy compliant with fair housing laws?';

function getDynamicFaqs(faqs: FAQItemType[]): FAQItemType[] {
  return faqs.map((faq) =>
    faq.question === COMPLIANCE_QUESTION
      ? {
          ...faq,
          answer: `AdDrop includes built-in compliance checking that helps identify and suggests corrections for problematic language. Currently supports ${getSupportedStatesText()} MLS requirements, with more states planned.`,
        }
      : faq
  );
}

export function FAQ({ faqs = defaultFaqs }: FAQProps) {
  const resolvedFaqs = getDynamicFaqs(faqs);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-16">
          Questions? We&apos;ve Got Answers.
        </h2>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12">
          {/* Left: Property images (desktop only) */}
          <div className="hidden lg:flex flex-col gap-4">
            {propertyImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-gold/15"
              >
                <Image
                  src={image}
                  fill
                  className="object-cover"
                  sizes="40vw"
                  alt=""
                />
              </div>
            ))}
          </div>

          {/* Right: FAQ accordion */}
          <div>
            <div className="border-t border-gold/10">
              {resolvedFaqs.map((faq) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
