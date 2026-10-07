import React, { useRef, useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';
import { submitLead, idempotencyKey } from '../../lib/api';

/*
 * Multi-step bespoke-trip request, and the enquiry form behind every
 * "Check availability" / "Plan a journey" button on the site.
 *
 * Submits to POST /api/v1/leads. The structured answers go in
 * `tripPreferences` rather than being flattened into the message, so the
 * dashboard can report on which destinations and budgets people ask for.
 *
 * `interest` is what the visitor was looking at when they clicked — a journey,
 * a weekend escape, a stay, a group tour. Without it every enquiry arrives as
 * an identical "Custom expedition" row and the dashboard cannot tell you which
 * trips people actually ask about. It also pre-fills step 1 and lets the modal
 * open straight on the contact step, because someone who clicked "Check
 * availability" on a specific trip has already told us where they want to go.
 */
export default function PlanMyTripModal({
  isOpen,
  onClose,
  interest = null,
  source = 'plan_my_trip',
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    destination: '',
    vibe: '',
    duration: '6–8 Days',
    budget: '₹20,000 – ₹35,000',
    travelers: '2 Travelers',
    month: 'Jun – Jul 2026',
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const honeypot = useRef('');

  /*
   * One idempotency key per attempt: re-submitting after an error must not
   * create a second lead, but a genuinely new enquiry needs a new key. It is
   * state rather than a ref because it is reset below during render.
   */
  const [attemptKey, setAttemptKey] = useState(idempotencyKey);

  /*
   * Re-arm whenever the modal is reopened, or opened against a different trip.
   * Without this, closing a submitted enquiry and opening another one would
   * show the previous success panel and replay the first lead's key, so the
   * second enquiry would never be stored.
   *
   * This is React's documented "adjust state when a prop changes" pattern:
   * setting state during render re-runs the component before the browser
   * paints, so the modal never flashes the previous enquiry's state the way an
   * effect-based reset would.
   */
  const [openedFor, setOpenedFor] = useState(null);
  const openKey = isOpen ? `${source}:${interest?.slug ?? ''}` : null;

  if (isOpen && openedFor !== openKey) {
    setOpenedFor(openKey);
    setAttemptKey(idempotencyKey());
    setIsSubmitted(false);
    setSubmitError(null);
    /* A known trip answers step 1 and 2, so start where we still need input. */
    setStep(interest?.title ? 3 : 1);
    setFormData((current) => ({
      ...current,
      destination: interest?.destination ?? interest?.title ?? current.destination,
    }));
  }

  if (!isOpen) return null;

  const destinations = ['Spiti Valley', 'Kashmir Valley', 'Leh Ladakh', 'Meghalaya', 'Rajasthan', 'Kerala', 'Uttarakhand', 'Surprise Me'];
  const vibes = ['High Mountain Trek', 'Slow Quiet Retreat', 'Overland 4x4 Road Trip', 'Cultural Heritage', 'Off-Grid Wilderness'];
  const durations = ['3–5 Days (Weekend/Short)', '6–8 Days (Classic)', '9–12 Days (Deep Expedition)', '14+ Days (Grand Traverse)'];
  const budgets = ['₹15,000 – ₹25,000 / person', '₹25,000 – ₹45,000 / person', '₹45,000 – ₹80,000 / person', 'Luxury Custom Budget'];

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitLead(
        {
          source,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          /* The dashboard shows `topic` in its list column, so it names the
             trip when we know it rather than saying "Custom expedition". */
          topic: interest?.title ?? 'Custom expedition',
          message: formData.notes.trim() || undefined,
          interest: interest
            ? { kind: interest.kind, slug: interest.slug, title: interest.title }
            : undefined,
          tripPreferences: {
            destination: formData.destination || undefined,
            vibe: formData.vibe || undefined,
            duration: formData.duration || undefined,
            budget: formData.budget || undefined,
            month: formData.month || undefined,
          },
          honeypot: honeypot.current,
        },
        attemptKey,
      );

      setIsSubmitted(true);
    } catch (error) {
      /*
       * The contact fields all live on step 3, so sending the visitor back
       * there is enough to let them fix whatever the server rejected.
       */
      if (error.fields) setStep(3);
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#FAF9F5] rounded-3xl sm:rounded-[32px] border border-[#E3DDCB] shadow-2xl overflow-hidden text-[#012C18] flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-[#043A25] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#B89A5A] font-mono mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CUSTOM EXPEDITION CONCIERGE</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl text-[#F4F1E8]">
              {interest?.title ? `Enquire: ${interest.title}` : 'Plan Your Bespoke Escape'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {isSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#075333]/20 text-[#075E68] flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="font-display text-2xl text-[#043A25]">
                Your Journey Blueprint is in Motion!
              </h4>
              <p className="text-sm text-[#012C18]/75 max-w-md mx-auto leading-relaxed">
                Our senior expedition curator is crafting a personalized itinerary for <strong>{formData.destination || 'your frontier'}</strong>. We will reach out to <strong>{formData.phone || formData.email}</strong> within 24 hours.
              </p>
              <div className="pt-4">
                <MagneticButton variant="primary" size="md" onClick={onClose}>
                  Back to Exploration
                </MagneticButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative space-y-6">
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between border-b border-[#E3DDCB] pb-4">
                <span className="text-xs font-mono font-bold text-[#075E68] uppercase tracking-wider">
                  Step {step} of 3
                </span>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-8 h-1.5 rounded-full transition-all ${
                        s <= step ? 'bg-[#075E68]' : 'bg-[#E3DDCB]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step 1: Destination & Vibe */}
              {step === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-2">
                      Where would you like to wander?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {destinations.map((dest) => (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => setFormData({ ...formData, destination: dest })}
                          className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                            formData.destination === dest
                              ? 'bg-[#043A25] text-white border-[#043A25] shadow-xs'
                              : 'bg-white text-[#012C18]/80 border-[#E3DDCB] hover:border-[#043A25]'
                          }`}
                        >
                          {dest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-2">
                      What energy are you seeking?
                    </label>
                    <div className="space-y-2">
                      {vibes.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormData({ ...formData, vibe: v })}
                          className={`w-full p-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                            formData.vibe === v
                              ? 'bg-[#075E68] text-white border-[#075E68]'
                              : 'bg-white text-[#012C18]/80 border-[#E3DDCB] hover:border-[#075E68]'
                          }`}
                        >
                          <span>{v}</span>
                          {formData.vibe === v && <Check className="w-4 h-4 text-[#B89A5A]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Duration, Budget & Travelers */}
              {step === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-2">
                      Trip Duration
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {durations.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormData({ ...formData, duration: d })}
                          className={`p-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                            formData.duration === d
                              ? 'bg-[#043A25] text-white border-[#043A25]'
                              : 'bg-white text-[#012C18]/80 border-[#E3DDCB] hover:border-[#043A25]'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-2">
                      Estimated Budget Preference
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {budgets.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormData({ ...formData, budget: b })}
                          className={`p-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                            formData.budget === b
                              ? 'bg-[#075E68] text-white border-[#075E68]'
                              : 'bg-white text-[#012C18]/80 border-[#E3DDCB] hover:border-[#075E68]'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Contact & Traveler Details */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Iyer"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDCB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#043A25]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 00000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDCB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#043A25]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="maya@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDCB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#043A25]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#043A25] block mb-1">
                      Special requests / preferences (Optional)
                    </label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Vegetarian meals, stargazing dome preference, traveling with parents..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-[#E3DDCB] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#043A25]"
                    ></textarea>
                  </div>
                </div>
              )}

              {/*
                Honeypot: hidden from sight and from assistive technology, so
                only an automated form-filler will populate it.
              */}
              <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="plan-website">Website</label>
                <input
                  id="plan-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  onChange={(event) => {
                    honeypot.current = event.target.value;
                  }}
                />
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#E7C4B8] bg-[#FDF1EE] px-4 py-3 text-xs text-[#B4472A]"
                >
                  {submitError}
                </p>
              )}

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E3DDCB]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#043A25] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-full bg-[#043A25] hover:bg-[#075E68] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <MagneticButton
                    type="submit"
                    variant="coral"
                    size="md"
                    disabled={submitting}
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    {submitting ? 'Sending…' : 'Submit Itinerary Request'}
                  </MagneticButton>
                )}
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
