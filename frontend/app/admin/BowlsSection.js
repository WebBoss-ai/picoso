'use client';

import { useEffect, useState } from 'react';
import { admin, bowls as bowlsApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Flame, Zap, Upload, X } from 'lucide-react';

export default function BowlsSection() {
  const [bowls, setBowls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBowl, setEditingBowl] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    howItsMade: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    fiber: '',
    ingredients: '',
    price: '',
    category: 'signature',
    available: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBowls();
  }, []);

  const loadBowls = async () => {
    try {
      const res = await bowlsApi.getAll();
      setBowls(res.data.bowls || []);
    } catch (error) {
      console.error('Failed to load bowls:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (bowl = null) => {
    if (bowl) {
      setEditingBowl(bowl);
      setFormData({
        name: bowl.name,
        description: bowl.description,
        howItsMade: bowl.howItsMade || '',
        calories: bowl.calories,
        protein: bowl.protein,
        carbs: bowl.carbs || '',
        fats: bowl.fats || '',
        fiber: bowl.fiber || '',
        ingredients: bowl.ingredients?.join(', ') || '',
        price: bowl.price,
        category: bowl.category || 'signature',
        available: bowl.available,
      });
    } else {
      setEditingBowl(null);
      setFormData({
        name: '',
        description: '',
        howItsMade: '',
        calories: '',
        protein: '',
        carbs: '',
        fats: '',
        fiber: '',
        ingredients: '',
        price: '',
        category: 'signature',
        available: true,
      });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBowl(null);
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('howItsMade', formData.howItsMade);
      data.append('calories', formData.calories);
      data.append('protein', formData.protein);
      data.append('carbs', formData.carbs || 0);
      data.append('fats', formData.fats || 0);
      data.append('fiber', formData.fiber || 0);
      data.append('ingredients', JSON.stringify(formData.ingredients.split(',').map(i => i.trim()).filter(i => i)));
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('available', formData.available);

      if (imageFile) {
        data.append('image', imageFile);
      }

      if (editingBowl) {
        await admin.updateBowl(editingBowl._id, data);
      } else {
        await admin.createBowl(data);
      }

      await loadBowls();
      closeModal();
    } catch (error) {
      console.error('Failed to save bowl:', error);
      alert('Failed to save bowl. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bowl?')) return;

    try {
      await admin.deleteBowl(id);
      await loadBowls();
    } catch (error) {
      console.error('Failed to delete bowl:', error);
      alert('Failed to delete bowl');
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
          <h2 className="text-2xl font-bold text-gray-900">Signature Bowls</h2>
          <p className="text-gray-600 mt-1">Manage your bowl offerings</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5 inline mr-2" />
          Add New Bowl
        </button>
      </div>

      {/* Bowls Grid */}
      {bowls.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No bowls yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bowls.map((bowl) => (
            <div key={bowl._id} className="card overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48 bg-gradient-to-br from-emerald-100 to-green-100">
                {bowl.image ? (
                  <img
                    src={bowl.image}
                    alt={bowl.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🥗
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => openModal(bowl)}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(bowl._id)}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{bowl.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bowl.description}</p>

                <div className="flex items-center gap-3 mb-3 text-sm">
                  <div className="flex items-center gap-1 text-orange-600">
                    <Flame className="w-4 h-4" />
                    <span className="font-semibold">{bowl.calories} cal</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">{bowl.protein}g protein</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-emerald-600">₹{bowl.price}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bowl.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {bowl.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBowl ? 'Edit Bowl' : 'Add New Bowl'}
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
                    Bowl Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Power Protein Bowl"
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
                    placeholder="299"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="A delicious, macro-balanced bowl perfect for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How It's Made
                </label>
                <textarea
                  rows={2}
                  value={formData.howItsMade}
                  onChange={(e) => setFormData({ ...formData, howItsMade: e.target.value })}
                  className="input-field"
                  placeholder="Grilled chicken over quinoa with..."
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
                    placeholder="450"
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
                    placeholder="35"
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
                    placeholder="40"
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
                    placeholder="12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredients (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  className="input-field"
                  placeholder="Chicken breast, Quinoa, Broccoli, Avocado"
                />
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
                    <option value="signature">Signature</option>
                    <option value="protein">High Protein</option>
                    <option value="vegan">Vegan</option>
                    <option value="lowcarb">Low Carb</option>
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
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bowl Image
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
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
                <p className="text-xs text-gray-500 mt-1">
                  Upload a high-quality image (max 5MB). Leave empty to keep existing image.
                </p>
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
                  {submitting ? 'Saving...' : editingBowl ? 'Update Bowl' : 'Create Bowl'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
