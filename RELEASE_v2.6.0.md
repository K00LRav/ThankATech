# Release Notes - v2.6.0

**Release Date:** November 12, 2025

## 🎯 Overview
Major dashboard improvements with token purchase display and duplicate prevention.

## ✨ New Features

### Token Purchase Display
- **Technician Dashboard**: Now shows token purchases in activity feed with 🛒 icon
- **Client Dashboard**: Displays all token purchases in recent activity
- **Purchase Tracking**: Purchases properly tracked separately from sent tokens

### Duplicate Prevention
- Added session ID tracking to prevent duplicate purchase processing
- Webhook now checks for existing transactions before creating new ones
- Improved reliability for Stripe webhook processing

## 🐛 Bug Fixes

### Dashboard Data Loading
- Fixed purchase transactions not appearing in activity feeds
- Increased client transaction limit from 20 to 50 transactions
- Removed Firebase index requirement by removing `orderBy` clause
- Added safety checks for undefined `uid` fields when querying purchases

### Purchase Processing
- Webhook now passes session ID to `addTokensToBalance()` for duplicate prevention
- Added query validation before executing Firebase queries
- Graceful error handling for missing authentication UIDs

## 🔧 Technical Improvements

### Code Quality
- Removed excessive debug logging from production code
- Cleaned up console logs in:
  - `src/app/dashboard/page.tsx`
  - `src/lib/technician-dashboard.ts`
  - `src/app/api/stripe-webhook/route.ts`
- Improved error handling with silent fallbacks where appropriate

### Database Queries
- Added duplicate transaction check using `stripeSessionId`
- Purchase queries now check for both `uid` and `authUid` fields
- Optimized query structure to avoid Firebase index requirements

### Data Model
- Purchase transactions correctly tagged with `type: 'token_purchase'`
- Session IDs stored in transactions for idempotency
- Proper `fromUserId` population for purchase tracking

## 📋 Files Changed

### Modified Files
- `src/app/dashboard/page.tsx` - Removed debug logging, increased transaction limit
- `src/lib/technician-dashboard.ts` - Added purchase loading, removed verbose logging
- `src/lib/token-firebase.ts` - Added duplicate prevention for purchases
- `src/app/api/stripe-webhook/route.ts` - Pass session ID, improved logging
- `package.json` - Version bump to 2.6.0

### New Files
- `RELEASE_v2.6.0.md` - This release notes document

## 🔍 Testing Performed

### Dashboard Display
- ✅ Technician dashboard shows received tokens + purchases
- ✅ Client dashboard shows sent tokens + purchases
- ✅ Purchase amounts display correctly
- ✅ Purchase icons (🛒) render properly
- ✅ Timestamps sort correctly in activity feed

### Purchase Processing
- ✅ Stripe webhook creates transaction records
- ✅ Session IDs prevent duplicate processing
- ✅ Purchases appear immediately after checkout
- ✅ Token balances update correctly

### Edge Cases
- ✅ Handles missing `uid` field gracefully
- ✅ Works with both `uid` and `authUid` fields
- ✅ Prevents crashes when Firebase queries fail
- ✅ Empty purchase lists handled correctly

## 📊 Performance Impact

- **Query Efficiency**: Removed `orderBy` to eliminate Firebase index requirement
- **Load Time**: Minimal impact - purchases loaded in same batch as other transactions
- **Database Reads**: Slight increase due to duplicate check, but prevents duplicate writes

## 🚀 Deployment Notes

### Prerequisites
- No database migrations required
- No environment variable changes needed
- Compatible with existing Stripe webhook configuration

### Rollback Plan
If issues occur, revert to v2.5.0:
```bash
git revert HEAD
git push origin master
```

## 🔜 Next Steps

### Planned Improvements
- Add purchase confirmation email notifications
- Implement purchase filtering/search in dashboard
- Add pagination for users with 50+ transactions
- Consider caching purchase counts to reduce Firebase reads

### Known Limitations
- Purchase history limited to 50 most recent transactions
- No separate purchase history view (combined with activity feed)
- Session ID check adds one extra read per purchase webhook

## 📝 Migration Notes

### For Existing Purchases
Purchases made before this release may not appear in activity feeds if:
1. Webhook didn't fire (check Stripe webhook logs)
2. `fromUserId` not properly set in transaction record
3. Transaction created without `type: 'token_purchase'`

To backfill missing purchases, check Stripe payment history and manually verify Firebase transactions.

## 🙏 Acknowledgments

Issues resolved in this release:
- Purchase transactions not appearing in technician dashboard
- Client dashboard only showing 2 purchases instead of all purchases
- Firebase errors when querying purchases with undefined UID
- Duplicate purchase processing from Stripe webhook retries

---

**Version:** 2.6.0  
**Build Date:** November 12, 2025  
**Git Branch:** master  
**Deployment:** Automatic via Vercel
