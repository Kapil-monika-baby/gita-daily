# Gita Daily

A cross-platform Bhagavad Gita companion: one verse, one moment of wisdom, every day.

## Product

### Free
- One daily shlok
- Sanskrit text
- Transliteration
- Meaning in the selected language
- Daily notifications
- Full 701-verse reader
- Basic wallpaper
- Bookmarks

### Plus
- ₹49/month
- ₹299/year (recommended)
- ₹999 lifetime
- Multiple daily shloks
- Android automatic daily lock-screen wallpaper
- Premium wallpaper designs
- Multiple notification schedules
- Advanced reading plans
- Audio/pronunciation
- Enhanced personalization
- No ads

## Architecture

- Next.js + TypeScript
- Supabase Postgres/Auth
- Capacitor for Android/iOS packaging
- Firebase Cloud Messaging for Android push
- APNs/Apple push infrastructure for iOS
- StoreKit 2 for Apple in-app purchases
- Google Play Billing for Android in-app purchases
- Server-side entitlement verification
- Vercel deployment

## Important payment rule

Digital subscriptions sold inside the mobile apps will use the respective platform billing systems. The backend stores normalized entitlements and reconciles lifecycle events; it never trusts a client-side "premium" flag.

Apple subscription lifecycle is synchronized using App Store Server Notifications V2.

## Development stages

1. Foundation and data model
2. Gita reader and daily experience
3. Authentication and profiles
4. Notifications and scheduling
5. Wallpaper engine
6. Android lock-screen automation
7. iOS Lock Screen widget
8. Store billing and entitlement verification
9. Analytics and admin
10. Production QA
11. Google Play release
12. App Store release

## Status

Foundation initialized. No production payment credentials or store secrets are committed to this repository.
