import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="py-14 sm:py-16 bg-[#F4F1E8] text-[#003B24] border-t border-[#DDD4C1]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left: Copy */}
          <div className="lg:col-span-5">
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-2">
              MONTHLY TRAIL LOG
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#003B24] mb-2">
              KEEP EXPLORING
            </h2>
            <p className="text-sm text-[#003B24]/70 font-sans leading-relaxed">
              Stories, trails and journeys worth knowing about.
            </p>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#003B24] text-[#F4F1E8]">
                <CheckCircle2 className="w-5 h-5 text-[#B89A5A] shrink-0" />
                <div>
                  <p className="font-display text-base">You're on the manifest.</p>
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
                  className="flex-1 px-4 py-3 rounded-lg border border-[#DDD4C1] bg-white text-sm text-[#003B24] placeholder-[#003B24]/40 focus:outline-none focus:border-[#003B24] transition-colors font-sans"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-lg bg-[#003B24] hover:bg-[#075333] text-[#F4F1E8] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
            <p className="text-[11px] text-[#003B24]/45 font-mono mt-2">
              🔒 10,000+ wanderers subscribed. No spam, ever.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
