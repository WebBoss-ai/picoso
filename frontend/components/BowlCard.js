import Link from 'next/link';
import { Flame, Zap } from 'lucide-react';

export default function BowlCard({ bowl }) {
  return (
    <Link href={`/bowls/${bowl._id}`}>
      <div className="card overflow-hidden group cursor-pointer sparkle-effect">
        <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-green-100 overflow-hidden">
          {bowl.image ? (
            <img
              src={bowl.image}
              alt={bowl.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">🥗</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors">
            {bowl.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {bowl.description}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-orange-600">
                <Flame className="w-4 h-4" />
                <span className="font-semibold">{bowl.calories} cal</span>
              </div>
              <div className="flex items-center gap-1 text-blue-600">
                <Zap className="w-4 h-4" />
                <span className="font-semibold">{bowl.protein}g protein</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-600">
              ₹{bowl.price}
            </span>
            <span className="text-sm text-gray-500">
              {bowl.available ? '✓ Available' : '✗ Unavailable'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
