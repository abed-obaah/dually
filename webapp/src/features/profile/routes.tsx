import { lazy } from 'react';
import type { AppRoute } from '../../app/types';

const UserProfile = lazy(() => import('./UserProfile'));
const EditProfile = lazy(() => import('./EditProfile'));
const MyFriends = lazy(() => import('./Friends').then((m) => ({ default: m.MyFriends })));
const UserFriends = lazy(() => import('./Friends').then((m) => ({ default: m.UserFriends })));
const Requests = lazy(() => import('./Requests'));
const Saved = lazy(() => import('./Saved'));
const PostView = lazy(() => import('./PostView'));
const Purchases = lazy(() => import('./Purchases'));

export const routes: AppRoute[] = [
  { path: '/user/:id', element: <UserProfile /> },
  { path: '/user/:id/friends', element: <UserFriends /> },
  { path: '/profile/edit', element: <EditProfile /> },
  { path: '/profile/friends', element: <MyFriends /> },
  { path: '/profile/requests', element: <Requests /> },
  { path: '/profile/post/:id', element: <PostView /> },
  { path: '/profile/purchases', element: <Purchases /> },
  { path: '/saved', element: <Saved /> },
];
