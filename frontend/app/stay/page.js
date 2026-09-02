'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Leaf, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { stay } from '@/lib/api';
import { StayNav, StayShell, PayAtPropertyBadge } from '@/components/stay/StayChrome';

export default function StayHomePage() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stay.getDestinations()
      .then((res) => setDestinations(res.data))
      .catch(() => setDestinations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StayShell>
      <StayNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <section className="pt-10 sm:pt-16 pb-12 sm:pb-16">
          <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white min-h-[420px] sm:min-h-[520px]">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
            <div className="relative h-full min-h-[420px] sm:min-h-[520px] flex flex-col justify-end p-6 sm:p-10 md:p-14">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <PayAtPropertyBadge className="!bg-white/10 !border-white/20 !text-white backdrop-blur-sm" />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] font-semibold text-white/90">
                  <Leaf size={12} /> Top 20 nature stays
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight max-w-xl leading-[1.05]">Picoso Stay</h1>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/75 max-w-md leading-relaxed">
                Discover exceptional stays for nature lovers — book now, pay when you arrive.
              </p>
              <div className="mt-7">
                <a href="#destinations" className="h-11 px-5 rounded-2xl bg-turtle-500 hover:bg-turtle-400 text-white text-sm font-semibold inline-flex items-center gap-2">
                  Explore destinations <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12 grid sm:grid-cols-3 gap-3">
          {[
            { title: 'Pay at property', body: 'No advance payment. Visit, experience, then settle at the stay.', icon: Sparkles },
            { title: 'Check-in OTP', body: 'A 4-digit code at booking — share it on arrival for seamless check-in.', icon: Leaf },
            { title: 'Curated for nature', body: 'Cabins, cottages, glamping & homestays chosen for quiet & forests.', icon: MapPin },
          ].map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="w-9 h-9 rounded-xl bg-turtle-50 border border-turtle-100 flex items-center justify-center text-turtle-700 mb-3">
                <Icon size={16} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        <section id="destinations" className="pb-20">
          <div className="mb-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-turtle-600">Destinations</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mt-1">Where will you stay?</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-turtle-600 animate-spin" /></div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {destinations.map((d) => {
                const inner = (
                  <div className={`group relative overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white aspect-[4/5] sm:aspect-[3/4] ${d.available ? 'cursor-pointer' : 'opacity-90'}`}>
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${d.image})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute top-4 left-4 right-4 flex justify-between">
                      {d.available ? (
                        <span className="px-2.5 py-1 rounded-lg bg-turtle-500 text-white text-[10px] font-semibold">Open</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-white text-[10px] font-semibold backdrop-blur-sm">Coming soon</span>
                      )}
                      {d.available && <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/25 text-white text-[10px] font-medium backdrop-blur-sm">{d.stays} stays</span>}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                      <h3 className="text-2xl font-semibold text-white tracking-tight">{d.name}</h3>
                      <p className="text-sm text-white/70 mt-1">{d.tagline}</p>
                      {d.available && <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-turtle-300">View stays <ArrowUpRight size={14} /></span>}
                    </div>
                  </div>
                );
                return d.available ? <Link key={d.id || d.slug} href={`/stay/${d.id || d.slug}`}>{inner}</Link> : <div key={d.id || d.slug}>{inner}</div>;
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Picoso Stay</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/stay/profile" className="hover:text-turtle-700">My bookings</Link>
            <Link href="/stay-owner" className="hover:text-turtle-700">Owner portal</Link>
            <Link href="/stay-admin" className="hover:text-turtle-700">Admin</Link>
          </div>
        </div>
      </footer>
    </StayShell>
  );
}
