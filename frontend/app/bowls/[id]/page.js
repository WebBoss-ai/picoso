'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { bowls } from '@/lib/api';
import { Flame, Zap, Drumstick, Wheat, Droplets } from 'lucide-react';

export default function BowlDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [bowl, setBowl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await bowls.getById(id);
        setBowl(res.data.bowl);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!bowl) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600">
        Bowl not found.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="card overflow-hidden">
          {bowl.image ? (
            <img
              src={bowl.image}
              alt={bowl.name}
              className="w-full h-80 object-cover"
            />
          ) : (
            <div className="w-full h-80 flex items-center justify-center text-6xl">
              🥗
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            {bowl.name}
          </h1>
          <p className="text-gray-600 mb-4">{bowl.description}</p>
          {bowl.howItsMade && (
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-semibold text-gray-700">How it’s made: </span>
              {bowl.howItsMade}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase text-gray-500">Calories</p>
                <p className="font-semibold text-gray-800">{bowl.calories} kcal</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs uppercase text-gray-500">Protein</p>
                <p className="font-semibold text-gray-800">{bowl.protein} g</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Wheat className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs uppercase text-gray-500">Carbs</p>
                <p className="font-semibold text-gray-800">{bowl.carbs || 0} g</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Droplets className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xs uppercase text-gray-500">Fats</p>
                <p className="font-semibold text-gray-800">{bowl.fats || 0} g</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Key ingredients</h3>
            <p className="text-gray-600 text-sm">
              {bowl.ingredients?.length
                ? bowl.ingredients.join(' • ')
                : 'Fresh seasonal produce, lean protein and complex carbs.'}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-3xl font-bold text-emerald-600">
              ₹{bowl.price}
            </span>
            <button className="btn-primary">
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
