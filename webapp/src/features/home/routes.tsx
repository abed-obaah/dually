import type { AppRoute } from '../../app/types';
import NotificationsScreen from './NotificationsScreen';

export const routes: AppRoute[] = [
  { path: '/notifications', element: <NotificationsScreen /> },
];
