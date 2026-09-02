'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Star, BedDouble, Loader2 } from 'lucide-react';
import { stay } from '@/lib/api';
import { formatINR } from '@/lib/stayUtils';
import { StayNav, StayShell, PayAtPropertyBadge } from '@/components/stay/StayChrome';

export default function DestinationPage() {
  const { destination } = useParams();
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [destMeta, setDestMeta] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      stay.getDestinations(),
      stay.getProperties(destination),
      stay.getCategories(),
    ])
      .then(([destRes, propRes, catRes]) => {
        const dest = destRes.data.find((d) => (d.id || d.slug) === destination);
        if (!dest?.available) {
          router.replace('/stay');
          return;
        }
        setDestMeta(dest);
        setProperties(propRes.data);
        setCategories(catRes.data);
      })
      .catch(() => router.replace('/stay'))
      .finally(() => setLoading(false));
  }, [destination, router]);

  const filtered = useMemo(() => {
    if (filter === 'all') return properties;
    return properties.filter((p) => p.category === filter);
  }, [properties, filter]);

  if (loading) {
    return (
      <StayShell>
        <StayNav />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 text-turtle-600 animate-spin" /></div>
      </StayShell>
    );
  }

  return (
    <StayShell>
      <StayNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="pt-6 sm:pt-8 mb-8">
          <Link href="/stay" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-turtle-700 mb-5">
            <ArrowLeft size={14} /> All destinations
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-turtle-600">Destination</p>
              <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight mt-1">{destMeta?.name}</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-lg">{destMeta?.tagline}</p>
            </div>
            <PayAtPropertyBadge />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.id || c.slug} active={filter === (c.id || c.slug)} onClick={() => setFilter(c.id || c.slug)}>
              {c.name}
            </FilterChip>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const minPrice = Math.min(...(p.rooms?.map((r) => r.price) || [0]));
            const roomsLeft = p.rooms?.reduce((s, r) => s + r.available, 0) || 0;
            return (
              <Link key={p.id} href={`/stay/${destination}/${p.id}`} className="group rounded-[1.35rem] border border-gray-200 bg-white overflow-hidden hover:border-turtle-300 transition-colors">
                <div className="relative aspect-[16/11] overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${p.images?.[0]})` }} />
                  <div className="absolute top-3 left-3"><PayAtPropertyBadge className="!bg-white/95 !border-white" /></div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-white/95 border border-gray-100 text-[11px] font-semibold text-gray-700">{roomsLeft} rooms left</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-turtle-600 mb-1">{categories.find((c) => (c.id || c.slug) === p.category)?.name || p.category}</p>
                      <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight truncate">{p.name}</h2>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-800 shrink-0">
                      <Star size={12} className="text-turtle-500 fill-turtle-500" />{p.rating}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{p.tagline}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400"><MapPin size={12} /> {p.location}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatINR(minPrice)}<span className="text-xs font-normal text-gray-400"> /night</span></span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <BedDouble size={12} /> {p.rooms?.length || 0} room types
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </StayShell>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 h-9 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${active ? 'bg-turtle-600 border-turtle-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-turtle-300'}`}>
      {children}
    </button>
  );
}
