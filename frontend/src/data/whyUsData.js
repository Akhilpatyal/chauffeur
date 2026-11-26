/*
 * The four things that make a Chaufer journey different.
 *
 * THE FIELD IS `desc`, AND THAT MATTERS
 *
 * WhyUsStorytelling renders `pillar.desc`. The previous version of this file
 * carried `subtitle` and `description` and no `desc` at all, so the body text
 * under the open pillar resolved to undefined and rendered as nothing — the
 * section had been showing four bare headings for as long as it has existed.
 *
 * WHAT WAS REMOVED
 *
 * The old records also carried `stats` and `tags` that nothing rendered:
 * "99.9% Trip Safety Record", "100% Native Expedition Leaders", "40+ Boutique
 * Heritage Homestays". None of those are measured anywhere, and they are the
 * same class of claim as the invented ratings already stripped out of the trip
 * data. They are gone rather than carried forward unused, so nobody wires them
 * into a page later believing they were checked.
 */
export const whyUsStages = [
  {
    step: '01',
    title: 'LOCAL KNOWLEDGE',
    desc: 'Go beyond the familiar with local insights, authentic connections and people who know the land.',
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: '02',
    title: 'EVERY DETAIL, CONSIDERED',
    desc: 'Thoughtfully selected stays, experiences and routes come together to make every journey count.',
    image:
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: '03',
    title: 'BETTER TOGETHER',
    desc: 'Travel in thoughtfully sized groups where shared experiences become lasting connections.',
    image:
      'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    step: '04',
    title: 'THERE WHEN YOU NEED US',
    desc: "From the first plan to the final stop, we're here to make your journey feel seamless and supported.",
    image:
      'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80',
  },
];
