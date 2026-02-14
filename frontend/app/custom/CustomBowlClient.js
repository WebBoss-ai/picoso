"use client";

import { useEffect, useMemo, useState } from 'react';
import { ingredients } from '@/lib/api';
import IngredientSelector from '@/components/IngredientSelector';
import { Flame, Zap, Wheat, Droplets } from 'lucide-react';

export default function CustomBowlClient() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ingredients.getAll();
        setData(res.data.ingredients || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleIngredient = (ing) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (copy[ing._id]) delete copy[ing._id];
      else copy[ing._id] = { ingredient: ing, quantity: 1 };
      return copy;
    });
  };

  const totals = useMemo(() => {
    let calories = 0,
      protein = 0,
      carbs = 0,
      fats = 0,
      price = 0;

    Object.values(selected).forEach(({ ingredient }) => {
      calories += ingredient.calories || 0;
      protein += ingredient.protein || 0;
      carbs += ingredient.carbs || 0;
      fats += ingredient.fats || 0;
      price += ingredient.price || 0;
    });

    return { calories, protein, carbs, fats, price };
  }, [selected]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid lg:grid-cols-3 gap-10">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Build Your Custom Performance Bowl
          </h1>
          <p className="text-gray-600 mb-6 max-w-2xl">
            Mix and match clean proteins, complex carbs, crunchy veggies and healthy fats.
            See your total calories, protein and macros update in real time.
          </p>

          {loading ? (
            <div className="py-10 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : data.length === 0 ? (
            <p className="text-gray-500">No ingredients available currently.</p>
          ) : (
            <IngredientSelector
              ingredients={data}
              selected={selected}
              toggleIngredient={toggleIngredient}
            />
          )}
        </div>

        {/* RIGHT */}
        <div className="card p-6 sticky top-24 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Your Bowl Summary
          </h2>

          <div className="space-y-3 mb-6">
            <SummaryRow icon={Flame} label="Calories" value={`${totals.calories} kcal`} color="text-orange-500" />
            <SummaryRow icon={Zap} label="Protein" value={`${totals.protein} g`} color="text-blue-500" />
            <SummaryRow icon={Wheat} label="Carbs" value={`${totals.carbs} g`} color="text-amber-500" />
            <SummaryRow icon={Droplets} label="Fats" value={`${totals.fats} g`} color="text-pink-500" />
          </div>

          <div className="border-t border-emerald-100 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Total price</span>
              <span className="text-2xl font-bold text-emerald-600">
                ₹{totals.price}
              </span>
            </div>
          </div>

          <button
            disabled={Object.keys(selected).length === 0}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Custom Bowl to Order
          </button>

          <p className="text-xs text-gray-500 mt-3">
            This is a single-serving macro-balanced bowl. You can adjust ingredient
            quantities and serving sizes from the admin dashboard in the future.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Helper */
function SummaryRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-gray-700">
        <Icon className={`w-4 h-4 ${color}`} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
