import type { AppRoute } from '../../app/types';
import Launch from './Launch';
import Onboarding from './Onboarding';
import Login from './Login';
import Register from './Register';
import ProfileSetup from './ProfileSetup';
import Forgot from './Forgot';
import NewPassword from './NewPassword';
import Success from './Success';

export const authRoutes: AppRoute[] = [
  { path: '/', element: <Launch /> },
  { path: '/welcome', element: <Onboarding /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/profile-setup', element: <ProfileSetup /> },
  { path: '/forgot', element: <Forgot /> },
  { path: '/new-password', element: <NewPassword /> },
  { path: '/success', element: <Success /> },
];
