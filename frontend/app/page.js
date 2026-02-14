'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Leaf,
  Zap,
  MapPin,
  Phone,
  Star, Play, CheckCircle2,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import BowlCard from '@/components/BowlCard';
import AuthModal from '@/components/AuthModal';
import { bowls } from '@/lib/api';
import { Menu, X } from "lucide-react";

export default function HomePage() {
  const [featuredBowls, setFeaturedBowls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [location, setLocation] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // --- Configuration ---
  const config = {
    brandName: "Picoso",
    colors: {
      bg: "#050505",
      accent: "#E1FD2E", // Acid Green for energy/modern feel
      accentGlow: "rgba(225, 253, 46, 0.4)",
      primary: "#FFFFFF",
      secondary: "#A1A1AA",
      glass: "rgba(255, 255, 255, 0.03)",
      glassBorder: "rgba(255, 255, 255, 0.08)",
    },
    images: {
      // High-res healthy food bowl placeholder
      heroBowl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
      // Avatar placeholders
      avatar1: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop",
      avatar2: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop",
      avatar3: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop",
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const bowlsData = [
    {
      name: "Dark Chocolate Banana Protein Oats",
      price: 199,
      description: "A rich, indulgent breakfast bowl combining slow-cooked oats with deep cocoa notes and natural banana sweetness, designed for sustained energy and protein-rich nourishment.",
      howItsMade: "Rolled oats are gently cooked in milk until creamy, blended with cocoa powder and protein, then finished with fresh banana and nut-based fats for balance.",
      calories: 400,
      protein: 20,
      carbs: 48,
      fats: 15,
      ingredients: ["Rolled oats", "cocoa powder", "banana", "peanut butter", "pumpkin seeds", "sunflower seeds", "milk"]
    },
    {
      name: "Mango Coconut Overnight Oats",
      price: 189,
      description: "A tropical-inspired, chilled oat bowl with bright mango freshness and subtle coconut richness, delivering a light yet satisfying premium breakfast experience.",
      howItsMade: "Oats are soaked overnight in almond milk, layered with ripe mango cubes and finished with coconut flakes and seeds.",
      calories: 360,
      protein: 15,
      carbs: 50,
      fats: 11,
      ingredients: ["Rolled oats", "mango", "coconut flakes", "almond milk", "chia seeds", "pumpkin seeds"]
    },
    {
      name: "Blueberry Almond Smoothie Bowl",
      price: 239,
      description: "A vibrant antioxidant-rich smoothie bowl with deep berry flavors and subtle almond creaminess, crafted for a visually striking and nourishing start.",
      howItsMade: "Frozen blueberries and banana are blended with oats and almond butter to a thick, spoonable consistency, then topped with fruits and nuts.",
      calories: 430,
      protein: 22,
      carbs: 46,
      fats: 14,
      ingredients: ["Blueberries", "banana", "rolled oats", "almond butter", "almond slices", "mixed seeds"]
    },
    {
      name: "Strawberry Chia Yogurt Parfait",
      price: 209,
      description: "A light, creamy yogurt-based bowl layered with fresh strawberries and chia seeds, offering a refined balance of freshness and texture.",
      howItsMade: "Hung curd is folded with soaked chia seeds and layered with sliced strawberries and lightly sweetened granola.",
      calories: 350,
      protein: 18,
      carbs: 38,
      fats: 12,
      ingredients: ["Hung curd", "strawberries", "chia seeds", "honey", "granola"]
    },
    {
      name: "Peanut Butter Banana Granola Bowl",
      price: 219,
      description: "A comforting yet premium breakfast bowl featuring creamy peanut butter, fresh banana, and crunchy granola for layered texture and taste.",
      howItsMade: "A milk-based oat foundation is topped with banana slices, toasted granola, and finished with a slow peanut butter drizzle.",
      calories: 420,
      protein: 19,
      carbs: 44,
      fats: 17,
      ingredients: ["Banana", "peanut butter", "granola", "rolled oats", "milk", "mixed seeds"]
    },
    {
      name: "Tropical Fruit Power Bowl",
      price: 169,
      description: "A refreshing, hydration-focused fruit bowl packed with tropical colors, natural sugars, and light crunch for a clean, energizing start.",
      howItsMade: "Fresh seasonal fruits are hand-cut and arranged in sections, finished with a light seed sprinkle.",
      calories: 280,
      protein: 8,
      carbs: 54,
      fats: 3,
      ingredients: ["Watermelon", "pineapple", "kiwi", "papaya", "mixed seeds"]
    },
    {
      name: "Apple Cinnamon Oatmeal",
      price: 199,
      description: "A warm, classic oatmeal bowl infused with cinnamon-spiced apples and nutty undertones, designed for comfort and slow-release energy.",
      howItsMade: "Oats are slow-cooked with milk, topped with sautéed apple slices, walnuts, and a dusting of cinnamon.",
      calories: 390,
      protein: 17,
      carbs: 47,
      fats: 14,
      ingredients: ["Rolled oats", "apple", "cinnamon", "walnuts", "milk"]
    },
    {
      name: "Dates & Fig Protein Oats",
      price: 209,
      description: "A naturally sweet, protein-rich oat bowl combining dried fruits and nuts for a luxurious, dessert-like breakfast without refined sugar.",
      howItsMade: "Oats are cooked until creamy, folded with chopped dates and figs, and topped with almond slivers.",
      calories: 410,
      protein: 18,
      carbs: 52,
      fats: 13,
      ingredients: ["Rolled oats", "dates", "dried figs", "almonds", "milk"]
    },
    {
      name: "Matcha Green Tea Smoothie Bowl",
      price: 249,
      description: "A clean, energizing bowl featuring ceremonial-grade matcha with soft banana sweetness and a silky green finish.",
      howItsMade: "Banana and oats are blended with matcha and almond milk to a thick consistency and topped with seeds and nut butter.",
      calories: 420,
      protein: 21,
      carbs: 43,
      fats: 15,
      ingredients: ["Matcha powder", "banana", "rolled oats", "almond butter", "almond milk", "seeds"]
    },
    {
      name: "Chocolate Berry Chia Pudding",
      price: 219,
      description: "A rich yet light chia pudding infused with cocoa and crowned with fresh berries for contrast and visual appeal.",
      howItsMade: "Chia seeds are soaked overnight in cocoa-infused almond milk and topped with fresh seasonal berries.",
      calories: 330,
      protein: 14,
      carbs: 28,
      fats: 16,
      ingredients: ["Chia seeds", "cocoa powder", "almond milk", "strawberries", "blueberries"]
    },
    {
      name: "Mediterranean Paneer Breakfast Bowl",
      price: 259,
      description: "A savory, protein-forward bowl inspired by Mediterranean flavors, combining fresh vegetables, paneer, and creamy hummus.",
      howItsMade: "Grilled paneer is paired with chopped vegetables and olives, finished with a smooth hummus dollop.",
      calories: 460,
      protein: 28,
      carbs: 32,
      fats: 20,
      ingredients: ["Paneer", "cucumber", "tomato", "olives", "hummus", "olive oil"]
    },
    {
      name: "Mexican Veg Protein Bowl",
      price: 239,
      description: "A bold, colorful bowl featuring plant-based proteins, vibrant vegetables, and fresh salsa for a hearty yet clean meal.",
      howItsMade: "Cooked rajma and corn are layered with sautéed peppers, avocado slices, and house salsa.",
      calories: 440,
      protein: 24,
      carbs: 46,
      fats: 14,
      ingredients: ["Rajma", "corn", "bell peppers", "avocado", "salsa", "olive oil"]
    },
    {
      name: "Tofu Teriyaki Breakfast Bowl",
      price: 259,
      description: "A modern Asian-inspired bowl with golden tofu, glossy teriyaki glaze, and balanced grains for a premium savory breakfast.",
      howItsMade: "Pan-seared tofu is glazed with teriyaki sauce and served over warm brown rice with vegetables.",
      calories: 450,
      protein: 26,
      carbs: 42,
      fats: 16,
      ingredients: ["Tofu", "brown rice", "mixed vegetables", "teriyaki sauce", "sesame seeds"]
    },
    {
      name: "Paneer Bhurji Power Bowl",
      price: 269,
      description: "A bold Indian-style breakfast bowl with spiced paneer bhurji layered over wholesome grains for high-protein fuel.",
      howItsMade: "Fresh paneer is crumbled and cooked with spices and vegetables, served over millet.",
      calories: 480,
      protein: 30,
      carbs: 34,
      fats: 21,
      ingredients: ["Paneer", "onion", "tomato", "spices", "millet", "coriander"]
    },
    {
      name: "South Indian Millet Veg Bowl",
      price: 219,
      description: "A light, traditional-inspired bowl featuring millet and vegetables with subtle South Indian seasoning.",
      howItsMade: "Foxtail millet is cooked soft and mixed with vegetables, finished with coconut chutney.",
      calories: 390,
      protein: 14,
      carbs: 52,
      fats: 10,
      ingredients: ["Foxtail millet", "mixed vegetables", "coconut chutney", "mustard seeds"]
    },
    {
      name: "Spinach Corn Cottage Cheese Bowl",
      price: 259,
      description: "A clean, protein-dense savory bowl combining soft cottage cheese with iron-rich spinach and sweet corn, designed for balanced nutrition and a refined taste.",
      howItsMade: "Fresh spinach is lightly sautéed and folded with paneer cubes and steamed corn, seasoned gently to preserve freshness.",
      calories: 460,
      protein: 29,
      carbs: 30,
      fats: 19,
      ingredients: ["Paneer", "spinach", "sweet corn", "olive oil", "herbs", "spices"]
    },
    {
      name: "Greek Yogurt Honey Nut Bowl",
      price: 229,
      description: "A light yet indulgent bowl featuring thick Greek yogurt, raw honey, and premium nuts for a creamy, elegant breakfast.",
      howItsMade: "Chilled Greek yogurt is spread smooth and topped with honey drizzle and hand-crushed nuts.",
      calories: 370,
      protein: 20,
      carbs: 30,
      fats: 16,
      ingredients: ["Greek yogurt", "honey", "walnuts", "almonds"]
    },
    {
      name: "Mocha Protein Oats",
      price: 219,
      description: "A bold, coffee-infused oat bowl blending rich cocoa and espresso notes for a high-protein, energizing start.",
      howItsMade: "Oats are cooked with milk, coffee, and cocoa, then finished with a nut butter swirl.",
      calories: 420,
      protein: 22,
      carbs: 45,
      fats: 15,
      ingredients: ["Rolled oats", "coffee extract", "cocoa powder", "peanut butter", "milk"]
    },
    {
      name: "Berry Beet Detox Bowl",
      price: 199,
      description: "A vibrant, antioxidant-rich bowl designed for detox and digestion, blending earthy beetroot with fresh berries.",
      howItsMade: "Steamed beetroot is blended with fruits into a smooth base and topped with fresh slices and seeds.",
      calories: 310,
      protein: 10,
      carbs: 52,
      fats: 6,
      ingredients: ["Beetroot", "apple", "mixed berries", "lemon juice", "seeds"]
    },
    {
      name: "Pineapple Mint Chia Bowl",
      price: 209,
      description: "A refreshing, tropical chia-based bowl with bright pineapple sweetness and cooling mint notes.",
      howItsMade: "Chia seeds are soaked overnight in coconut milk and topped with pineapple cubes and mint.",
      calories: 300,
      protein: 11,
      carbs: 32,
      fats: 14,
      ingredients: ["Chia seeds", "pineapple", "coconut milk", "mint leaves"]
    },
    {
      name: "Avocado Toast Bowl (Deconstructed)",
      price: 259,
      description: "A modern, deconstructed version of classic avocado toast served as a nutrient-rich bowl with premium fats and crunch.",
      howItsMade: "Avocado is mashed with lemon and layered with multigrain crumbs and seeds.",
      calories: 430,
      protein: 15,
      carbs: 36,
      fats: 22,
      ingredients: ["Avocado", "multigrain bread crumbs", "lemon juice", "mixed seeds"]
    },
    {
      name: "Protein Upma Bowl",
      price: 229,
      description: "A wholesome Indian breakfast bowl upgraded with protein-rich ingredients while preserving familiar comfort flavors.",
      howItsMade: "Suji is cooked with vegetables and paneer bits, tempered with mustard seeds and curry leaves.",
      calories: 450,
      protein: 22,
      carbs: 48,
      fats: 14,
      ingredients: ["Suji", "paneer", "vegetables", "mustard seeds", "curry leaves"]
    },
    {
      name: "Saffron Almond Milk Oats",
      price: 239,
      description: "A luxurious oat bowl infused with saffron and almond milk, offering subtle sweetness and a premium aroma.",
      howItsMade: "Oats are slow-cooked in almond milk with saffron strands and topped with nuts and dates.",
      calories: 400,
      protein: 18,
      carbs: 46,
      fats: 14,
      ingredients: ["Rolled oats", "almond milk", "saffron", "almonds", "dates"]
    },
    {
      name: "Chocolate Hazelnut Smoothie Bowl",
      price: 259,
      description: "A dessert-like yet nutritious smoothie bowl with deep chocolate notes and roasted hazelnut richness.",
      howItsMade: "Banana and oats are blended with cocoa and hazelnut butter, topped with fruit and drizzle.",
      calories: 460,
      protein: 23,
      carbs: 44,
      fats: 18,
      ingredients: ["Banana", "cocoa powder", "hazelnut butter", "rolled oats"]
    },
    {
      name: "Sprouts & Paneer Salad Bowl",
      price: 239,
      description: "A fresh, protein-packed salad bowl combining crunchy sprouts and soft paneer with citrus dressing.",
      howItsMade: "Steamed sprouts and paneer cubes are tossed lightly with lemon and herbs.",
      calories: 420,
      protein: 28,
      carbs: 32,
      fats: 16,
      ingredients: ["Mixed sprouts", "paneer", "lemon juice", "herbs"]
    },
    {
      name: "Oats Poha Fusion Bowl",
      price: 209,
      description: "A light, innovative breakfast bowl blending the familiarity of poha with the nutrition of oats.",
      howItsMade: "Oats are cooked poha-style with peanuts, onion, and curry leaves.",
      calories: 390,
      protein: 15,
      carbs: 50,
      fats: 11,
      ingredients: ["Rolled oats", "peanuts", "onion", "curry leaves", "spices"]
    },
    {
      name: "Quinoa Breakfast Veg Bowl",
      price: 249,
      description: "A light yet filling bowl built on fluffy quinoa and fresh vegetables with clean seasoning.",
      howItsMade: "Cooked quinoa is tossed with vegetables, seeds, and lemon dressing.",
      calories: 410,
      protein: 18,
      carbs: 48,
      fats: 12,
      ingredients: ["Quinoa", "mixed vegetables", "lemon juice", "seeds"]
    },
    {
      name: "Chocolate Orange Protein Oats",
      price: 219,
      description: "A bold-flavored oat bowl combining rich cocoa with fresh citrus notes for a refreshing protein boost.",
      howItsMade: "Oats are cooked with cocoa and milk, finished with orange zest.",
      calories: 410,
      protein: 21,
      carbs: 46,
      fats: 14,
      ingredients: ["Rolled oats", "cocoa powder", "orange zest", "milk"]
    },
    {
      name: "Apple Peanut Chia Bowl",
      price: 209,
      description: "A creamy chia-based bowl combining fresh apple crunch with rich peanut butter for balanced macros.",
      howItsMade: "Chia seeds are soaked in milk and topped with diced apple and peanut butter drizzle.",
      calories: 370,
      protein: 16,
      carbs: 34,
      fats: 17,
      ingredients: ["Chia seeds", "apple", "peanut butter", "milk"]
    },
    {
      name: "Ultimate High-Protein Breakfast Bowl",
      price: 289,
      description: "A flagship power bowl engineered for maximum protein intake, combining multiple premium protein sources with clean carbs.",
      howItsMade: "Quinoa forms the base, layered with paneer, tofu, and vegetables, finished with herbs.",
      calories: 520,
      protein: 35,
      carbs: 38,
      fats: 20,
      ingredients: ["Quinoa", "paneer", "tofu", "mixed vegetables", "herbs"]
    }
  ];

  // Updated dreamy pink color palette inspired by Yoga Bar
  const pinkDeep = '#C41E73';       // Deep raspberry/magenta
  const pinkMid = '#E91E63';        // Vibrant pink
  const pinkSoft = '#FCE4EC';       // Soft blush
  const pinkPale = '#FFF0F5';       // Lavender blush
  const pinkCream = '#FFF5F8';      // Cream pink
  const pinkHot = '#FF1493';        // Deep pink accent
  const pinkRose = '#F48FB1';       // Rose pink
  const pinkDusty = '#E8A0BF';      // Dusty rose
  const ink = '#2D1B29';            // Dark plum for text
  const inkSoft = '#7B6175';        // Muted plum
  const bgLight = '#FFFBFC';        // Almost white with pink tint
  const bgWhite = '#FFFFFF';
  const bgDark = '#1A0A14';         // Deep plum dark
  const textOnDark = '#FFF0F5';
  const borderSoft = 'rgba(196,30,115,0.12)';

  useEffect(() => {
    setMounted(true);
    const saved =
      (typeof window !== 'undefined' && localStorage.getItem('theme')) ||
      'light';
    const isDarkMode = saved === 'dark';
    setIsDark(isDarkMode);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    }
  }, []);

  useEffect(() => {
    loadFeaturedBowls();
    detectLocation();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
    }
  };

  const loadFeaturedBowls = async () => {
    try {
      const response = await bowls.getAll();
      setFeaturedBowls(response.data.bowls.slice(0, 3));
    } catch (error) {
      console.error('Error loading bowls:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = () => {
    if (typeof navigator === 'undefined') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `/api/location?lat=${latitude}&lng=${longitude}`
            );
            const data = await response.json();
            setLocation(data.city || 'Your location');
          } catch (error) {
            console.error('Location error:', error);
          }
        },
        () => setLocation('Set location')
      );
    }
  };

  if (!mounted) return null;

  const pageBg = isDark ? bgDark : bgLight;
  const baseCard = isDark ? '#2A1520' : bgWhite;
  const textMain = isDark ? textOnDark : ink;
  const textMuted = isDark ? '#D4A5C4' : inkSoft;
  const borderColor = isDark ? 'rgba(244,143,177,0.2)' : borderSoft;

  const heroBg = isDark ? '#2D0A1F' : pinkDeep;
  const heroText = isDark ? textOnDark : '#FFFFFF';
  const heroSubtext = isDark
    ? 'rgba(252,228,236,0.92)'
    : 'rgba(255,240,245,0.96)';
  const heroCTABg = isDark ? textOnDark : '#FFFFFF';
  const heroCTAText = isDark ? pinkDeep : pinkDeep;
  const heroCTAHover = isDark ? pinkSoft : pinkPale;
  const heroPillBg = isDark
    ? 'rgba(196,30,115,0.25)'
    : 'rgba(255,255,255,0.2)';
  const heroPillBorder = isDark
    ? 'rgba(252,228,236,0.2)'
    : 'rgba(255,255,255,0.35)';

  return (
    <>
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: pageBg,
          color: textMain,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* GLOBAL BG BLOBS */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -10,
            pointerEvents: 'none',
            background: isDark
              ? `radial-gradient(circle at 0% 0%, #2D0A1F 0, transparent 40%), radial-gradient(circle at 100% 100%, #4A1942 0, transparent 45%), linear-gradient(180deg, #1A0A14 0%, #1A0A14 50%, #1A0A14 100%)`
              : `radial-gradient(circle at 0% 0%, ${pinkSoft} 0, transparent 40%), radial-gradient(circle at 100% 100%, ${pinkPale} 0, transparent 45%), linear-gradient(180deg, ${bgLight} 0%, #ffffff 50%, ${bgLight} 100%)`,
          }}
        />
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -9,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: `${-120 + scrollY * 0.04}px`,
              right: '-80px',
              width: '360px',
              height: '360px',
              borderRadius: '999px',
              background: `linear-gradient(135deg, rgba(196,30,115,0.25), rgba(233,30,99,0.12))`,
              filter: 'blur(60px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: `${-140 + scrollY * 0.06}px`,
              left: '-80px',
              width: '320px',
              height: '320px',
              borderRadius: '999px',
              background: `linear-gradient(135deg, rgba(244,143,177,0.25), rgba(196,30,115,0.12))`,
              filter: 'blur(60px)',
            }}
          />
          {/* Additional dreamy blob */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              height: '500px',
              borderRadius: '999px',
              background: `radial-gradient(circle, rgba(255,20,147,0.08) 0%, transparent 70%)`,
              filter: 'blur(80px)',
            }}
          />
        </div>

        {/* NAVBAR */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(16px)",
            backgroundColor: isDark
              ? "rgba(26,10,20,0.9)"
              : "rgba(255,251,252,0.92)",
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0.9rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* BRAND */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "12px",
                  background:
                    "conic-gradient(from 140deg, #C41E73, #E91E63, #FF1493, #C41E73)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                T
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    color: textMain,
                  }}
                >
                  Picoso
                </div>
                <div style={{ fontSize: "0.7rem", color: textMuted }}>
                  Nutrition, productised.
                </div>
              </div>
            </div>

            {/* DESKTOP NAV */}
            {!isMobile && (
              <nav
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.7rem",
                  fontSize: "0.83rem",
                  color: textMuted,
                  fontWeight: 500,
                }}
              >
                {["Menu", "Why Us", "Process", "Results", "Membership"].map(
                  (item) => (
                    <Link
                      key={item}
                      href={`#${item.toLowerCase().replace(" ", "-")}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = pinkDeep)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = textMuted)
                      }
                    >
                      {item}
                    </Link>
                  )
                )}
              </nav>
            )}

            {/* RIGHT */}
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={toggleTheme}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "12px",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isDark ? "#2A1520" : pinkPale,
                    cursor: "pointer",
                  }}
                >
                  {isDark ? "☀" : "☾"}
                </button>

                <a
                  href="tel:8167080111"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.8rem",
                    color: textMuted,
                    textDecoration: "none",
                  }}
                >
                  <Phone size={14} />
                  8167080111
                </a>

                <button
                  onClick={() => setShowAuth(true)}
                  style={{
                    borderRadius: "12px",
                    border: "none",
                    padding: "0.55rem 1.4rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background:
                      "linear-gradient(135deg, #C41E73, #E91E63, #FF1493)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(196,30,115,0.3)",
                  }}
                >
                  <Sparkles size={14} />
                  Sign in
                </button>
              </div>
            )}

            {/* HAMBURGER */}
            {isMobile && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: textMain,
                }}
              >
                {mobileOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            )}
          </div>

          {/* MOBILE PANEL */}
          {isMobile && (
            <div
              style={{
                maxHeight: mobileOpen ? 500 : 0,
                overflow: "hidden",
                transition: "all 0.45s ease",
                borderTop: mobileOpen ? `1px solid ${borderColor}` : "none",
              }}
            >
              <div
                style={{
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.2rem",
                }}
              >
                {["Menu", "Why Us", "Process", "Results", "Membership"].map(
                  (item) => (
                    <Link
                      key={item}
                      href={`#${item.toLowerCase().replace(" ", "-")}`}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 600,
                        color: textMain,
                        textDecoration: "none",
                      }}
                    >
                      {item}
                    </Link>
                  )
                )}

                <button
                  onClick={toggleTheme}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: isDark ? "#2A1520" : pinkPale,
                    color: textMain,
                    fontWeight: 600,
                  }}
                >
                  Toggle Theme
                </button>

                <button
                  onClick={() => setShowAuth(true)}
                  style={{
                    borderRadius: 14,
                    border: "none",
                    padding: "0.9rem",
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #C41E73, #E91E63, #FF1493)",
                    color: "#fff",
                  }}
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </header>

        {/* HERO */}
        <section
          style={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#fffcfd', // Very subtle warm white
            color: '#2d2d2d',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {/* --- 1. Internal Styles for Animations & Responsive Design --- */}
          <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    /* Animations */
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
    @keyframes float-delay { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
    @keyframes slideUpFade { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes soft-pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 182, 193, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(255, 182, 193, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 182, 193, 0); } }
    @keyframes gradient-text { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

    /* Layout */
    .hero-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 7rem 1.5rem 6rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 3rem;
      position: relative;
      z-index: 10;
      align-items: center;
    }

    /* Typography */
.hero-heading {
  font-size: clamp(3rem, 5.5vw, 5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;

  color: #ffffff;                 /* white text */
  -webkit-text-stroke: 2px #000;  /* black border */
}

.hero-heading2 {
  font-size: clamp(3rem, 5.5vw, 5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
}


    .hero-highlight {
      background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      position: relative;
      display: inline-block;
    }

    /* Glass Cards */
    .glass-card {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 20px 50px rgba(255, 182, 193, 0.15);
      border-radius: 24px;
    }

    /* Buttons */
    .btn-primary {
      transition: all 0.3s ease;
      box-shadow: 0 10px 25px -5px rgba(255, 20, 147, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px -5px rgba(255, 20, 147, 0.4);
    }
    
    .btn-secondary {
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.5);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.9);
      transform: translateY(-3px);
      border-color: #FF69B4;
    }

    /* Media Queries */
    @media (min-width: 992px) {
      .hero-container {
        grid-template-columns: 1.1fr 0.9fr;
        padding: 6rem 2rem 4rem;
      }
    }
  `}</style>

          {/* --- 2. Soft Background Decor --- */}
          {/* Top Right Pink Glow */}
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(255, 228, 235, 0.8) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
          {/* Bottom Left Peach/Pink Glow */}
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255, 192, 203, 0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />

          {/* Decorative Organic Line (SVG) */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.4, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-100 400C200 350 400 600 800 500C1200 400 1400 550 1600 450" stroke="url(#lineGradient)" strokeWidth="2" />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#FF69B4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>

          <div className="hero-container">
            {/* --- LEFT COLUMN: Content --- */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

              {/* Pill Badge */}
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '99px',
                  backgroundColor: '#fff', border: '1px solid #ffe4e6',
                  boxShadow: '0 4px 12px rgba(255, 182, 193, 0.2)',
                  marginBottom: '2rem', animation: 'slideUpFade 0.8s ease-out'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF1493', animation: 'soft-pulse 2s infinite' }}></span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FF1493' }}>
                  Picoso Premium
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="hero-heading" style={{ animation: 'slideUpFade 0.8s ease-out 0.1s backwards' }}>
                Fuel Your <br />
              </h1>
              <h1 className="hero-heading2" style={{ animation: 'slideUpFade 0.8s ease-out 0.1s backwards' }}>
                <span className="hero-highlight">Future Self.</span>
              </h1>

              {/* Subtext */}
              <p style={{ fontSize: '1.15rem', lineHeight: 1.7, color: '#555', maxWidth: '34rem', margin: '0 0 2.5rem', animation: 'slideUpFade 0.8s ease-out 0.2s backwards' }}>
                Right now, your calendar is planned to the minute, your meals aren’t.
                <strong style={{ color: '#333' }}> Picoso</strong> builds clinically balanced bowls for people who treat their body like a high-performance asset.
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', animation: 'slideUpFade 0.8s ease-out 0.3s backwards' }}>
                <button
                  className="btn-primary"
                  onClick={() => { document.getElementById('membership')?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{
                    padding: '1rem 2.2rem',
                    background: 'linear-gradient(135deg, #FF1493 0%, #D81B60 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Start Your Plan
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => { document.getElementById('carouselTrack')?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{
                    padding: '1rem 2rem',
                    color: '#333',
                    border: '1px solid rgba(255, 105, 180, 0.3)',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="rgba(255, 20, 147, 0.1)" stroke="#FF1493" /></svg>
                  View Menu
                </button>
              </div>

              {/* Trust Indicator */}
              <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideUpFade 0.8s ease-out 0.4s backwards' }}>
                <div style={{ display: 'flex' }}>
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: '#eee', border: '3px solid #fff', marginLeft: i > 0 ? -12 : 0, overflow: 'hidden' }}>
                      <img src={`https://source.unsplash.com/random/100x100?face&sig=${i}`} alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                  Loved by <strong style={{ color: '#FF1493' }}>2,000+</strong> healthy eaters
                </p>
              </div>
            </div>

            {/* --- RIGHT COLUMN: Visual Composition --- */}
            <div
              style={{
                position: "relative",
                height: "100%",
                minHeight: "560px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                isolation: "isolate",
              }}
            >
              {/* Premium radial ambient background */}
              <div
                style={{
                  position: "absolute",
                  width: "140%",
                  height: "140%",
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(255,20,147,0.10), rgba(255,255,255,0) 60%)",
                  zIndex: 0,
                  filter: "blur(40px)",
                }}
              />

              {/* MAIN IMAGE CARD — NO FLOAT */}
              <div
                style={{
                  width: "88%",
                  maxWidth: "460px",
                  aspectRatio: "4/5",
                  borderRadius: "28px",
                  position: "relative",
                  zIndex: 2,
                  padding: "14px",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.65), rgba(255,255,255,0.25))",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  boxShadow:
                    "0 40px 80px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                {/* inner image */}
                <div
  style={{
    width: "100%",
    height: "100%",
    borderRadius: "22px",
    overflow: "hidden",
    position: "relative",
    background: "transparent",
  }}
>

                  <img
                    src="images/img_bowl.png"
                    alt="Healthy Bowl"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                </div>
              </div>

              {/* FLOATING PROTEIN CARD */}
              <div
                style={{
                  position: "absolute",
                  top: "22%",
                  left: "-6%",
                  zIndex: 3,
                  padding: "1rem 1.3rem",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  animation: "float 7s ease-in-out infinite",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(255,20,147,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FF1493",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#999",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Protein
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#111",
                    }}
                  >
                    42g
                  </div>
                </div>
              </div>

              {/* DELIVERY CARD */}
              <div
                style={{
                  position: "absolute",
                  bottom: "18%",
                  right: "-8%",
                  zIndex: 3,
                  padding: "0.9rem 1.2rem",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  animation: "float 6s ease-in-out infinite",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF1493"
                  strokeWidth="2.2"
                >
                  <path d="M3 12h13l3 3v4H3z" />
                  <circle cx="7" cy="20" r="1" />
                  <circle cx="17" cy="20" r="1" />
                </svg>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.65rem", color: "#999" }}>
                    Next Delivery
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111" }}>
                    Tomorrow · 12 PM
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* --- 3. Curved Bottom Shape --- */}
          <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, zIndex: 5 }}>
            <svg viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ width: '100%', height: '60px', display: 'block' }}>
              <path
                fill="#ffffff"
                d="M0,40 C320,100 640,100 960,60 C1120,40 1280,20 1440,30 L1440,100 L0,100 Z"
              />
            </svg>
          </div>

        </section>

        {/* MENU */}
        <section
          id="menu"
          style={{
            position: 'relative',
            padding: '6rem 1.5rem',
            backgroundColor: isDark ? bgDark : bgWhite,
            overflow: 'hidden',
          }}
        >
          <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap');
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    
    @keyframes slideFromCard {
      from { 
        opacity: 0;
        transform: translateX(-50px);
        width: 0;
      }
      to { 
        opacity: 1;
        transform: translateX(0);
        width: 100%;
      }
    }
    
    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .menu-badge-dot {
      animation: pulseGlow 2s ease-in-out infinite;
    }
    
    .menu-cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-decoration: none;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .menu-cta-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1.5px;
      background: linear-gradient(135deg, rgba(196,30,115,0.5), rgba(255,255,255,0.08), rgba(233,30,99,0.5));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }
    
    .menu-cta-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, #C41E73, #E91E63);
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    
    .menu-cta-btn:hover::after {
      opacity: 1;
    }
    
    .menu-cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(196,30,115,0.3);
    }
    
    .menu-cta-btn span,
    .menu-cta-btn svg {
      position: relative;
      z-index: 1;
      transition: all 0.4s ease;
    }
    
    .menu-cta-btn:hover span,
    .menu-cta-btn:hover svg {
      color: #fff !important;
    }
    
    .menu-cta-btn:hover svg {
      transform: translateX(4px);
    }
    
    .menu-loader-ring {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      position: relative;
    }
    
    .menu-loader-ring::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 2px;
      background: linear-gradient(135deg, #C41E73, transparent 60%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: spin 1s linear infinite;
    }
    
    /* Desktop Carousel */
    .carouselOuter {
      position: relative;
      width: 100%;
      margin-bottom: 3.5rem;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .carouselTrack {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      scroll-behavior: smooth;
      padding: 25px 60px;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .carouselTrack::-webkit-scrollbar {
      display: none;
    }
    
    .carouselItemWrapper {
      flex-shrink: 0;
      display: flex;
      gap: 0;
      align-items: stretch;
      transition: gap 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .carouselItemWrapper.expanded {
      gap: 18px;
    }
    
    .carouselCard {
      flex: 0 0 180px;
      height: 420px;
      border-radius: 20px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      background: ${isDark ? '#1a1a1a' : '#f5f5f5'};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .carouselCard::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 2px;
      background: linear-gradient(145deg, rgba(196,30,115,0.4), rgba(233,30,99,0.3));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    
    .carouselCard:hover::before {
      opacity: 1;
    }
    
    .carouselCard.active {
      flex: 0 0 360px;
      box-shadow: 0 12px 40px rgba(196, 30, 115, 0.3);
      transform: translateY(-4px);
    }
    
    .carouselCard.active::before {
      opacity: 1;
      background: linear-gradient(145deg, #C41E73, #E91E63);
    }
    
    .carouselCard img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .carouselCard:hover img {
      transform: scale(1.05);
    }
    
    .carouselCard.active img {
      transform: scale(1);
    }
    
    .overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 16px;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, transparent 100%);
      color: white;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: padding 0.6s ease;
    }
    
    .carouselCard.active .overlay {
      padding: 24px 20px;
    }
    
    .overlayTitle {
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.25;
      margin: 0;
      text-shadow: 0 2px 12px rgba(0,0,0,0.5);
      transition: font-size 0.6s ease;
    }
    
    .carouselCard.active .overlayTitle {
      font-size: 1.4rem;
    }
    
    .detailCard {
      flex: 0 0 0;
      width: 0;
      height: 420px;
      overflow: hidden;
      opacity: 0;
      transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: 20px;
      background: ${isDark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.98)'};
      backdrop-filter: blur(30px);
      border: 1.5px solid ${isDark ? 'rgba(196,30,115,0.3)' : 'rgba(196,30,115,0.2)'};
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      position: relative;
      transform: translateX(-30px);
    }
    
    .detailCard::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #C41E73, #E91E63, #FF1493);
      border-radius: 20px 20px 0 0;
    }
    
    .detailCard.visible {
      flex: 0 0 720px;
      width: 720px;
      opacity: 1;
      transform: translateX(0);
    }
    
    .detailContent {
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .detailHeader {
      margin-bottom: 0.8rem;
      padding-bottom: 0.8rem;
      border-bottom: 1.5px solid ${isDark ? 'rgba(196,30,115,0.25)' : 'rgba(196,30,115,0.15)'};
    }
    
    .detailTitle {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: ${textMain};
      margin: 0 0 0.3rem 0;
      line-height: 1.2;
    }
    
    .detailSubtitle {
      font-size: 0.68rem;
      color: ${pinkDeep};
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    
    .detailDescription {
      font-size: 0.78rem;
      line-height: 1.5;
      color: ${textMuted};
      margin-bottom: 0.8rem;
    }
    
    .detailSection {
      margin-bottom: 0.8rem;
    }
    
    .detailSectionTitle {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: ${pinkDeep};
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    
    .detailSectionContent {
      font-size: 0.75rem;
      line-height: 1.5;
      color: ${textMain};
    }
    
    .macroGrid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin: 0.8rem 0;
    }
    
    .macroCard {
      text-align: center;
      padding: 0.6rem 0.3rem;
      border-radius: 10px;
      background: ${isDark ? 'rgba(196,30,115,0.12)' : 'rgba(196,30,115,0.08)'};
      border: 1px solid ${isDark ? 'rgba(196,30,115,0.2)' : 'rgba(196,30,115,0.15)'};
      transition: all 0.3s ease;
    }
    
    .macroCard:hover {
      background: ${isDark ? 'rgba(196,30,115,0.18)' : 'rgba(196,30,115,0.12)'};
      transform: translateY(-2px);
    }
    
    .macroValue {
      font-size: 1.1rem;
      font-weight: 700;
      color: ${pinkDeep};
      display: block;
      line-height: 1;
    }
    
    .macroLabel {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${textMuted};
      margin-top: 0.3rem;
      display: block;
    }
    
    .ingredientsList {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    
    .ingredientTag {
      padding: 0.35rem 0.7rem;
      border-radius: 16px;
      font-size: 0.65rem;
      background: ${isDark ? 'rgba(196,30,115,0.15)' : 'rgba(196,30,115,0.1)'};
      color: ${textMain};
      border: 1px solid ${isDark ? 'rgba(196,30,115,0.25)' : 'rgba(196,30,115,0.2)'};
      transition: all 0.3s ease;
      font-weight: 500;
      line-height: 1;
    }
    
    .ingredientTag:hover {
      background: ${isDark ? 'rgba(196,30,115,0.22)' : 'rgba(196,30,115,0.15)'};
      transform: translateY(-1px);
    }
    
    .scrollBtn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: ${isDark ? 'rgba(28,28,28,0.95)' : 'rgba(255,255,255,0.95)'};
      color: ${textMain};
      font-size: 24px;
      font-weight: 300;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .scrollBtn:hover {
      background: ${pinkDeep};
      color: white;
      transform: translateY(-50%) scale(1.15);
      box-shadow: 0 6px 32px rgba(196,30,115,0.4);
    }
    
    .scrollBtn:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    .scrollBtn.left { 
      left: 10px; 
    }
    
    .scrollBtn.right { 
      right: 10px; 
    }
    
    /* Mobile Grid */
    .mobileGrid {
      display: none;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      max-width: 900px;
      margin: 0 auto 3rem;
      padding: 0 1rem;
    }
    
    .mobileCard {
      aspect-ratio: 3/4;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      background: ${isDark ? '#1a1a1a' : '#f5f5f5'};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .mobileCard::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 2px;
      background: linear-gradient(145deg, rgba(196,30,115,0.4), rgba(233,30,99,0.3));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    
    .mobileCard:active {
      transform: scale(0.97);
    }
    
    .mobileCard:active::before {
      opacity: 1;
    }
    
    .mobileCard img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .mobileOverlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%);
      color: white;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    .mobileOverlayTitle {
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    
    /* Modal */
    .modalBackdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9998;
      animation: backdropFadeIn 0.3s ease;
    }
    
    .modalBackdrop.show {
      display: block;
    }
    
    .modalContainer {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .modalContainer.show {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modalContent {
      background: ${isDark ? 'rgba(26,26,26,0.98)' : 'rgba(255,255,255,0.98)'};
      backdrop-filter: blur(30px);
      border-radius: 24px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      border: 1.5px solid ${isDark ? 'rgba(196,30,115,0.3)' : 'rgba(196,30,115,0.2)'};
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    
    .modalContent::-webkit-scrollbar {
      width: 6px;
    }
    
    .modalContent::-webkit-scrollbar-track {
      background: ${isDark ? 'rgba(30,30,30,0.3)' : 'rgba(255,255,255,0.3)'};
    }
    
    .modalContent::-webkit-scrollbar-thumb {
      background: ${isDark ? 'rgba(196,30,115,0.4)' : 'rgba(196,30,115,0.3)'};
      border-radius: 10px;
    }
    
    .modalContent::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #C41E73, #E91E63, #FF1493);
      border-radius: 24px 24px 0 0;
    }
    
    .modalHeader {
      position: relative;
      height: 200px;
      border-radius: 24px 24px 0 0;
      overflow: hidden;
    }
    
    .modalHeader img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .modalCloseBtn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 10;
    }
    
    .modalCloseBtn:hover {
      background: ${pinkDeep};
      transform: rotate(90deg);
    }
    
    .modalBody {
      padding: 1.5rem;
    }
    
    @media (max-width: 768px) {
      .carouselOuter {
        display: none;
      }
      
      .scrollBtn {
        display: none;
      }
      
      .mobileGrid {
        display: grid;
      }
      
      .modalContent {
        margin: 1rem;
      }
    }
    
    @media (max-width: 480px) {
      .mobileGrid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.8rem;
      }
    }
  `}</style>

          {/* Decorative Background Elements */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              right: '8%',
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${isDark ? 'rgba(196,30,115,0.1)' : 'rgba(196,30,115,0.08)'} 0%, transparent 70%)`,
              pointerEvents: 'none',
              filter: 'blur(40px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '5%',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${isDark ? 'rgba(233,30,99,0.08)' : 'rgba(233,30,99,0.06)'} 0%, transparent 70%)`,
              pointerEvents: 'none',
              filter: 'blur(40px)',
            }}
          />

          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '4rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                backgroundColor: isDark ? 'rgba(196,30,115,0.15)' : 'rgba(196,30,115,0.08)',
                marginBottom: '1.5rem',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  padding: 1,
                  background: `linear-gradient(135deg, ${isDark ? 'rgba(233,30,99,0.5)' : 'rgba(196,30,115,0.3)'}, transparent)`,
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <span
                className="menu-badge-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: pinkDeep,
                }}
              />
              <span
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                Explore our menu
              </span>
            </div>
            <h2
              style={{
                margin: '0 0 1rem 0',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: textMain,
              }}
            >
              Bowls for different metabolic{' '}
              <em style={{ fontStyle: 'italic', color: pinkDeep }}>"days"</em>
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.95rem',
                color: textMuted,
                maxWidth: '36rem',
                lineHeight: 1.75,
                opacity: 0.75,
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              }}
            >
              Focus, train, recover or keep it light. Switch profiles without
              losing your base macros or ingredient preferences.
            </p>
          </div>

          {loading ? (
            <div
              style={{
                padding: '4rem 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
              }}
            >
              <div className="menu-loader-ring" />
              <p style={{ fontSize: '0.82rem', color: textMuted, opacity: 0.6 }}>
                Loading featured bowls…
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Carousel */}
              <div className="carouselOuter">
                <button
                  className="scrollBtn left"
                  onClick={() => {
                    const track = document.getElementById('carouselTrack');
                    if (track) {
                      track.scrollBy({ left: -500, behavior: 'smooth' });
                    }
                  }}
                  aria-label="Scroll left"
                >
                  ‹
                </button>
                <button
                  className="scrollBtn right"
                  onClick={() => {
                    const track = document.getElementById('carouselTrack');
                    if (track) {
                      track.scrollBy({ left: 500, behavior: 'smooth' });
                    }
                  }}
                  aria-label="Scroll right"
                >
                  ›
                </button>
                <div className="carouselTrack" id="carouselTrack">
                  {bowlsData.map((bowl, i) => {
                    const num = 101 + i;
                    return (
                      <div
                        key={num}
                        className={`carouselItemWrapper ${i === 0 ? 'expanded' : ''}`}
                        data-wrapper-id={num}
                      >
                        <div
                          className={`carouselCard ${i === 0 ? 'active' : ''}`}
                          onClick={(e) => {
                            const card = e.currentTarget;
                            const wasActive = card.classList.contains('active');
                            const wrapper = card.parentElement;
                            const detailCard = wrapper?.querySelector('.detailCard');

                            // Remove active state from all cards and hide all details
                            document.querySelectorAll('.carouselCard').forEach((el) => {
                              el.classList.remove('active');
                            });
                            document.querySelectorAll('.carouselItemWrapper').forEach((el) => {
                              el.classList.remove('expanded');
                            });
                            document.querySelectorAll('.detailCard').forEach((el) => {
                              el.classList.remove('visible');
                            });

                            // Toggle current card
                            if (!wasActive) {
                              card.classList.add('active');
                              wrapper?.classList.add('expanded');
                              setTimeout(() => {
                                if (detailCard) {
                                  detailCard.classList.add('visible');
                                }
                              }, 300);
                            }
                          }}
                        >
                          <img src={`/menu/bowl${num}.jpg`} alt={bowl.name} />
                          <div className="overlay">
                            <h3 className="overlayTitle">{bowl.name}</h3>
                          </div>
                        </div>

                        <div className={`detailCard ${i === 0 ? 'visible' : ''}`}>
                          <div className="detailContent">
                            <div>
                              <div className="detailHeader">
                                <p className="detailSubtitle">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                  </svg>
                                  Bowl Details
                                </p>
                                <h3 className="detailTitle">{bowl.name}</h3>
                              </div>

                              <p className="detailDescription">{bowl.description}</p>

                              <div className="detailSection">
                                <div className="detailSectionTitle">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                  </svg>
                                  How It's Made
                                </div>
                                <div className="detailSectionContent">{bowl.howItsMade}</div>
                              </div>

                              <div className="macroGrid">
                                <div className="macroCard">
                                  <span className="macroValue">{bowl.calories}</span>
                                  <span className="macroLabel">Cal</span>
                                </div>
                                <div className="macroCard">
                                  <span className="macroValue">{bowl.protein}g</span>
                                  <span className="macroLabel">Protein</span>
                                </div>
                                <div className="macroCard">
                                  <span className="macroValue">{bowl.carbs}g</span>
                                  <span className="macroLabel">Carbs</span>
                                </div>
                                <div className="macroCard">
                                  <span className="macroValue">{bowl.fats}g</span>
                                  <span className="macroLabel">Fats</span>
                                </div>
                              </div>
                            </div>

                            <div className="detailSection" style={{ marginTop: 'auto' }}>
                              <div className="detailSectionTitle">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                  <line x1="7" y1="7" x2="7.01" y2="7" />
                                </svg>
                                Ingredients
                              </div>
                              <div className="ingredientsList">
                                {bowl.ingredients.map((ingredient, idx) => (
                                  <span key={idx} className="ingredientTag">{ingredient}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Grid */}
              <div className="mobileGrid">
                {bowlsData.map((bowl, i) => {
                  const num = 101 + i;
                  return (
                    <div
                      key={num}
                      className="mobileCard"
                      onClick={() => {
                        const modal = document.getElementById('bowlModal');
                        const backdrop = document.getElementById('modalBackdrop');
                        const modalImg = document.getElementById('modalImage');
                        const modalTitle = document.getElementById('modalTitle');
                        const modalDesc = document.getElementById('modalDescription');
                        const modalHow = document.getElementById('modalHow');
                        const modalCal = document.getElementById('modalCal');
                        const modalProtein = document.getElementById('modalProtein');
                        const modalCarbs = document.getElementById('modalCarbs');
                        const modalFats = document.getElementById('modalFats');
                        const modalIngredients = document.getElementById('modalIngredients');

                        if (modal && backdrop) {
                          modalImg.src = `/menu/bowl${num}.jpg`;
                          modalImg.alt = bowl.name;
                          modalTitle.textContent = bowl.name;
                          modalDesc.textContent = bowl.description;
                          modalHow.textContent = bowl.howItsMade;
                          modalCal.textContent = bowl.calories;
                          modalProtein.textContent = bowl.protein + 'g';
                          modalCarbs.textContent = bowl.carbs + 'g';
                          modalFats.textContent = bowl.fats + 'g';

                          modalIngredients.innerHTML = '';
                          bowl.ingredients.forEach(ingredient => {
                            const tag = document.createElement('span');
                            tag.className = 'ingredientTag';
                            tag.textContent = ingredient;
                            modalIngredients.appendChild(tag);
                          });

                          backdrop.classList.add('show');
                          modal.classList.add('show');
                          document.body.style.overflow = 'hidden';
                        }
                      }}
                    >
                      <img src={`/menu/bowl${num}.jpg`} alt={bowl.name} />
                      <div className="mobileOverlay">
                        <h3 className="mobileOverlayTitle">{bowl.name}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal for Mobile */}
              <div
                id="modalBackdrop"
                className="modalBackdrop"
                onClick={() => {
                  document.getElementById('modalBackdrop').classList.remove('show');
                  document.getElementById('bowlModal').classList.remove('show');
                  document.body.style.overflow = '';
                }}
              />
              <div id="bowlModal" className="modalContainer">
                <div className="modalContent" onClick={(e) => e.stopPropagation()}>
                  <div className="modalHeader">
                    <img id="modalImage" src="" alt="" />
                    <button
                      className="modalCloseBtn"
                      onClick={() => {
                        document.getElementById('modalBackdrop').classList.remove('show');
                        document.getElementById('bowlModal').classList.remove('show');
                        document.body.style.overflow = '';
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modalBody">
                    <div className="detailHeader">
                      <p className="detailSubtitle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        Bowl Details
                      </p>
                      <h3 className="detailTitle" id="modalTitle"></h3>
                    </div>

                    <p className="detailDescription" id="modalDescription"></p>

                    <div className="detailSection">
                      <div className="detailSectionTitle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                        How It's Made
                      </div>
                      <div className="detailSectionContent" id="modalHow"></div>
                    </div>

                    <div className="macroGrid">
                      <div className="macroCard">
                        <span className="macroValue" id="modalCal"></span>
                        <span className="macroLabel">Cal</span>
                      </div>
                      <div className="macroCard">
                        <span className="macroValue" id="modalProtein"></span>
                        <span className="macroLabel">Protein</span>
                      </div>
                      <div className="macroCard">
                        <span className="macroValue" id="modalCarbs"></span>
                        <span className="macroLabel">Carbs</span>
                      </div>
                      <div className="macroCard">
                        <span className="macroValue" id="modalFats"></span>
                        <span className="macroLabel">Fats</span>
                      </div>
                    </div>

                    <div className="detailSection" style={{ marginTop: '1.2rem' }}>
                      <div className="detailSectionTitle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        Ingredients
                      </div>
                      <div className="ingredientsList" id="modalIngredients"></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <Link
              href="/bowls"
              className="menu-cta-btn"
              style={{
                backgroundColor: isDark ? baseCard : bgWhite,
                color: textMain,
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              }}
            >
              <span>View full menu</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </section>

        {/* WHY US */}
        <section
          id="why-us"
          style={{
            padding: '4.75rem 1.5rem',
            backgroundColor: isDark ? bgDark : bgWhite,
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns:
                typeof window !== 'undefined' && window.innerWidth < 960
                  ? '1fr'
                  : 'minmax(0, 1.15fr) minmax(0, 1.15fr)',
              gap: '2.8rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                Why Picoso
              </p>
              <h2
                style={{
                  margin: 0,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  fontSize: '1.7rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: textMain,
                }}
              >
                Systemised nutrition for ambitious weeks.
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: 1.8,
                  color: textMuted,
                  maxWidth: '30rem',
                }}
              >
                Not just "healthy food". Bowls are built around repeatable macro
                patterns so you can stack energy, training and deep work without
                overthinking meals.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  typeof window !== 'undefined' && window.innerWidth < 960
                    ? '1fr'
                    : 'repeat(3, minmax(0, 1fr))',
                gap: '1.3rem',
              }}
            >
              {[
                {
                  icon: Heart,
                  title: 'Macro-first',
                  desc: 'Protein, fiber and fats tuned for stability, not just calories.',
                },
                {
                  icon: Leaf,
                  title: 'Clean inputs',
                  desc: 'Whole ingredients, no seed oils, no synthetic shortcuts.',
                },
                {
                  icon: Zap,
                  title: 'Operational speed',
                  desc: 'Routed for heat and crispness. 15 minutes to your desk.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: baseCard,
                      padding: '1.35rem',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(196,30,115,0.3)';
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(196,30,115,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#3D1A2E' : pinkPale,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        color: pinkDeep,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: 6,
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: textMain,
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        lineHeight: 1.7,
                        color: textMuted,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section
          id="process"
          style={{
            padding: '4.5rem 1.5rem',
            backgroundColor: isDark ? '#1F0D18' : pinkPale,
            borderTop: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns:
                typeof window !== 'undefined' && window.innerWidth < 960
                  ? '1fr'
                  : 'minmax(0, 1.2fr) minmax(0, 1.1fr)',
              gap: '3.25rem',
              alignItems: 'center',
            }}
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <p
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                How it works
              </p>
              <h2
                style={{
                  margin: 0,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  fontSize: '1.6rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: textMain,
                }}
              >
                Three taps from idea to delivered routine.
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: 1.8,
                  color: textMuted,
                  maxWidth: '32rem',
                }}
              >
                The UI is designed to feel like configuring a product, not
                placing a random food order. Profiles, macros, and pricing stay
                visible while you tweak.
              </p>

              <ol
                style={{
                  listStyle: 'none',
                  margin: '1.3rem 0 0',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  fontSize: '0.88rem',
                  color: textMuted,
                }}
              >
                {[
                  'Choose a profile: focus, train, recover or light.',
                  'Swap bases, proteins and sides while macros update live.',
                  'Save your stack. Reorder it in seconds next week.',
                ].map((step, idx) => (
                  <li
                    key={step}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '12px',
                        border: `1px solid rgba(196,30,115,0.5)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: pinkDeep,
                        backgroundColor: isDark ? '#2A1520' : pinkSoft,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Macro card */}
            <div
              style={{
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                backgroundColor: baseCard,
                padding: '1.3rem',
                boxShadow: isDark ? 'none' : '0 8px 40px rgba(196,30,115,0.08)',
              }}
            >
              <div
                style={{
                  borderRadius: '12px',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(196,30,115,0.15), rgba(233,30,99,0.1), rgba(255,20,147,0.08))'
                    : 'linear-gradient(135deg, #FCE4EC, #FFF0F5, #FFE4F0)',
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.1fr',
                  gap: '0.9rem',
                }}
              >
                <div
                  style={{
                    borderRadius: '12px',
                    backgroundColor: isDark ? '#2A1520' : '#FFFFFF',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.7rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: textMuted,
                      fontWeight: 600,
                    }}
                  >
                    <span>Macros per bowl</span>
                    <span style={{ fontSize: '0.72rem' }}>example stack</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '0.55rem',
                    }}
                  >
                    {[
                      { label: 'Protein', value: '32g', color: '#C41E73' },
                      { label: 'Carbs', value: '48g', color: '#E91E63' },
                      { label: 'Fats', value: '14g', color: '#FF1493' },
                    ].map((macro, idx) => (
                      <div
                        key={macro.label}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: textMuted,
                            fontWeight: 500,
                          }}
                        >
                          {macro.label}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: 5,
                            borderRadius: '12px',
                            backgroundColor: isDark
                              ? 'rgba(212,165,196,0.2)'
                              : '#FCE4EC',
                          }}
                        >
                          <div
                            style={{
                              width:
                                idx === 0 ? '78%' : idx === 1 ? '60%' : '42%',
                              height: '100%',
                              borderRadius: '12px',
                              background: macro.color,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: textMain,
                          }}
                        >
                          {macro.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '12px',
                    backgroundColor: isDark ? '#2A1520' : '#FFFFFF',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: pinkDeep,
                      fontWeight: 600,
                    }}
                  >
                    <Leaf size={16} />
                    <span>Ingredients snapshot</span>
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1rem',
                      color: textMuted,
                      lineHeight: 1.7,
                    }}
                  >
                    <li>Wild rice + quinoa base</li>
                    <li>Roasted seasonal vegetables</li>
                    <li>Cold-pressed dressing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section
          id="results"
          style={{
            padding: '4.75rem 1.5rem',
            backgroundColor: isDark ? bgDark : bgWhite,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns:
                typeof window !== 'undefined' && window.innerWidth < 960
                  ? '1fr'
                  : 'minmax(0, 1.35fr) minmax(0, 1.1fr)',
              gap: '2.9rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                Outcomes
              </p>
              <h3
                style={{
                  margin: 0,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: textMain,
                }}
              >
                Built from data, not vibes.
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: textMuted,
                  maxWidth: '34rem',
                  lineHeight: 1.8,
                }}
              >
                The patterns below are from real users who run demanding
                calendars: founders, PMs, sales teams and athletes. The bowls
                slot into their week like infrastructure.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    typeof window !== 'undefined' && window.innerWidth < 900
                      ? '1fr'
                      : 'repeat(2, minmax(0, 1fr))',
                  gap: '1.1rem',
                  marginTop: '1rem',
                }}
              >
                {[
                  {
                    label: 'Energy dips',
                    stat: '-38%',
                    desc: 'Self-reported afternoon crashes after two weeks.',
                  },
                  {
                    label: 'Decision time',
                    stat: '27s',
                    desc: 'Median time to reorder a saved stack.',
                  },
                  {
                    label: 'Prep overhead',
                    stat: '-80%',
                    desc: 'Vs. DIY meal prep ingredients and cleanup.',
                  },
                  {
                    label: 'Weekly loyalty',
                    stat: '78%',
                    desc: 'Users ordering 4+ bowls each week.',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: baseCard,
                      padding: '0.9rem 1rem',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(196,30,115,0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = borderColor;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: textMuted,
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        margin: '0.2rem 0 0.25rem',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        background:
                          'linear-gradient(135deg, #C41E73, #E91E63, #FF1493)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {item.stat}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: textMuted,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern card */}
            <div
              style={{
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                backgroundColor: baseCard,
                padding: '1.4rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: textMuted,
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                Typical rhythm
              </p>
              <h4
                style={{
                  margin: '0.5rem 0 0.6rem',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: textMain,
                }}
              >
                How most users actually run Picoso.
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.1rem',
                  fontSize: '0.86rem',
                  color: textMuted,
                  lineHeight: 1.9,
                }}
              >
                <li>3–5 bowls per week depending on load.</li>
                <li>One saved config each for "work", "train" and "easy".</li>
                <li>Lunch is default; dinners added on heavy weeks.</li>
              </ul>
              <div
                style={{
                  marginTop: '1.4rem',
                  borderRadius: '12px',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(196,30,115,0.2), rgba(233,30,99,0.12), rgba(255,20,147,0.1))'
                    : 'linear-gradient(135deg, #FCE4EC, #FFF0F5, #FFE4F0)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.78rem',
                    color: textMuted,
                    fontWeight: 500,
                  }}
                >
                  Typical weekly stack
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: 600,
                    color: pinkDeep,
                  }}
                >
                  12 bowls
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: textMuted,
                  }}
                >
                  Enough to cover lunch on all workdays plus 2–3 training days.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="membership"
          style={{
            position: 'relative',
            padding: '4rem 1.5rem',
            backgroundColor: isDark ? bgDark : bgWhite,
            overflow: 'hidden',
          }}
        >
          <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap');
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes cardLift {
      from { transform: translateY(10px); }
      to { transform: translateY(0); }
    }
    
    .pricing-container {
      max-width: 1100px;
      margin: 0 auto;
    }
    
    .pricing-header {
      text-align: center;
      margin-bottom: 3.5rem;
    }
    
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1.2rem;
      background: linear-gradient(135deg, rgba(196,30,115,0.15), rgba(233,30,99,0.1));
      border: 1px solid rgba(196,30,115,0.2);
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      color: ${pinkDeep};
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
      font-family: 'Inter', sans-serif;
    }
    
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(2.2rem, 5vw, 3rem);
      font-weight: 500;
      line-height: 1.15;
      color: ${textMain};
      margin: 0 0 1rem 0;
      letter-spacing: -0.02em;
    }
    
    .section-subtitle {
      font-size: 1.1rem;
      color: ${textMuted};
      max-width: 32rem;
      margin: 0 auto;
      line-height: 1.7;
      font-family: 'Inter', sans-serif;
      font-weight: 400;
    }
    
    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.75rem;
      margin-bottom: 4rem;
    }
    
    .pricing-card {
      position: relative;
      background: ${isDark ? 'rgba(25,25,30,0.85)' : 'rgba(255,255,255,0.95)'};
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 2rem;
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation: cardLift 0.6s ease-out forwards;
      overflow: hidden;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
    }
    
    .pricing-card:nth-child(1) { animation-delay: 0.1s; }
    .pricing-card:nth-child(2) { animation-delay: 0.2s; }
    .pricing-card:nth-child(3) { animation-delay: 0.3s; }
    
    .pricing-card:hover {
      transform: translateY(-8px);
      border-color: rgba(196,30,115,0.3);
      box-shadow: 0 25px 50px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}, 0 0 0 1px rgba(196,30,115,0.1);
    }
    
    .pricing-card.featured {
      background: linear-gradient(145deg, 
        ${isDark ? 'rgba(35,20,35,0.9)' : 'rgba(255,248,252,0.95)'} 0%,
        ${isDark ? 'rgba(25,25,30,0.85)' : 'rgba(255,255,255,0.95)'} 100%
      );
      border: 2px solid rgba(196,30,115,0.25);
      transform: translateY(-4px);
      padding: 2.25rem;
    }
    
    .pricing-card.featured:hover {
      border-color: rgba(196,30,115,0.5);
      box-shadow: 0 35px 70px ${isDark ? 'rgba(196,30,115,0.25)' : 'rgba(196,30,115,0.2)'}, 0 0 0 1px rgba(196,30,115,0.2);
    }
    
    .plan-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 1rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 1.25rem;
    }
    
    .plan-badge.primary {
      background: linear-gradient(135deg, rgba(196,30,115,0.15), rgba(233,30,99,0.1));
      color: ${pinkDeep};
      border: 1px solid rgba(196,30,115,0.2);
    }
    
    .plan-badge.featured {
      background: linear-gradient(135deg, #C41E73, #E91E63);
      color: white;
      box-shadow: 0 4px 20px rgba(196,30,115,0.3);
      font-size: 0.72rem;
    }
    
    .plan-name {
      font-family: 'Playfair Display', serif;
      font-size: 1.6rem;
      font-weight: 600;
      color: ${textMain};
      margin: 0 0 0.75rem 0;
      letter-spacing: -0.015em;
    }
    
    .price-section {
      margin-bottom: 1.5rem;
    }
    
    .price-amount {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      margin-bottom: 0.25rem;
    }
    
    .price-currency {
      font-size: 1.3rem;
      font-weight: 600;
      color: ${pinkDeep};
      font-family: 'Inter', sans-serif;
    }
    
    .price-value {
      font-size: 2.8rem;
      font-weight: 800;
      background: linear-gradient(135deg, ${pinkDeep}, #E91E63);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      font-family: 'Inter', sans-serif;
    }
    
    .price-period {
      font-size: 0.95rem;
      color: ${textMuted};
      font-weight: 500;
      font-family: 'Inter', sans-serif;
    }
    
    .price-total {
      font-size: 0.8rem;
      color: ${textMuted};
      font-weight: 500;
      background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(196,30,115,0.04)'};
      padding: 0.6rem 1rem;
      border-radius: 10px;
      border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,30,115,0.1)'};
    }
    
    .features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1.75rem 0;
    }
    
    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      font-size: 0.92rem;
      color: ${textMain};
      line-height: 1.55;
      border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
    }
    
    .feature-item:last-child {
      border-bottom: none;
    }
    
    .feature-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: linear-gradient(135deg, #C41E73, #E91E63);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .cta-button {
      width: 100%;
      padding: 1rem 1.5rem;
      border-radius: 14px;
      border: none;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.025em;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      font-family: 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
    }
    
    .cta-primary {
      background: linear-gradient(135deg, #C41E73, #E91E63);
      color: white;
      box-shadow: 0 8px 25px rgba(196,30,115,0.3);
    }
    
    .cta-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(196,30,115,0.4);
    }
    
    .cta-secondary {
      background: transparent;
      color: ${textMain};
      border: 2px solid rgba(196,30,115,0.2);
    }
    
    .cta-secondary:hover {
      background: rgba(196,30,115,0.08);
      border-color: ${pinkDeep};
      color: ${pinkDeep};
    }
    
    .trust-section {
      text-align: center;
      padding-top: 3rem;
      border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
    }
    
    .trust-metrics {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2.5rem;
      margin-bottom: 1.75rem;
    }
    
    .metric-item {
      text-align: center;
    }
    
    .metric-number {
      font-size: 2.2rem;
      font-weight: 800;
      background: linear-gradient(135deg, ${pinkDeep}, #E91E63);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.4rem;
      font-family: 'Inter', sans-serif;
    }
    
    .metric-label {
      font-size: 0.85rem;
      color: ${textMuted};
      font-weight: 500;
      font-family: 'Inter', sans-serif;
    }
    
    .trust-footer {
      font-size: 0.82rem;
      color: ${textMuted};
      opacity: 0.7;
      font-family: 'Inter', sans-serif;
    }
    
    @media (max-width: 768px) {
      .pricing-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      
      .pricing-card.featured {
        padding: 2rem;
      }
      
      .price-value {
        font-size: 2.4rem;
      }
      
      .trust-metrics {
        gap: 2rem;
      }
    }
  `}</style>

          <div className="pricing-container">
            {/* Header */}
            <div className="pricing-header">
              <div className="header-badge">Premium Membership</div>
              <h2 className="section-title">
                Choose your <span style={{ color: pinkDeep }}>perfect plan</span>
              </h2>
              <p className="section-subtitle">
                Fuel your fitness transformation with nutrition designed for real results.
                Meals crafted for strength, energy, and consistency.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="pricing-grid">
              {/* Weekly Plan */}
              <div
                className="pricing-card"
                onClick={() => {
                  window.open(
                    'https://wa.me/918167080111?text=Hi%2C%20I%27m%20ready%20to%20start%20my%20fitness%20journey%20with%20your%20Weekly%20Plan.%20The%207-day%20structure%20feels%20perfect%20to%20build%20momentum%20toward%20my%20transformation%20goals.%20Can%20we%20discuss%20delivery%20details%3F',
                    '_blank'
                  );
                }}
              >
                <div className="plan-badge primary">Flexible Weekly</div>
                <h3 className="plan-name">Weekly Plan</h3>
                <div className="price-section">
                  <div className="price-amount">
                    <span className="price-currency">₹</span>
                    <span className="price-value">220</span>
                    <span className="price-period">/day</span>
                  </div>
                  <div className="price-total">
                    ₹1,540 billed weekly
                  </div>
                </div>
                <ul className="features-list">
                  <li className="feature-item"><div className="feature-icon">✓</div>7 days premium meals delivered daily</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Balanced breakfast bowls for energy</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Fresh ingredients sourced daily</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Cancel or pause anytime</li>
                </ul>
                <button className="cta-secondary cta-button">
                  Start Weekly Transformation
                </button>
              </div>

              {/* Monthly Plan - Featured */}
              <div
                className="pricing-card featured"
                onClick={() => {
                  window.open(
                    'https://wa.me/918167080111?text=Hi%2C%20I%27m%20excited%20about%20your%20Monthly%20Plan%20for%20my%20fitness%20journey.%20The%2030-day%20consistency%20will%20help%20me%20build%20lasting%20habits%20toward%20my%20transformation.%20What%20are%20the%20next%20steps%3F',
                    '_blank'
                  );
                }}
              >
                <div className="plan-badge featured">Most Popular</div>
                <h3 className="plan-name">Monthly Plan</h3>
                <div className="price-section">
                  <div className="price-amount">
                    <span className="price-currency">₹</span>
                    <span className="price-value">200</span>
                    <span className="price-period">/day</span>
                  </div>
                  <div className="price-total">
                    ₹6,000 billed monthly
                    <br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Save ₹600 vs weekly</span>
                  </div>
                </div>
                <ul className="features-list">
                  <li className="feature-item"><div className="feature-icon">✓</div>30 days premium meals daily</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Priority support & scheduling</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>All weekly benefits included</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Perfect for transformation</li>
                </ul>
                <button className="cta-primary cta-button">
                  Begin Monthly Journey
                </button>
              </div>

              {/* 3 Months Plan */}
              <div
                className="pricing-card"
                onClick={() => {
                  window.open(
                    'https://wa.me/918167080111?text=Hi%2C%20Your%203-Month%20Plan%20perfectly%20aligns%20with%20my%20long-term%20fitness%20transformation.%20The%2090-day%20commitment%20with%20customization%20options%20feels%20right%20for%20sustainable%20results.%20Let%27s%20get%20started%21',
                    '_blank'
                  );
                }}
              >
                <div className="plan-badge primary">Best Value</div>
                <h3 className="plan-name">3 Months Plan</h3>
                <div className="price-section">
                  <div className="price-amount">
                    <span className="price-currency">₹</span>
                    <span className="price-value">180</span>
                    <span className="price-period">/day</span>
                  </div>
                  <div className="price-total">
                    ₹16,200 billed quarterly
                    <br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Save ₹3,600 total</span>
                  </div>
                </div>
                <ul className="features-list">
                  <li className="feature-item"><div className="feature-icon">✓</div>90 days premium meals daily</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>Full meal customization</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>No coconut (allergen-free)</li>
                  <li className="feature-item"><div className="feature-icon">✓</div>VIP support & nutritionist</li>
                </ul>
                <button className="cta-secondary cta-button">
                  Commit to Transformation
                </button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="trust-section">
              <div className="trust-metrics">
                <div className="metric-item">
                  <div className="metric-number">100%</div>
                  <div className="metric-label">Fresh Ingredients</div>
                </div>
                <div className="metric-item">
                  <div className="metric-number">50+</div>
                  <div className="metric-label">Premium Members</div>
                </div>
                <div className="metric-item">
                  <div className="metric-number">4.9</div>
                  <div className="metric-label">Average Rating</div>
                </div>
              </div>
              <p className="trust-footer">
                Free delivery • No contracts • Cancel anytime
              </p>
            </div>
          </div>
        </section>


        {/* CTA / START */}
        <section
          id="start"
          style={{
            padding: '4.5rem 1.5rem 5.25rem',
            backgroundColor: isDark ? bgDark : bgWhite,
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              borderRadius: '12px',
              border: `1px solid ${borderColor}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(196,30,115,0.08), rgba(196,30,115,0.12))'
                : 'linear-gradient(135deg, rgba(196,30,115,0.04), rgba(252,228,236,0.5))',
              padding: '2.6rem 2.1rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative gradient orb */}
            <div
              style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(233,30,99,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: textMuted,
                fontFamily:
                  "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                textAlign: 'center',
                position: 'relative',
              }}
            >
              Ready
            </p>
            <h2
              style={{
                margin: '0.9rem 0 0.8rem',
                fontSize: '1.9rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                fontFamily:
                  "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                color: textMain,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              Turn "what do I eat?" into a 30‑second ritual.
            </h2>
            <p
              style={{
                margin: '0 0 1.9rem',
                fontSize: '0.9rem',
                lineHeight: 1.8,
                color: textMuted,
                textAlign: 'center',
                maxWidth: '36rem',
                marginInline: 'auto',
                position: 'relative',
              }}
            >
              Build a base stack once, then just adjust when life gets heavier.
              Your calendar changes every week; your nutrition system doesn't
              need to.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection:
                  typeof window !== 'undefined' && window.innerWidth < 640
                    ? 'column'
                    : 'row',
                gap: '0.9rem',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={() => {
                  const el = document.getElementById('membership');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  padding: '0.9rem 1.9rem',
                  fontSize: '0.82rem',
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background:
                    'linear-gradient(135deg, #C41E73, #E91E63, #FF1493)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: '0 4px 20px rgba(196,30,115,0.35)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 25px rgba(196,30,115,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 20px rgba(196,30,115,0.35)';
                }}
              >
                Burger se thoda mehenga hai...
              </button>


              <a
                href="tel:8167080111"
                style={{
                  borderRadius: '12px',
                  padding: '0.85rem 1.8rem',
                  fontSize: '0.82rem',
                  fontFamily:
                    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  fontWeight: 500,
                  textDecoration: 'none',
                  border: `1px solid ${borderColor}`,
                  color: textMain,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: isDark ? '#2A1520' : '#FFFFFF',
                  cursor: 'pointer',
                  transition:
                    'border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196,30,115,0.7)';
                  e.currentTarget.style.backgroundColor = isDark
                    ? '#3D1A2E'
                    : pinkSoft;
                  e.currentTarget.style.color = pinkDeep;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.backgroundColor = isDark
                    ? '#2A1520'
                    : '#FFFFFF';
                  e.currentTarget.style.color = textMain;
                }}
              >
                <Phone size={16} />
                <span>Talk to nutrition</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #1A0A14;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }

        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #C41E73, #E91E63);
          border-radius: 12px;
        }
      `}</style>
    </>
  );
}