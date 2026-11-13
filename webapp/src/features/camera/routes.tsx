import type { AppRoute } from '../../app/types';
import Preview from './Preview';

export const routes: AppRoute[] = [
  { path: '/camera/preview', element: <Preview />, tabBar: false },
];
