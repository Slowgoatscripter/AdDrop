import { Search, Sparkles, Download } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Enter your MLS#',
    description: 'Drop in your listing number and we pull the property details automatically.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI builds your campaign',
    description: 'In seconds, get professional ad copy tailored for every platform and tone.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download & publish',
    description: 'Copy, export, or download — your ads are ready to go live immediately.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
          Three steps. That's it.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
            >
              <span className="text-5xl font-bold text-gold/10 absolute top-4 right-4">
                {step.number}
              </span>

              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-gold" />
              </div>

              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
