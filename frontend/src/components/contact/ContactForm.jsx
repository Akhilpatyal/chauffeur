import React, { useRef, useState } from 'react';
import { CircleCheckBig, Send } from 'lucide-react';
import { enquiryTopics } from '../../data/contact';
import { submitLead, idempotencyKey } from '../../lib/api';
import { RidgeMark } from './contactUi';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  topic: enquiryTopics[0],
  dates: '',
  travellers: '',
  message: '',
};

const inputClass =
  'w-full rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] px-3.5 py-3 text-[13px] text-[#012C18] outline-none transition-colors placeholder:text-[#9AA29B] focus:border-[#075333]';

const labelClass =
  'block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C857E]';

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Please tell us your name.';
  if (!values.email.trim()) errors.email = 'We need an email to reply to.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
    errors.email = 'That email address does not look right.';
  if (values.phone.trim() && !/^[\d\s+()-]{7,20}$/.test(values.phone.trim()))
    errors.phone = 'Use digits, spaces and + ( ) - only.';
  if (!values.message.trim()) errors.message = 'A line or two about your trip helps.';
  return errors;
}

/*
 * Enquiry form.
 *
 * Submits to POST /api/v1/leads. The same idempotency key is reused across
 * retries of one attempt, so a second click or a retry after a dropped
 * connection cannot create a second lead; it is regenerated only once a
 * submission succeeds.
 */
export default function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  /* Filled only by bots. Hidden from sight and from screen readers. */
  const honeypot = useRef('');
  /* Stable for the lifetime of one attempt, so retries are deduplicated. */
  const attemptKey = useRef(idempotencyKey());

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`contact-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitLead(
        {
          source: 'contact_form',
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
          topic: values.topic,
          travelDates: values.dates.trim() || undefined,
          groupSize: values.travellers.trim() || undefined,
          message: values.message.trim(),
          honeypot: honeypot.current,
        },
        attemptKey.current,
      );

      setSent(true);
    } catch (error) {
      /* Server-side validation is authoritative; surface it on the fields. */
      if (error.fields) {
        const mapped = { ...error.fields };
        if (mapped.travelDates) mapped.dates = mapped.travelDates;
        if (mapped.groupSize) mapped.travellers = mapped.groupSize;
        setErrors(mapped);
        document.getElementById(`contact-${Object.keys(mapped)[0]}`)?.focus();
      }
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-8 text-center sm:p-12">
        <RidgeMark className="pointer-events-none absolute -bottom-3 left-1/2 h-20 w-[320px] -translate-x-1/2 text-[#012C18] opacity-[0.07]" />

        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#043A25]">
          <CircleCheckBig className="h-5 w-5 text-[#B89A5A]" />
        </span>

        <h3 className="mt-5 font-display text-[26px] text-[#012C18]">
          Message on its way, {values.name.split(' ')[0]}.
        </h3>
        <p className="mx-auto mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-[#5E6B63]">
          A trip planner will reply to{' '}
          <span className="font-semibold text-[#012C18]">{values.email}</span> within two
          working hours. If it is urgent, call us and we will pick up.
        </p>

        <button
          type="button"
          onClick={() => {
            setValues(EMPTY);
            setSent(false);
            setSubmitError(null);
            // A genuinely new enquiry needs a new key, or the backend would
            // replay the previous result.
            attemptKey.current = idempotencyKey();
          }}
          className="mt-6 rounded-lg border border-[#C9C2B0] px-6 py-3 text-[12px] font-semibold text-[#012C18] transition-colors hover:border-[#043A25] hover:bg-[#043A25]/5"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8">
      <h2 className="font-display text-[26px] leading-tight text-[#012C18] sm:text-[30px]">
        Send us a message
      </h2>
      <p className="mt-2 text-[13px] text-[#7C857E]">
        Tell us where you want to go and how you like to travel. We will come back with a
        route, not a brochure.
      </p>

      <form onSubmit={handleSubmit} noValidate className="relative mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={labelClass}>
              Full name *
            </label>
            <input
              id="contact-name"
              value={values.name}
              onChange={setField('name')}
              placeholder="Your name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              className={`mt-1.5 ${inputClass} ${errors.name ? 'border-[#D65A3A]' : ''}`}
            />
            {errors.name && (
              <p id="contact-name-error" className="mt-1 text-[11px] text-[#D65A3A]">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-email" className={labelClass}>
              Email *
            </label>
            <input
              id="contact-email"
              type="email"
              value={values.email}
              onChange={setField('email')}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              className={`mt-1.5 ${inputClass} ${errors.email ? 'border-[#D65A3A]' : ''}`}
            />
            {errors.email && (
              <p id="contact-email-error" className="mt-1 text-[11px] text-[#D65A3A]">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={values.phone}
              onChange={setField('phone')}
              placeholder="+91 ..."
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
              className={`mt-1.5 ${inputClass} ${errors.phone ? 'border-[#D65A3A]' : ''}`}
            />
            {errors.phone && (
              <p id="contact-phone-error" className="mt-1 text-[11px] text-[#D65A3A]">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="contact-topic" className={labelClass}>
              I&rsquo;m interested in
            </label>
            <select
              id="contact-topic"
              value={values.topic}
              onChange={setField('topic')}
              className={`mt-1.5 ${inputClass} appearance-none`}
            >
              {enquiryTopics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contact-dates" className={labelClass}>
              Travel dates
            </label>
            <input
              id="contact-dates"
              value={values.dates}
              onChange={setField('dates')}
              placeholder="e.g. 12 – 18 Dec, or flexible"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="contact-travellers" className={labelClass}>
              Travellers
            </label>
            <input
              id="contact-travellers"
              value={values.travellers}
              onChange={setField('travellers')}
              placeholder="e.g. 2 adults"
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className={labelClass}>
            Your message *
          </label>
          <textarea
            id="contact-message"
            rows={5}
            value={values.message}
            onChange={setField('message')}
            placeholder="Where would you like to go, and what would make the trip worth it?"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
            className={`mt-1.5 resize-y ${inputClass} ${errors.message ? 'border-[#D65A3A]' : ''}`}
          />
          {errors.message && (
            <p id="contact-message-error" className="mt-1 text-[11px] text-[#D65A3A]">
              {errors.message}
            </p>
          )}
        </div>

        {/*
          Honeypot. Hidden from sight and from assistive technology, so only an
          automated form-filler will put anything in it. tabIndex keeps it out
          of the keyboard order.
        */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
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
            className="rounded-lg border border-[#E7C4B8] bg-[#FDF1EE] px-3.5 py-3 text-[12.5px] text-[#B4472A]"
          >
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#043A25] px-7 py-3.5 text-[12.5px] font-semibold text-[#FAF9F5] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#012C18] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting ? 'Sending…' : 'Send Message'}
            <Send className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <p className="text-[11px] text-[#98A09A]">
            We reply within 2 hours. No spam, ever.
          </p>
        </div>
      </form>
    </div>
  );
}
