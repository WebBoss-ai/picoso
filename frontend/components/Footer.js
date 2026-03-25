import Link from 'next/link';
import { Instagram, Twitter, Facebook, Mail, Phone, Leaf, Crown, MapPin, ArrowRight } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-surface-200">

      {/* Top CTA band */}
      <div className="bg-brand-50 border-b border-brand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Leaf size={16} className="text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Fresh meals, delivered in 30 minutes</p>
              <p className="text-xs text-gray-500">Free delivery on every order — no minimum</p>
            </div>
          </div>
          <Link href="/menu" className="btn-primary text-sm px-5 py-2.5 flex-shrink-0">
            Order Now <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand col */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
                <span className="text-white font-extrabold text-sm">P</span>
              </div>
              <span className="font-extrabold text-gray-900 text-xl tracking-tight">Picoso</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs">
              Nutritionist-crafted PF Meals packed with protein, made fresh daily and delivered to your door in 30 minutes. No junk, no compromise.
            </p>

            {/* Contact */}
            <div className="space-y-2.5 mb-6">
              <a href="tel:+918210823753" className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-brand-600 transition-colors group">
                <div className="w-7 h-7 bg-surface-100 group-hover:bg-brand-100 rounded-lg flex items-center justify-center transition-colors">
                  <Phone size={13} className="text-gray-500 group-hover:text-brand-600 transition-colors" />
                </div>
                +91 82108 23753
              </a>
              <a href="mailto:hello@picoso.in" className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-brand-600 transition-colors group">
                <div className="w-7 h-7 bg-surface-100 group-hover:bg-brand-100 rounded-lg flex items-center justify-center transition-colors">
                  <Mail size={13} className="text-gray-500 group-hover:text-brand-600 transition-colors" />
                </div>
                hello@picoso.in
              </a>
            </div>

            {/* Socials */}
            <div className="flex gap-2">
              {[
                { href: '#', icon: Instagram, label: 'Instagram' },
                { href: '#', icon: Twitter,   label: 'Twitter' },
                { href: '#', icon: Facebook,  label: 'Facebook' },
              ].map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-8 h-8 bg-surface-100 hover:bg-brand-100 border border-surface-200 hover:border-brand-200 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-600 transition-all">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Categories</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/menu" className="text-sm text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  PF Meals
                </Link>
              </li>
              {['PF Snacks', 'PF Desserts', 'PF Beverages'].map(name => (
                <li key={name}>
                  <span className="text-sm text-gray-300 cursor-not-allowed flex items-center gap-2">
                    {name}
                    <span className="text-xs bg-surface-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">Soon</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'My Profile',    href: '/profile' },
                { label: 'My Orders',     href: '/profile?tab=orders' },
                { label: 'Saved Addresses', href: '/profile?tab=addresses' },
                { label: 'Help & Support', href: '/profile?tab=support' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platinum */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Membership</h4>
            <Link href="/profile?tab=platinum"
              className="block p-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl hover:shadow-card-hover transition-all group mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={15} className="text-platinum-500" />
                <span className="text-sm font-bold text-gray-900">Picoso Platinum</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">20% off all meals + free delivery for ₹99/month</p>
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                Get started <ArrowRight size={11} />
              </span>
            </Link>

            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-1.5"><span className="text-brand-400">✓</span> 20% off every order</li>
              <li className="flex items-center gap-1.5"><span className="text-brand-400">✓</span> Free delivery always</li>
              <li className="flex items-center gap-1.5"><span className="text-brand-400">✓</span> Priority dispatch</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>© {year} Picoso. All rights reserved.</span>
            <span className="hidden sm:block">•</span>
            <div className="hidden sm:flex items-center gap-1.5 text-brand-500 font-medium">
              <Leaf size={11} /> FSSAI Certified Kitchen
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(t => (
              <a key={t} href="#" className="hover:text-gray-700 transition-colors">{t}</a>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
