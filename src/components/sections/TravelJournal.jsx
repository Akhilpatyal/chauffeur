import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { journalArticles } from '../../data/journal';

export default function TravelJournal({ onReadArticle }) {
  const featuredArticle = journalArticles.find((a) => a.featured) || journalArticles[0];
  const sideArticles = journalArticles.filter((a) => !a.featured).slice(0, 4);

  return (
    <section id="journal" className="py-16 sm:py-20 bg-[#F4F1E8] text-[#003B24] border-t border-[#DDD4C1]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-1">
              TRAIL JOURNAL
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#003B24]">
              From the Trail Journal.
            </h2>
          </div>
          <button
            onClick={() => onReadArticle(featuredArticle)}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#003B24] hover:text-[#075333] transition-colors cursor-pointer"
          >
            <span>Explore all stories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layout: 1 Featured Large + 4 small */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Featured Article (Span 6) */}
          <div
            onClick={() => onReadArticle(featuredArticle)}
            className="lg:col-span-6 group rounded-2xl overflow-hidden bg-white border border-[#DDD4C1] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="relative h-64 sm:h-72 overflow-hidden">
              <img
                src={featuredArticle.image}
                alt={featuredArticle.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#003B24] text-[#F4F1E8] uppercase tracking-wider">
                  {featuredArticle.category}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 text-xs font-mono text-[#003B24]/60 mb-2">
                <span className="font-bold">{featuredArticle.author}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {featuredArticle.readingTime}
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl text-[#003B24] font-normal leading-snug group-hover:text-[#075333] transition-colors mb-2">
                {featuredArticle.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#003B24]/65 font-sans leading-relaxed line-clamp-2 mb-4">
                {featuredArticle.excerpt}
              </p>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B24] uppercase tracking-wider group-hover:text-[#075333] transition-colors">
                <span>Read Story</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 4 Small Articles (Span 6) */}
          <div className="lg:col-span-6 space-y-3">
            {sideArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => onReadArticle(article)}
                className="group rounded-xl bg-white border border-[#DDD4C1] hover:border-[#003B24]/35 hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 p-3.5"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-col justify-between py-0.5 flex-1">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#B89A5A] block mb-0.5">
                      {article.category}
                    </span>
                    <h4 className="font-display text-sm text-[#003B24] font-normal leading-snug group-hover:text-[#075333] transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-[#003B24]/55">{article.readingTime}</span>
                    <span className="text-[11px] font-bold text-[#003B24] group-hover:text-[#075333] transition-colors">Read →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
