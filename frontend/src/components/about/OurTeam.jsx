import React from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { team } from '../../data/team';
import { useGsapScope } from '../../animations/useGsapScope';
import { Eyebrow, SocialIcon } from './aboutUi';

const networks = ['facebook', 'instagram', 'linkedin'];

export default function OurTeam({ onMeetTeam }) {
  const scope = useGsapScope(() => {
    gsap.fromTo(
      '.team-intro > *',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.team-root', start: 'top 80%', once: true },
      }
    );

    gsap.fromTo(
      '.team-card',
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.team-grid', start: 'top 85%', once: true },
      }
    );
  });

  return (
    <section ref={scope} className="team-root bg-[#012C18] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,2fr)] lg:items-center lg:gap-14">
          {/* Intro */}
          <div className="team-intro">
            <Eyebrow tone="gold">Our Team</Eyebrow>
            <h2 className="mt-4 font-display text-[30px] leading-[1.14] text-[#F4F1E8] sm:text-[38px] lg:text-[40px]">
              The people behind
              <br />
              your journeys
            </h2>
            <p className="mt-5 max-w-[340px] text-[13px] leading-[1.8] text-[#DDD4C1]/70 sm:text-[13.5px]">
              A passionate team of explorers, planners, storytellers and mountain lovers
              working round the clock to craft unforgettable experiences for you.
            </p>
            <button
              type="button"
              onClick={onMeetTeam}
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#B89A5A] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#012C18] transition-colors hover:bg-[#A88849]"
            >
              Meet The Team
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Cards */}
          <div className="team-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <article
                key={member.id}
                className="team-card group relative h-[300px] overflow-hidden rounded-xl sm:h-[340px] lg:h-[360px]"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02170F] via-[#02170F]/45 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-display text-[18px] leading-tight text-[#F4F1E8]">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-[#B89A5A]">
                    {member.role}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-[#DDD4C1]/70">
                    {member.bio}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    {networks.map((network) => (
                      <a
                        key={network}
                        href={member.social[network] || '#'}
                        aria-label={`${member.name} on ${network}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/12 text-[#F4F1E8] transition-colors hover:bg-[#B89A5A] hover:text-[#012C18]"
                      >
                        <SocialIcon network={network} className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
