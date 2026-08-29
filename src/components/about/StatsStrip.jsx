import React from 'react';
import gsap from 'gsap';
import { aboutStats } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { AboutIcon } from './aboutUi';

export default function StatsStrip() {
  const scope = useGsapScope(() => {
    /* Count each value up once the strip enters the viewport */
    gsap.utils.toArray('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter);
      const decimals = Number.isInteger(target) ? 0 : 1;
      const proxy = { value: 0 };

      gsap.to(proxy, {
        value: target,
        duration: 1.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.stats-root', start: 'top 85%', once: true },
        onUpdate: () => {
          el.textContent = proxy.value.toFixed(decimals);
        },
      });
    });

    gsap.fromTo(
      '.stat-item',
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.stats-root', start: 'top 85%', once: true },
      }
    );
  });

  return (
    <section ref={scope} className="stats-root bg-[#012C18] py-10 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {aboutStats.map((stat) => (
            <li key={stat.label} className="stat-item flex items-center gap-3">
              <AboutIcon
                name={stat.icon}
                className="h-6 w-6 shrink-0 text-[#B89A5A] sm:h-7 sm:w-7"
                strokeWidth={1.3}
              />
              <div>
                <p className="font-display text-[26px] leading-none text-[#F4F1E8] sm:text-[30px]">
                  <span data-counter={stat.value}>{stat.value}</span>
                  {stat.suffix}
                </p>
                <p className="mt-1.5 text-[11.5px] text-[#DDD4C1]/70">{stat.label}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
