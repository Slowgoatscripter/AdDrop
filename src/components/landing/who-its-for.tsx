import { Building, User, Users } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

const personas = [
  {
    icon: User,
    title: 'Solo Agents',
    description:
      'You handle everything — listings, showings, negotiations, AND marketing. AdDrop gives you a marketing department in 30 seconds.',
  },
  {
    icon: Users,
    title: 'Team Leaders',
    description:
      'Your agents need consistent, branded ad campaigns fast. AdDrop ensures every listing gets the same professional treatment.',
  },
  {
    icon: Building,
    title: 'Brokerages',
    description:
      'Dozens of listings, multiple agents, compliance requirements. AdDrop standardizes your marketing while saving your team hundreds of hours.',
  },
];

export function WhoItsFor() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Made for Every Agent
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Whether you&apos;re solo or running a team, AdDrop scales with you.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {personas.map((persona, index) => (
            <ScrollReveal key={persona.title} delay={index * 0.15}>
              <div className="group p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 text-center">
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <persona.icon className="w-6 h-6 text-gold group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{persona.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {persona.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
