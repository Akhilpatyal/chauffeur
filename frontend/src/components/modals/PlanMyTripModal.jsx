import React, { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Sparkles, MapPin, Calendar, DollarSign, Users, Mail, Phone, User } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';

export default function PlanMyTripModal({ isOpen, onClose }) {
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

  if (!isOpen) return null;

  const destinations = ['Spiti Valley', 'Kashmir Valley', 'Leh Ladakh', 'Meghalaya', 'Rajasthan', 'Kerala', 'Uttarakhand', 'Surprise Me'];
  const vibes = ['High Mountain Trek', 'Slow Quiet Retreat', 'Overland 4x4 Road Trip', 'Cultural Heritage', 'Off-Grid Wilderness'];
  const durations = ['3–5 Days (Weekend/Short)', '6–8 Days (Classic)', '9–12 Days (Deep Expedition)', '14+ Days (Grand Traverse)'];
  const budgets = ['₹15,000 – ₹25,000 / person', '₹25,000 – ₹45,000 / person', '₹45,000 – ₹80,000 / person', 'Luxury Custom Budget'];

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
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
              Plan Your Bespoke Escape
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
            <form onSubmit={handleSubmit} className="space-y-6">
              
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
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    Submit Itinerary Request
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
