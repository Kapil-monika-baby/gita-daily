# Gita Daily Product Specification

## Core promise
A daily Bhagavad Gita experience that places a verse in the user's day through notifications and, on supported Android devices, the lock screen.

## Content
- 18 chapters
- 700 canonical Bhagavad Gita verses, plus the exact source dataset/version must be recorded before production seeding.
- Sanskrit is never replaced by translation.
- Translations are treated as explanations/meanings, not as the original scripture.

## Free tier
- 1 scheduled shlok/day
- Sanskrit + transliteration + selected-language meaning
- Full reader
- Basic wallpaper
- Bookmarks
- Notification

## Plus tier
- ₹49/month
- ₹299/year
- ₹999 lifetime
- Up to 8 scheduled shloks/day
- Android automatic lock-screen wallpaper
- Premium wallpaper themes
- Multiple schedules
- Reading plans
- Audio/pronunciation
- Advanced personalization
- No ads

## Purchase entitlement
A user can be entitled through:
- active Apple subscription
- active Google Play subscription
- lifetime/non-consumable purchase where configured

The backend normalizes these into a single entitlement record. Client UI never grants entitlement by itself.

## Store constraints
- iOS digital goods/subscriptions use StoreKit.
- Android digital goods/subscriptions use Google Play Billing.
- Subscription status must be reconciled server-side.
- Restore purchases must be available.
- Cancellation does not immediately revoke access; access follows the store's entitlement period.
- Refund/revocation/expiry events revoke entitlement according to verified store state.
