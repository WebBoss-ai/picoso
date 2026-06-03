# Picoso Mobile App 📱

A complete, production-ready React Native (Expo) mobile application for Picoso — the healthy food delivery platform. Available for both **Android** (Google Play Store) and **iOS** (Apple App Store).

---

## 🚀 Features

### User Features
- **Phone OTP Authentication** — secure, passwordless login
- **Onboarding** — beautiful 3-slide introduction
- **Home Feed** — categories, featured items, bestsellers, platinum CTA
- **Menu Browsing** — grid/list view, search, category filter
- **Bowl Detail** — full image, nutrition facts, quantity control
- **Cart Management** — add/remove, quantity, price breakdown, free delivery threshold
- **Checkout** — address selection, COD & UPI payment, order notes
- **Order Tracking** — real-time status with animated progress tracker
- **Order History** — filterable list with status badges
- **Profile** — saved addresses, order summary, settings
- **Platinum Membership** — subscription with perks comparison
- **Address Management** — add/delete delivery addresses

### Design
- 🌿 Premium greenish brand theme (`#22c55e` primary)
- Smooth Reanimated animations throughout
- Skeleton loading states
- Haptic feedback on interactions
- Safe Area handling for notch/home-bar devices
- Dark gradient hero sections
- Frosted glass bottom tab bar (iOS)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **React Native** via **Expo SDK 52** |
| Routing | **Expo Router 4** (file-based, like Next.js) |
| Animations | **React Native Reanimated 3** |
| Gestures | **React Native Gesture Handler** |
| Images | **Expo Image** (caching, blurhash) |
| Lists | **FlashList** (high-performance) |
| Icons | **@expo/vector-icons** (Ionicons) |
| Gradients | **expo-linear-gradient** |
| Blur | **expo-blur** |
| Haptics | **expo-haptics** |
| Secure Storage | **expo-secure-store** |
| HTTP Client | **Axios** |
| Build | **EAS Build** |

---

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- iOS: Xcode (Mac only)
- Android: Android Studio

### Install Dependencies

```bash
cd mobile
npm install
```

### Download Inter Fonts

Download the Inter font family and place in `assets/fonts/`:
- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`
- `Inter-Bold.ttf`
- `Inter-ExtraBold.ttf`

Get from: https://fonts.google.com/specimen/Inter

### Add App Icons & Splash

Place the following in `assets/`:
- `icon.png` — 1024×1024 app icon (green background, Picoso logo)
- `splash.png` — 1284×2778 splash screen (dark green background)
- `adaptive-icon.png` — 1024×1024 for Android adaptive icon
- `favicon.png` — 32×32 web favicon

### Configure API URL

Update `.env`:
```env
EXPO_PUBLIC_API_URL=https://picoso.in/api
```

### Run on Device

```bash
# Start Expo development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios
```

---

## 🏗️ Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth group (login, verify)
│   ├── (tabs)/             # Main tab screens
│   ├── bowl/[id].js        # Bowl detail
│   ├── order/[id].js       # Order detail
│   ├── order-success/[id].js
│   ├── checkout.js
│   ├── platinum.js
│   ├── addresses.js
│   ├── onboarding.js
│   └── _layout.js          # Root layout
├── components/
│   ├── ui/                 # Design system components
│   └── *.js                # Feature components
├── constants/
│   ├── colors.js           # Brand colors
│   └── theme.js            # Typography, spacing, shadows
├── context/
│   ├── AuthContext.js
│   └── CartContext.js
├── lib/
│   ├── api.js              # Axios API client
│   └── storage.js          # SecureStore wrapper
└── assets/
    ├── fonts/              # Inter font files
    └── *.png               # App icons & splash
```

---

## 🚀 Building for Production

### Setup EAS

```bash
eas login
eas build:configure
```

Update `eas.json` with your project ID, and update `app.json` with:
- `ios.bundleIdentifier`: `com.picoso.app`
- `android.package`: `com.picoso.app`

### Build for Android (APK/AAB)

```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

### Build for iOS

```bash
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store Connect
eas submit --platform ios
```

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL (e.g., `https://picoso.in/api`) |

---

## 📱 Screens Overview

| Screen | Route | Description |
|--------|-------|-------------|
| Splash | `/` | Auto-redirects based on auth state |
| Onboarding | `/onboarding` | 3-slide intro (first launch only) |
| Login | `/(auth)/login` | Phone number input |
| Verify OTP | `/(auth)/verify` | 4-digit OTP confirmation |
| Home | `/(tabs)` | Feed with categories & items |
| Menu | `/(tabs)/menu` | Full menu with search & filter |
| Cart | `/(tabs)/cart` | Cart management |
| Orders | `/(tabs)/orders` | Order history |
| Profile | `/(tabs)/profile` | User profile & settings |
| Bowl Detail | `/bowl/[id]` | Item details + add to cart |
| Checkout | `/checkout` | Address, payment, order placement |
| Order Success | `/order-success/[id]` | Animated success screen |
| Order Detail | `/order/[id]` | Status tracker & order info |
| Platinum | `/platinum` | Membership subscription |
| Addresses | `/addresses` | Manage delivery addresses |

---

## 🎨 Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#22c55e` | Buttons, active states |
| Dark | `#16a34a` | Gradients, text |
| Deep BG | `#0a2e12` | Hero backgrounds |
| Platinum | `#f97316` | Premium accent |
| Surface | `#f0fdf4` | Light green backgrounds |

---

## 📞 Support

For backend setup, see the `backend/` directory README.

Built with ❤️ for Picoso.
