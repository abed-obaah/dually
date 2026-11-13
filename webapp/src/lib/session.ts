// Small global store for signed-in user data shared across tabs
// (DataManager.shared on iOS): profile, unread dot, reported post ids.
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { store } from './storage';

type State = {
  profile: any | null;         // data.user from GET api/v1/user/profile
  memberSince?: string;
  hasUnread: boolean;
  reportedIds: Set<string>;
};
let state: State = { profile: null, hasUnread: false, reportedIds: new Set() };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach((s) => s()); };

export function useSession() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => { subs.delete(s); };
  }, []);
  return state;
}

export const session = {
  get: () => state,
  async loadProfile() {
    const r = await api('api/v1/user/profile');
    const user = r?.data?.user ?? null;
    if (user) {
      store.userID = user._id ?? store.userID;
      if (user.fullName) store.username = user.fullName;
      if (user.image) store.avatar = user.image;
      store.setBool('isPrivateAccount', !!user.isPrivateAccount);
      store.setBool('isAllowGifComments', !!user.isAllowGifComments);
    }
    set({ profile: user, memberSince: r?.data?.memberSince });
    return user;
  },
  setProfile(user: any) { set({ profile: user }); if (user?.image) store.avatar = user.image; },
  async refreshUnread() {
    try {
      const r = await api('api/v1/user/notifications/user');
      const list: any[] = Array.isArray(r?.data) ? r.data : [];
      set({ hasUnread: list.some((n) => n?.status === 'unread') });
      return list;
    } catch { return []; }
  },
  setUnread(v: boolean) { set({ hasUnread: v }); },
  async refreshReports() {
    try {
      const r = await api('api/v1/user/getReports');
      const ids = (Array.isArray(r?.data) ? r.data : []).map((d: any) => d?.reportedItem?.itemId).filter(Boolean);
      set({ reportedIds: new Set(ids) });
    } catch { /* ignore */ }
  },
  clear() { set({ profile: null, hasUnread: false, reportedIds: new Set() }); },
};
