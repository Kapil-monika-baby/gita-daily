# Release Checklist

## Before store submission
- [ ] Legal business/developer identity decided
- [ ] Privacy policy published
- [ ] Terms published
- [ ] Support email/domain configured
- [ ] App icon and splash assets finalized
- [ ] Screenshots for phone sizes
- [ ] App description
- [ ] Content rights/source attribution verified
- [ ] Sanskrit dataset verified against selected canonical source
- [ ] Translation policy reviewed
- [ ] Subscription products configured in App Store Connect
- [ ] Google Play subscription products/base plans configured
- [ ] Server notification endpoints configured
- [ ] Production secrets stored outside Git
- [ ] Test accounts configured
- [ ] Sandbox billing tested
- [ ] Google Play test track tested
- [ ] Push notification delivery tested
- [ ] Android lock-screen behavior tested on supported devices
- [ ] iOS widget tested
- [ ] Restore purchases tested
- [ ] Subscription cancellation/expiry/refund tested
- [ ] Offline reader behavior tested
- [ ] Crash/error monitoring enabled
- [ ] Production database backups verified
- [ ] Final store review

## Credentials never commit
- Apple private keys
- App Store Connect API keys
- Google service-account keys
- Firebase private keys
- Supabase service-role keys
- OpenAI/API provider secrets
