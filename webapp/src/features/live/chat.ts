// Live chat over Firestore — same protocol as iOS/Android so web and app users
// share one room: chat_room/{channelId}/chats/{docId}, timeStamp = Firestore
// Timestamp. The apps use no Firebase Auth. Config defaults to the iOS app's
// Firebase project; set VITE_FIREBASE_* once a Web app is registered there.
import { store } from '../../lib/storage';

const env = import.meta.env as Record<string, string | undefined>;
const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAiNvHYYSS8yLwtMV9fEuNFzQnL3DvxOPI',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'duality-app-70746.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'duality-app-70746',
  storageBucket: 'duality-app-70746.firebasestorage.app',
  messagingSenderId: '76480759175',
  appId: env.VITE_FIREBASE_APP_ID || '1:76480759175:ios:71194440b28457fbf03f22',
};

type FS = typeof import('firebase/firestore');
let ready: Promise<{ fs: FS; db: import('firebase/firestore').Firestore }> | null = null;
function firestore() {
  return (ready ??= (async () => {
    const [{ initializeApp, getApps }, fs] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const app = getApps()[0] ?? initializeApp(CONFIG);
    return { fs, db: fs.getFirestore(app) };
  })());
}

export type ChatDoc = {
  docId: string; id?: string; senderName?: string; senderImage?: string; senderId?: string; createId?: string;
  message?: string; gift?: string; giftName?: string; reaction?: string; liked?: boolean; time: number;
};
export type Change = { type: 'added' | 'modified' | 'removed'; doc: ChatDoc };

const me = () => ({ senderName: store.username || '', senderImage: store.avatar || '', senderId: store.userID || '' });

/** Subscribe to a room. Returns an unsubscribe fn; calls onError if Firestore is unreachable. */
export function listen(channelId: string, onChanges: (c: Change[]) => void, onError?: (e: unknown) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  firestore().then(({ fs, db }) => {
    if (cancelled) return;
    unsub = fs.onSnapshot(fs.collection(db, 'chat_room', channelId, 'chats'), (snap) => {
      onChanges(snap.docChanges().map((ch) => {
        const d: any = ch.doc.data();
        const ts = d?.timeStamp;
        const time = typeof ts?.toMillis === 'function' ? ts.toMillis() : typeof ts === 'number' ? (ts > 1e12 ? ts : ts * 1000) : 0;
        return { type: ch.type, doc: { ...d, docId: ch.doc.id, time } };
      }));
    }, (e) => onError?.(e));
  }).catch((e) => onError?.(e));
  return () => { cancelled = true; unsub?.(); };
}

async function write(channelId: string, data: Record<string, unknown>, docId?: string) {
  const { fs, db } = await firestore();
  const col = fs.collection(db, 'chat_room', channelId, 'chats');
  const payload = { ...data, timeStamp: fs.Timestamp.now() };
  if (docId) await fs.setDoc(fs.doc(col, docId), payload);
  else await fs.addDoc(col, payload);
}

export function sendComment(channelId: string, message: string) {
  const id = crypto.randomUUID();
  const m = me();
  return write(channelId, { id, ...m, message, gift: '', createId: m.senderId }, id);
}

export function sendJoined(channelId: string, viewer: any) {
  const id = crypto.randomUUID();
  const uid = String(viewer?.userId ?? viewer?._id ?? '');
  return write(channelId, {
    id, senderName: viewer?.fullName ?? '', message: 'Joined', gift: '',
    senderImage: viewer?.image ?? '', senderId: uid, createId: uid,
  }, id);
}

export function sendHeart(channelId: string) {
  return write(channelId, { gift: 'heart', message: '', id: crypto.randomUUID(), liked: false, reaction: 'liked', seen: false, ...me() });
}

export function sendGift(channelId: string, giftKey: string, giftName: string) {
  const id = crypto.randomUUID();
  return write(channelId, { id, ...me(), message: '', gift: giftKey, giftName, liked: false, reaction: 'Gif Comment', seen: false }, id).then(() => id);
}

export async function deleteDoc(channelId: string, docId: string) {
  const { fs, db } = await firestore();
  await fs.deleteDoc(fs.doc(db, 'chat_room', channelId, 'chats', docId)).catch(() => {});
}

export const isGiftKey = (g?: string) => !!g && g !== 'heart' && g !== 'CommentLiked' && g !== 'CommentUnLiked';
