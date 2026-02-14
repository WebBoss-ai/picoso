'use client';

import { useEffect, useState } from 'react';
import BowlCard from '@/components/BowlCard';
import { bowls } from '@/lib/api';

export default function BowlsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await bowls.getAll();
        setData(res.data.bowls || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">
        Signature Fitness Bowls
      </h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Carefully crafted bowls with balanced macros, clean ingredients and
        satisfying flavors. Ideal for muscle gain, fat loss and everyday clean eating.
      </p>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500">No bowls available right now.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {data.map((b) => (
            <BowlCard key={b._id} bowl={b} />
          ))}
        </div>
      )}
    </div>
  );
}
