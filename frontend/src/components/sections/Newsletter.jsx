import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

const subscriberAvatars = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
];

/*
 * Shared across Home, Hotels and About.
 * Defaults render the ivory homepage treatment; variant="forest" is the deep
 * forest version used on the About page.
 */
export default function Newsletter({
  variant = 'ivory',
  eyebrow = 'MONTHLY TRAIL LOG',
  title = 'KEEP EXPLORING',
  subtitle = 'Stories, trails and journeys worth knowing about.',
  note = '🔒 10,000+ wanderers subscribed. No spam, ever.',
  showAvatars = false,
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isForest = variant === 'forest';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section
      className={cn(
        'py-14 sm:py-16 border-t',
        isForest
          ? 'bg-[#012C18] text-[#F4F1E8] border-white/10'
          : 'bg-[#F4F1E8] text-[#003B24] border-[#DDD4C1]'
      )}
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left: Copy */}
          <div className="lg:col-span-5">
            <span
              className={cn(
                'text-[11px] font-mono font-bold tracking-[0.2em] uppercase block mb-2',
                'text-[#B89A5A]'
              )}
            >
              {eyebrow}
            </span>
            <h2
              className={cn(
                'font-display text-3xl sm:text-4xl font-normal mb-2',
                isForest ? 'text-[#F4F1E8]' : 'text-[#003B24]'
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                'text-sm font-sans leading-relaxed',
                isForest ? 'text-[#DDD4C1]/70' : 'text-[#003B24]/70'
              )}
            >
              {subtitle}
            </p>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl',
                  isForest ? 'bg-[#043A25] text-[#F4F1E8]' : 'bg-[#003B24] text-[#F4F1E8]'
                )}
              >
                <CheckCircle2 className="w-5 h-5 text-[#B89A5A] shrink-0" />
                <div>
                  <p className="font-display text-base">You&rsquo;re on the manifest.</p>
                  <p className="text-xs text-[#DDD4C1]/80 font-mono">Welcome to TAIFER Trail Notes.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className={cn(
                    'flex-1 px-4 py-3 rounded-lg border bg-white text-sm text-[#003B24] placeholder-[#003B24]/40 focus:outline-none transition-colors font-sans',
                    isForest
                      ? 'border-transparent focus:border-[#B89A5A]'
                      : 'border-[#DDD4C1] focus:border-[#003B24]'
                  )}
                />
                <button
                  type="submit"
                  aria-label="Join the journey"
                  className={cn(
                    'px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                    isForest
                      ? 'bg-[#B89A5A] hover:bg-[#A88849] text-[#012C18]'
                      : 'bg-[#003B24] hover:bg-[#075333] text-[#F4F1E8]'
                  )}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="mt-2.5 flex items-center gap-2.5">
              {showAvatars && (
                <div className="flex -space-x-2">
                  {subscriberAvatars.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className={cn(
                        'h-5 w-5 rounded-full object-cover ring-2',
                        isForest ? 'ring-[#012C18]' : 'ring-[#F4F1E8]'
                      )}
                    />
                  ))}
                </div>
              )}
              <p
                className={cn(
                  'text-[11px] font-mono',
                  isForest ? 'text-[#DDD4C1]/55' : 'text-[#003B24]/45'
                )}
              >
                {note}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
