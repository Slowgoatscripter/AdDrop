import Image from 'next/image';
import { Building, User, Users } from 'lucide-react';

const personas = [
  {
    icon: User,
    title: 'Solo Agents',
    description:
      'You handle everything — listings, showings, negotiations, AND marketing. AdDrop helps you produce campaigns faster.',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80',
  },
  {
    icon: Users,
    title: 'Team Leaders',
    description:
      'Your agents need consistent, branded ad campaigns fast. AdDrop ensures every listing gets the same professional treatment.',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80',
  },
  {
    icon: Building,
    title: 'Brokerages',
    description:
      'Dozens of listings, multiple agents, compliance requirements. AdDrop standardizes your marketing while saving your team significant time.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
  },
];

export function WhoItsFor() {
  return (
    <section className="py-24 px-6 border-t border-border/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-16">
          Made for Every Agent
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <div
              key={persona.title}
              className="bg-surface rounded-xl overflow-hidden group"
            >
              {/* Image top section */}
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={persona.image}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
              </div>

              {/* Gold icon badge overlapping image bottom */}
              <div className="relative -mt-6 ml-6">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <persona.icon className="w-6 h-6 text-gold" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-3">
                <h3 className="font-serif text-xl text-cream mb-2">
                  {persona.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {persona.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
