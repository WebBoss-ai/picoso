'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Package, MapPin, Crown, HelpCircle,
  Edit3, Save, Plus, Trash2, CheckCircle2, Home, Briefcase,
  Phone, Mail, Star, ChevronDown, ChevronUp, ArrowRight,
  Clock, Loader2, X, Shield, Truck, Percent, Gift
} from 'lucide-react';
import { profile, orders, platinum } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'platinum', label: 'Platinum', icon: Crown },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

const FAQS = [
  { q: 'How long does delivery take?', a: 'We deliver within 30 minutes of order placement. Our riders are always ready to bring your meal hot and fresh.' },
  { q: 'What is the Platinum Card?', a: 'Picoso Platinum is a ₹99/month subscription that gives you 20% off every meal, free delivery, and priority service. Pay via UPI and get activated after admin approval.' },
  { q: 'How do I pay via UPI?', a: 'During checkout, select "Pay via UPI", copy our UPI ID (8210823753@ybl), pay the amount from your UPI app, and place your order. Our team will verify and confirm your order.' },
  { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 2 minutes of placing. Once confirmed, cancellation may not be possible. Please contact support immediately.' },
  { q: 'Are the meals really healthy?', a: 'Yes! Every PF Meal is crafted by our nutritionists with specific macro targets. High protein, balanced carbs, and healthy fats — no preservatives.' },
  { q: 'How do I update my delivery address?', a: 'Go to Profile → Addresses to add, edit, or set a default delivery address. You can also add a new address during checkout.' },
  { q: 'What if my order arrives late or incorrect?', a: 'Please contact us via the Support tab or call +91 82108 23753. We will resolve it immediately with a refund or replacement.' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  'out-for-delivery': 'bg-brand-100 text-brand-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const PLATINUM_PERKS = [
  { icon: <Percent size={18} className="text-white" />, title: '20% Off Every Meal', desc: 'Flat discount on all PF Meals' },
  { icon: <Truck size={18} className="text-white" />, title: 'Free Delivery', desc: 'Every single order, always' },
  { icon: <Shield size={18} className="text-white" />, title: 'Priority Service', desc: 'Your orders jump the queue' },
  { icon: <Gift size={18} className="text-white" />, title: 'Exclusive Deals', desc: 'Member-only offers & early access' },
];

// ─── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ userData, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: userData?.name || '', email: userData?.email || '' });
  }, [userData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profile.update(form);
      onUpdate(res.data.user);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center">
            <span className="text-brand-700 text-2xl font-extrabold">
              {userData?.name ? userData.name[0].toUpperCase() : userData?.phone?.slice(-2)}
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{userData?.name || 'Set your name'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Phone size={13} /> +91 {userData?.phone}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Name</label>
            {editing ? (
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input className="input-field pl-10" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
              </div>
            ) : (
              <p className="text-sm text-gray-900 py-3 px-4 bg-surface-50 rounded-xl">{userData?.name || '—'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
            {editing ? (
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input className="input-field pl-10" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
              </div>
            ) : (
              <p className="text-sm text-gray-900 py-3 px-4 bg-surface-50 rounded-xl">{userData?.email || '—'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Phone</label>
            <p className="text-sm text-gray-900 py-3 px-4 bg-surface-50 rounded-xl flex items-center gap-2">
              +91 {userData?.phone}
              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Verified</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Changes
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Edit3 size={15} /> Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orders.getAll().then(res => setOrderList(res.data.orders || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  );

  if (orderList.length === 0) return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Package size={28} className="text-gray-300" />
      </div>
      <p className="font-semibold text-gray-700 mb-1">No orders yet</p>
      <p className="text-sm text-gray-400 mb-4">Your order history will appear here</p>
      <a href="/menu" className="btn-primary inline-flex">Browse Menu</a>
    </div>
  );

  return (
    <div className="space-y-4">
      {orderList.map(order => (
        <div key={order._id} className="card p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="font-bold text-gray-900 text-sm">Order #{order._id.slice(-6).toUpperCase()}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock size={11} />
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                {order.status.replace(/-/g, ' ')}
              </span>
              <span className="text-sm font-bold text-gray-900">₹{order.totalPrice}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-600">
                <span>{item.name || item.bowlId?.name || 'Item'} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
            <span className="text-xs text-gray-400 capitalize">
              {order.paymentMethod === 'upi' ? 'UPI' : 'Cash on Delivery'}
              {order.paymentStatus === 'paid' && <span className="ml-1.5 text-brand-600">• Paid</span>}
              {order.paymentMethod === 'upi' && order.paymentStatus === 'pending' && (
                <span className="ml-1.5 text-amber-600">• Pending verification</span>
              )}
            </span>
            <a href={`/order-success/${order._id}`} className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
              Track <ArrowRight size={11} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Addresses Tab ────────────────────────────────────────────────────────────
function AddressesTab({ userData, onRefresh }) {
  const [addresses, setAddresses] = useState(userData?.savedAddresses || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: 'Home', fullAddress: '', area: '', city: '', landmark: '', isDefault: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAddresses(userData?.savedAddresses || []); }, [userData]);

  const handleAdd = async () => {
    if (!form.fullAddress.trim()) return;
    setSaving(true);
    try {
      const res = await profile.addAddress(form);
      setAddresses(res.data.savedAddresses);
      setAdding(false);
      setForm({ label: 'Home', fullAddress: '', area: '', city: '', landmark: '', isDefault: false });
      onRefresh?.();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      const res = await profile.deleteAddress(id);
      setAddresses(res.data.savedAddresses);
      onRefresh?.();
    } catch {}
  };

  const labelIcon = (label) => {
    if (label === 'Home') return <Home size={14} />;
    if (label === 'Work') return <Briefcase size={14} />;
    return <MapPin size={14} />;
  };

  return (
    <div className="space-y-4">
      {addresses.map(addr => (
        <div key={addr._id} className={`card p-4 flex items-start gap-4 ${addr.isDefault ? 'border-brand-300 bg-brand-50' : ''}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${addr.isDefault ? 'bg-brand-100 text-brand-600' : 'bg-surface-100 text-gray-400'}`}>
            {labelIcon(addr.label)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{addr.label}</p>
              {addr.isDefault && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Default</span>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{addr.fullAddress}</p>
            {addr.landmark && <p className="text-xs text-gray-400 mt-0.5">Near: {addr.landmark}</p>}
          </div>
          <button onClick={() => handleDelete(addr._id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-gray-900 text-sm">New Address</p>
            <button onClick={() => setAdding(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 text-gray-400">
              <X size={15} />
            </button>
          </div>

          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
            <input className="input-field pl-10" placeholder="Full address *"
              value={form.fullAddress} onChange={e => setForm(f => ({ ...f, fullAddress: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="Area" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
            <input className="input-field" placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <input className="input-field" placeholder="Landmark (optional)" value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />

          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map(l => (
              <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.label === l ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-surface-200 hover:border-brand-300'}`}>
                {l}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="accent-brand-500" />
            <span className="text-sm text-gray-600">Set as default</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button onClick={handleAdd} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Address
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-surface-200 text-sm font-semibold text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all">
          <Plus size={16} /> Add New Address
        </button>
      )}
    </div>
  );
}

// ─── Platinum Tab ─────────────────────────────────────────────────────────────
function PlatinumTab({ platinumData, onSubscribe }) {
  const [upiRef, setUpiRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubscribe = async () => {
    setSubmitting(true);
    try {
      await onSubscribe(upiRef);
      setSubmitted(true);
    } catch {}
    setSubmitting(false);
  };

  const copyUPI = () => {
    navigator.clipboard.writeText('8210823753@ybl');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActive = platinumData?.active;
  const isPending = platinumData?.paymentStatus === 'pending' && !isActive;

  return (
    <div className="space-y-5">
      {/* Card Visual */}
      <div className="platinum-card">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-5 -left-5 w-36 h-36 bg-white/5 rounded-full" />
        </div>
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={18} />
              <span className="font-bold">Picoso Platinum</span>
            </div>
            <p className="text-white/70 text-sm mb-4">Your premium membership card</p>
            {isActive ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={16} className="text-white" />
                  <span className="font-semibold text-sm">Active</span>
                </div>
                <p className="text-white/70 text-xs">
                  Valid until {new Date(platinumData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ) : isPending ? (
              <span className="tag-chip bg-white/20 text-white">Pending Approval</span>
            ) : (
              <span className="tag-chip bg-white/20 text-white">Not Active</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Monthly</p>
            <p className="text-2xl font-extrabold">₹99</p>
          </div>
        </div>
      </div>

      {/* Perks */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">What you get</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLATINUM_PERKS.map(perk => (
            <div key={perk.title} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
              <div className="w-8 h-8 gradient-platinum rounded-lg flex items-center justify-center flex-shrink-0">
                {perk.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{perk.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscribe / Renew */}
      {!isActive && (
        <div className="card p-5">
          {isPending ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={22} className="text-amber-500" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Payment Under Review</p>
              <p className="text-sm text-gray-500">Your payment is being verified. Your card will be activated within 2–4 hours.</p>
            </div>
          ) : submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-brand-500 mx-auto mb-3" />
              <p className="font-bold text-gray-900 mb-1">Payment Submitted!</p>
              <p className="text-sm text-gray-500">We'll verify and activate your card shortly.</p>
            </div>
          ) : (
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Get Platinum — ₹99/month</h3>
              <p className="text-sm text-gray-500 mb-5">Pay via UPI and your card will be activated within 2–4 hours after admin approval.</p>

              <div className="bg-surface-50 rounded-xl p-4 border border-surface-200 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pay ₹99 to</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">8210823753@ybl</p>
                  </div>
                  <button onClick={copyUPI}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? 'bg-brand-100 text-brand-700' : 'bg-surface-200 text-gray-600 hover:bg-surface-300'}`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">UPI Transaction Reference (optional)</label>
                <input className="input-field" placeholder="Enter UTR / transaction ID for faster approval"
                  value={upiRef} onChange={e => setUpiRef(e.target.value)} />
              </div>

              <button onClick={handleSubscribe} disabled={submitting} className="btn-platinum w-full">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                I've Paid — Activate My Card
              </button>
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="card p-5 border-brand-200 bg-brand-50 text-center">
          <CheckCircle2 size={28} className="text-brand-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900 mb-1">You're a Platinum Member!</p>
          <p className="text-sm text-gray-500">Enjoy 20% off and free delivery on every order.</p>
        </div>
      )}
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────────────────────────
function SupportTab() {
  const [openIndex, setOpenIndex] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-5">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-surface-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                {openIndex === i ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-surface-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Still need help?</h3>
        <p className="text-sm text-gray-500 mb-4">Send us a message and we'll respond within 2 hours.</p>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 size={32} className="text-brand-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">Message sent!</p>
            <p className="text-sm text-gray-400">We'll get back to you shortly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="input-field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <textarea className="input-field resize-none" rows={4} placeholder="Describe your issue..."
              value={message} onChange={e => setMessage(e.target.value)} />
            <button
              onClick={() => { if (name && message) setSent(true); }}
              disabled={!name || !message}
              className="btn-primary"
            >
              Send Message
            </button>
          </div>
        )}
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Direct Contact</p>
        <div className="space-y-3">
          <a href="tel:+918210823753" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
              <Phone size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">+91 82108 23753</p>
              <p className="text-xs text-gray-400">9 AM – 9 PM, daily</p>
            </div>
          </a>
          <a href="mailto:hello@picoso.in" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
              <Mail size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">hello@picoso.in</p>
              <p className="text-xs text-gray-400">Response within 2 hours</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ─────────────────────────────────────────────────────────
function ProfileContent() {
  const searchParams = useSearchParams();
  const { user: authUser, isLoggedIn, updateUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const [userData, setUserData] = useState(null);
  const [platinumData, setPlatinumData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/'); return; }
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [isLoggedIn, router, searchParams]);

  useEffect(() => {
    if (!isLoggedIn) return;
    profile.get().then(res => {
      setUserData(res.data.user);
      setPlatinumData(res.data.platinum);
    }).catch(() => setUserData(authUser)).finally(() => setLoading(false));
  }, [isLoggedIn, authUser]);

  const handleUpdate = (updatedUser) => {
    setUserData(u => ({ ...u, ...updatedUser }));
    updateUser(updatedUser);
  };

  const handleRefreshAddresses = () => {
    profile.get().then(res => setUserData(res.data.user));
  };

  const handleSubscribePlatinum = async (upiRef) => {
    const res = await platinum.subscribe({ upiRef });
    setPlatinumData(res.data.platinum);
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="card p-2">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {tab.id === 'platinum' && platinumData?.active && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-platinum-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            ) : (
              <>
                {activeTab === 'account' && <AccountTab userData={userData} onUpdate={handleUpdate} />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'addresses' && <AddressesTab userData={userData} onRefresh={handleRefreshAddresses} />}
                {activeTab === 'platinum' && <PlatinumTab platinumData={platinumData} onSubscribe={handleSubscribePlatinum} />}
                {activeTab === 'support' && <SupportTab />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={24} className="animate-spin text-brand-500" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
