'use client';

import { useEffect, useState } from 'react';
import { admin, ingredients as ingredientsApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Flame, Zap, Upload, X } from 'lucide-react';

export default function IngredientsSection() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    price: '',
    category: 'base',
    available: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const res = await ingredientsApi.getAll();
      setIngredients(res.data.ingredients || []);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (ingredient = null) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        description: ingredient.description || '',
        calories: ingredient.calories,
        protein: ingredient.protein,
        carbs: ingredient.carbs || '',
        fats: ingredient.fats || '',
        price: ingredient.price,
        category: ingredient.category || 'base',
        available: ingredient.available,
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        description: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        price: '',
        category: 'base',
        available: true,
      });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIngredient(null);
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('calories', formData.calories);
      data.append('protein', formData.protein);
      data.append('carbs', formData.carbs || 0);
      data.append('fats', formData.fats || 0);
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('available', formData.available);

      if (imageFile) {
        data.append('image', imageFile);
      }

      if (editingIngredient) {
        await admin.updateIngredient(editingIngredient._id, data);
      } else {
        await admin.createIngredient(data);
      }

      await loadIngredients();
      closeModal();
    } catch (error) {
      console.error('Failed to save ingredient:', error);
      alert('Failed to save ingredient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    try {
      await admin.deleteIngredient(id);
      await loadIngredients();
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
      alert('Failed to delete ingredient');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ingredients</h2>
          <p className="text-gray-600 mt-1">Manage custom bowl ingredients</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5 inline mr-2" />
          Add Ingredient
        </button>
      </div>

      {/* Ingredients Grid */}
      {ingredients.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No ingredients yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ingredients.map((ingredient) => (
            <div key={ingredient._id} className="card p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                  {ingredient.image ? (
                    <img
                      src={ingredient.image}
                      alt={ingredient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🥗</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(ingredient)}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(ingredient._id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{ingredient.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{ingredient.category}</p>
              {ingredient.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{ingredient.description}</p>
              )}

              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1 text-orange-600">
                  <Flame className="w-3 h-3" />
                  <span>{ingredient.calories} cal</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <Zap className="w-3 h-3" />
                  <span>{ingredient.protein}g</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                <span className="text-lg font-bold text-emerald-600">₹{ingredient.price}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ingredient.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {ingredient.available ? 'Available' : 'Out'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingIngredient ? 'Edit Ingredient' : 'Add Ingredient'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Grilled Chicken"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Lean protein source, high in amino acids..."
                />
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calories *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    className="input-field"
                    placeholder="150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protein (g) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                    className="input-field"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                    className="input-field"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                    className="input-field"
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="base">Base</option>
                    <option value="protein">Protein</option>
                    <option value="grain">Grain</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="topping">Topping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.value === 'true' })}
                    className="input-field"
                  >
                    <option value="true">Available</option>
                    <option value="false">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image
                </label>
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 hover:border-emerald-500 transition-colors text-center">
                    <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {imageFile ? imageFile.name : 'Click to upload image'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : editingIngredient ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
