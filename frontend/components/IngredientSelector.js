export default function IngredientSelector({
  ingredients,
  selected,
  toggleIngredient,
}) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {ingredients.map((ing) => {
        const isSelected = !!selected[ing._id];
        return (
          <button
            key={ing._id}
            type="button"
            onClick={() => toggleIngredient(ing)}
            className={`card text-left p-4 transition-transform ${
              isSelected ? 'ring-2 ring-emerald-500 scale-[1.01]' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                {ing.image ? (
                  <img
                    src={ing.image}
                    alt={ing.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🥗</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{ing.name}</h3>
                <p className="text-xs text-gray-500">{ing.category}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {ing.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{ing.calories} kcal</span>
              <span className="font-semibold text-emerald-700">
                {ing.protein} g protein
              </span>
              <span>₹{ing.price}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
