import type { AppRoute } from '../../app/types';
import { AccountPrivacy, ChangePassword, NotificationSettings } from './AccountScreens';
import { Blocked, BlockedCommenters, CommentsPrivacy } from './BlockScreens';
import { About, DeleteAccount, Help, HelpCenter, PrivacyPolicy, RaiseQuery, Terms } from './SupportScreens';
import { Cart, CashKyc, LiveActivity, Wallet } from './DeferredScreens';

export const routes: AppRoute[] = [
  { path: '/settings/privacy', element: <AccountPrivacy /> },
  { path: '/settings/notifications', element: <NotificationSettings /> },
  { path: '/settings/password', element: <ChangePassword /> },
  { path: '/settings/blocked', element: <Blocked /> },
  { path: '/settings/comments', element: <CommentsPrivacy /> },
  { path: '/settings/blocked-commenters', element: <BlockedCommenters /> },
  { path: '/settings/delete', element: <DeleteAccount /> },
  { path: '/settings/help', element: <Help /> },
  { path: '/settings/help-center', element: <HelpCenter /> },
  { path: '/settings/raise-query', element: <RaiseQuery /> },
  { path: '/settings/about', element: <About /> },
  { path: '/settings/privacy-policy', element: <PrivacyPolicy /> },
  { path: '/settings/terms', element: <Terms /> },
  { path: '/settings/wallet', element: <Wallet /> },
  { path: '/settings/cart', element: <Cart /> },
  { path: '/settings/kyc', element: <CashKyc /> },
  { path: '/settings/live-activity', element: <LiveActivity /> },
];
