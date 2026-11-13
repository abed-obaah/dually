import type { ReactNode } from 'react';

export type Tab = 'home' | 'explore' | 'camera' | 'profile' | 'settings';
export const TABS: Tab[] = ['home', 'explore', 'camera', 'profile', 'settings'];

/**
 * A pushed screen. `path` is a react-router pattern (e.g. '/profile/edit',
 * '/user/:id'). It renders above the tab roots.
 * `tabBar: false` hides the floating pill (stories, posts pager, live …).
 */
export type AppRoute = { path: string; element: ReactNode; tabBar?: boolean };
