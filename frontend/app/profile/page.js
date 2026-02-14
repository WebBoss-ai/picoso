'use client';

import { useEffect, useState } from 'react';
import { profile } from '@/lib/api';


export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    location: { city: '', area: '', address: '' },
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await profile.get();
        const u = res.data.user;
        setForm({
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          location: {
            city: u.location?.city || '',
            area: u.location?.area || '',
            address: u.location?.address || '',
          },
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateLocation = (field, value) =>
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        location: form.location,
      };
      const res = await profile.update(payload);
      setMessage('Profile updated successfully.');
      // sync local user
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localUser.name = res.data.user.name;
      localStorage.setItem('user', JSON.stringify(localUser));
    } catch (e) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Your Profile</h1>
      <p className="text-gray-600 mb-6">
        Keep your details up to date for faster checkout and smoother delivery.
      </p>

      {message && (
        <div className="mb-4 text-sm px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 card p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone (login)
          </label>
          <input
            value={form.phone}
            disabled
            className="input-field bg-gray-50 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="input-field"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="input-field"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              value={form.location.city}
              onChange={(e) => updateLocation('city', e.target.value)}
              className="input-field"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area / Locality
            </label>
            <input
              value={form.location.area}
              onChange={(e) => updateLocation('area', e.target.value)}
              className="input-field"
              placeholder="Area / Sector"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full address
          </label>
          <textarea
            value={form.location.address}
            onChange={(e) => updateLocation('address', e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Flat / building, street, landmark, PIN code"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
