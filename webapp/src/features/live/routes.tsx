import { lazy } from 'react';
import type { AppRoute } from '../../app/types';

const HostLive = lazy(() => import('./HostLive'));
const ViewerLive = lazy(() => import('./ViewerLive'));

export const routes: AppRoute[] = [
  { path: '/camera/live', element: <HostLive />, tabBar: false },
  { path: '/live/:id', element: <ViewerLive />, tabBar: false },
];
