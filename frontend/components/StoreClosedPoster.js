'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, CheckCircle2, Phone } from 'lucide-react';

/**
 * Pixel-matched "store closed" poster.
 * Uses the designed poster artwork for a same-to-same visual,
 * with an interactive notify CTA overlaid on the painted button.
 */
export default function StoreClosedPoster({
  onBack,
  notifyPhone,
  setNotifyPhone,
  notifyDone,
  notifySend,
  onNotify,
  placeholderPhone = '',
}) {
  const [showForm, setShowForm] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (notifyDone) setShowForm(false);
  }, [notifyDone]);

  useEffect(() => {
    if (!showForm) return;
    if (placeholderPhone && !notifyPhone) setNotifyPhone(placeholderPhone);
  }, [showForm, placeholderPhone, notifyPhone, setNotifyPhone]);

  const submit = async (e) => {
    e?.preventDefault();
    const phone = (notifyPhone || placeholderPhone || '').trim();
    if (!phone) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (phone !== notifyPhone) setNotifyPhone(phone);
    await onNotify(phone);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[#F5F6F1]">
      {/* Floating back — sits over poster without breaking composition */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 z-30 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0A5C3A] shadow-sm backdrop-blur-sm border border-[#0A5C3A]/10 hover:bg-white transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
        Back
      </button>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="relative mx-auto w-full max-w-[473px]">
          <Image
            src="/closed/poster.png"
            alt="Picoso — We're closed for now"
            width={473}
            height={1024}
            priority
            className="w-full h-auto block select-none pointer-events-none"
            draggable={false}
          />

          {/* Invisible hit-area over painted mint CTA — keeps artwork pixel-identical */}
          {!showForm && !notifyDone && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              aria-label="Notify me when we're back"
              className="absolute z-20 cursor-pointer rounded-full bg-transparent border-0 p-0"
              style={{
                left: '19.05%',
                width: '67.65%',
                top: '87.89%',
                height: '8.69%',
              }}
            />
          )}

          {/* Success chip after notify — sits on the painted button */}
          {notifyDone && !showForm && (
            <div
              className="absolute z-20 flex items-center justify-center rounded-full bg-[#D8F0E0] text-[#0A5C3A] font-bold shadow-sm"
              style={{
                left: '19.05%',
                width: '67.65%',
                top: '87.89%',
                height: '8.69%',
                fontSize: 'clamp(11px, 3.15vw, 14.5px)',
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} strokeWidth={2.5} />
                You&apos;re on the list!
              </span>
            </div>
          )}

          {/* Phone capture sheet — branded to footer greens */}
          {showForm && !notifyDone && (
            <div
              className="absolute inset-x-0 bottom-0 z-30 px-5 pt-6 pb-5 animate-slide-up"
              style={{
                background:
                  'radial-gradient(120% 80% at 0% 100%, rgba(0,70,40,0.35) 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, rgba(0,70,40,0.35) 0%, transparent 55%), #06784A',
                borderTopLeftRadius: '42% 18px',
                borderTopRightRadius: '42% 18px',
                boxShadow: '0 -8px 28px rgba(6, 90, 55, 0.25)',
              }}
            >
              <p className="text-center text-white text-sm font-semibold mb-3">
                We can&apos;t wait to serve you better!
              </p>

              <form onSubmit={submit} className="space-y-2.5">
                <div
                  className="relative"
                  style={shake ? { animation: 'scpShake 0.4s ease' } : undefined}
                >
                  <Phone
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#06784A]/55"
                  />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoFocus
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder={placeholderPhone || 'Your phone number'}
                    className="w-full rounded-full bg-[#F5F6F1] pl-10 pr-4 py-3 text-sm font-semibold text-[#0A5C3A] placeholder:text-[#0A5C3A]/40 outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={notifySend}
                  className="w-full rounded-full bg-[#E2EADC] text-[#0A5C3A] font-bold py-3 text-sm hover:brightness-[0.97] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {notifySend ? (
                    <span className="w-4 h-4 border-2 border-[#0A5C3A]/30 border-t-[#0A5C3A] rounded-full animate-spin" />
                  ) : null}
                  {notifySend ? 'Saving…' : "Notify me when we're back"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full text-center text-[11px] font-medium text-white/70 hover:text-white py-1"
                >
                  Cancel
                </button>
              </form>

              <p className="mt-3 text-center text-[10px] font-semibold tracking-[0.12em] text-white/85 uppercase">
                ♥ Thank you for your love &amp; support
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
