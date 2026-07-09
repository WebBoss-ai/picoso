'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Leaf } from 'lucide-react';
import { agentRef } from '@/lib/api';

const WA_NUMBER = '918167080111';
const WA_MESSAGE = 'Hi! I just scanned your QR! Could you please share your menu?';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

export default function LeadCapturePage() {
  const { agentCode } = useParams();
  const [phase, setPhase] = useState('loading'); // loading | redirecting | invalid

  useEffect(() => {
    const init = async () => {
      if (!agentCode) { setPhase('invalid'); return; }
      try {
        // Track the scan for agent commission attribution (fire-and-forget)
        agentRef.trackScan(agentCode).catch(() => {});
        setPhase('redirecting');
        // Auto-redirect to WhatsApp; slight delay lets the page paint first
        setTimeout(() => { window.location.href = WA_URL; }, 600);
      } catch {
        setPhase('invalid');
      }
    };
    init();
  }, [agentCode]);

  if (phase === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-white text-xl font-bold mb-2">Invalid Link</h1>
        <p className="text-emerald-200/60 text-sm mb-6">This referral link is no longer active.</p>
        <a href="/" className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-medium text-sm hover:bg-emerald-400 transition-all">
          Visit Picoso
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col items-center justify-center px-5">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 max-w-sm w-full text-center">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <span className="text-white text-sm font-medium">Picoso Foods</span>
        </div>

        {/* WhatsApp icon + pulse ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#25D366]/20 animate-ping" />
          <div className="relative bg-[#25D366] rounded-full p-5 shadow-2xl shadow-[#25D366]/40">
            {/* WhatsApp logo */}
            <svg viewBox="0 0 32 32" className="w-10 h-10 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.003 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.352.636 4.558 1.742 6.46L2.667 29.333l7.085-1.718A13.28 13.28 0 0 0 16.003 29.333c7.363 0 13.33-5.97 13.33-13.333 0-7.363-5.967-13.333-13.33-13.333zm0 24.222a10.87 10.87 0 0 1-5.545-1.516l-.398-.236-4.207 1.02.998-4.097-.26-.42A10.855 10.855 0 0 1 5.111 16c0-5.999 4.893-10.889 10.892-10.889S26.889 10.001 26.889 16c0 5.999-4.886 10.889-10.886 10.889zm5.972-8.148c-.327-.165-1.934-.954-2.234-1.063-.299-.11-.516-.165-.734.165-.218.33-.842 1.063-1.032 1.282-.19.218-.38.247-.707.082-.327-.165-1.381-.509-2.63-1.622-.972-.867-1.629-1.937-1.819-2.264-.19-.327-.02-.504.143-.667.147-.147.327-.383.49-.574.164-.19.218-.328.328-.546.109-.218.054-.41-.028-.574-.082-.165-.734-1.77-1.006-2.424-.265-.636-.535-.55-.734-.56l-.625-.01c-.218 0-.572.082-.871.41-.299.328-1.142 1.117-1.142 2.722s1.169 3.158 1.332 3.376c.163.218 2.3 3.514 5.573 4.928.779.336 1.386.537 1.861.687.782.249 1.494.214 2.057.13.627-.094 1.934-.79 2.207-1.554.272-.765.272-1.42.19-1.554-.08-.136-.299-.218-.625-.383z"/>
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          {phase === 'loading' ? (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
          ) : (
            <>
              <h1 className="text-white text-2xl font-bold">Opening WhatsApp…</h1>
              <p className="text-emerald-200/70 text-sm leading-relaxed">
                You'll be connected to Picoso Foods instantly.
              </p>
            </>
          )}
        </div>

        {/* CTA button — fallback if auto-redirect is blocked */}
        {phase === 'redirecting' && (
          <a
            href={WA_URL}
            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5c] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-[#25D366]/30 text-base"
          >
            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.003 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.352.636 4.558 1.742 6.46L2.667 29.333l7.085-1.718A13.28 13.28 0 0 0 16.003 29.333c7.363 0 13.33-5.97 13.33-13.333 0-7.363-5.967-13.333-13.33-13.333zm0 24.222a10.87 10.87 0 0 1-5.545-1.516l-.398-.236-4.207 1.02.998-4.097-.26-.42A10.855 10.855 0 0 1 5.111 16c0-5.999 4.893-10.889 10.892-10.889S26.889 10.001 26.889 16c0 5.999-4.886 10.889-10.886 10.889zm5.972-8.148c-.327-.165-1.934-.954-2.234-1.063-.299-.11-.516-.165-.734.165-.218.33-.842 1.063-1.032 1.282-.19.218-.38.247-.707.082-.327-.165-1.381-.509-2.63-1.622-.972-.867-1.629-1.937-1.819-2.264-.19-.327-.02-.504.143-.667.147-.147.327-.383.49-.574.164-.19.218-.328.328-.546.109-.218.054-.41-.028-.574-.082-.165-.734-1.77-1.006-2.424-.265-.636-.535-.55-.734-.56l-.625-.01c-.218 0-.572.082-.871.41-.299.328-1.142 1.117-1.142 2.722s1.169 3.158 1.332 3.376c.163.218 2.3 3.514 5.573 4.928.779.336 1.386.537 1.861.687.782.249 1.494.214 2.057.13.627-.094 1.934-.79 2.207-1.554.272-.765.272-1.42.19-1.554-.08-.136-.299-.218-.625-.383z"/>
            </svg>
            Open WhatsApp
          </a>
        )}

        <p className="text-white/25 text-xs">Picoso Foods · Fresh cloud kitchen</p>
      </div>
    </div>
  );
}
