import type { AppRoute } from '../../app/types';
import PostsPager from './PostsPager';
import StoryViewer from './StoryViewer';

export const routes: AppRoute[] = [
  { path: '/post/:id', element: <PostsPager />, tabBar: false },
  { path: '/api/post/:id', element: <PostsPager />, tabBar: false },
  { path: '/story/me', element: <StoryViewer own />, tabBar: false },
  { path: '/story/:userId', element: <StoryViewer own={false} />, tabBar: false },
];
