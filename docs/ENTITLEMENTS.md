# Entitlement Model

The mobile client is not authoritative for paid access.

## Normalized states
- free
- plus
- expired
- refunded
- billing_issue

## Provider records
Store provider-specific transaction/subscription identifiers separately from the normalized entitlement.

## Apple
Use StoreKit 2 on-device purchase handling and App Store Server Notifications V2 on the backend. Verify signed transaction data before changing entitlement.

## Google Play
Use Google Play Billing on-device and Google Play's server-side subscription APIs/notifications for reconciliation.

## Cross-platform account
A signed-in Gita Daily account can associate verified purchases from either store with one account. A user who purchases Plus on Android and later signs in on iOS can receive Plus according to the verified backend entitlement.

## Lifetime
Lifetime is a non-renewing entitlement. It remains active unless the store/provider reports a refund/revocation.
