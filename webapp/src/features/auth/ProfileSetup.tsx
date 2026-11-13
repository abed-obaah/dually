// ProfileRegisterViewController "Profile" (specs/01-auth §6).
import { useRef, useState } from 'react';
import { api, mediaForm } from '../../api/client';
import { useNav } from '../../lib/nav';
import { store } from '../../lib/storage';
import { Glyph, img } from '../../ui/icons';
import { showActions, showAlert, withHud } from '../../ui/overlays';
import DateWheelSheet, { parseDMY } from './DateWheelSheet';
import { enterApp, errMsg, withDeviceToken } from './flow';
import { AuthScreen, FIELD_FILL, FIELD_STROKE, Field, HELVETICA, Pill, Subtitle, Title } from './ui';

/** Centre square crop (UIImagePickerController allowsEditing) → JPEG q0.7. */
async function squareJpeg(file: File, max = 1080): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Unable to read the selected image.'));
      i.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const out = Math.min(side, max);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Unable to read the selected image.'))), 'image/jpeg', 0.7));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ageFrom(dmy: string): number | null {
  const d = parseDMY(dmy);
  if (!d) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

const GENDER_API: Record<string, string> = { Male: 'MALE', Female: 'FEMALE' };

export default function ProfileSetup() {
  const nav = useNav();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('Bio');
  const [bioTouched, setBioTouched] = useState(false);
  const [menu, setMenu] = useState<'closed' | 'open' | 'closing'>('closed');
  const [picker, setPicker] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const closeMenu = (then?: () => void) => {
    setMenu('closing');
    window.setTimeout(() => { setMenu('closed'); then?.(); }, 300);
  };
  const toggleMenu = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (menu === 'open') closeMenu();
    else if (menu === 'closed') setMenu('open');
  };
  const choose = (label: string) => closeMenu(() => setGender(label));

  const pickPhoto = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const i = await showActions('Photo Source', 'Choose a source', [
      { title: 'Camera' }, { title: 'Photo Library' }, { title: 'Cancel', style: 'cancel' },
    ]);
    const input = i === 0 ? camRef.current : i === 1 ? libRef.current : null;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!store.token) return showAlert('No valid access token found.');
    try {
      const blob = await squareJpeg(file);
      const r: any = await withHud(() => api('api/v1/user/upload-profile-picture', {
        method: 'PUT', form: mediaForm(blob, `${crypto.randomUUID().toUpperCase()}.jpg`), timeoutMs: 180000,
      }));
      await showAlert(r?.message ?? '');
      setAvatar((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
      const url = r?.data?.image;
      if (typeof url === 'string' && url) store.avatar = url;
    } catch (e) {
      await showAlert(errMsg(e));
    }
  };

  const submit = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!gender) return showAlert('Please select a gender.');
    if (!name.trim()) return showAlert('Please fill name.');
    if (!age) return showAlert('Please fill in age.');
    // iOS bug fix: Int("dd-MM-yyyy") is nil there so the check never fired; compute the real age.
    const years = ageFrom(age);
    if (years !== null && years < 13) return showAlert('You must be at least 13 years old to register.');
    if (!store.token) return showAlert('No valid access token found.');
    try {
      const r: any = await withHud(() => api('api/v1/user/registration', {
        method: 'POST',
        body: withDeviceToken({
          fullName: name,
          gender: GENDER_API[gender] ?? 'OTHER',
          age,
          bio: !bioTouched && bio === 'Bio' ? '' : bio,
          mobileNumber: '',
          countryCode: '',
          isoCode: '',
        }),
      }));
      const d = r?.data ?? {};
      if (d._id) store.userID = String(d._id);
      if (d.fullName != null) store.username = String(d.fullName);
      if (d.image) store.avatar = String(d.image);
      store.loggedIn = true;
      enterApp(nav); // no alert
    } catch (e) {
      const m = errMsg(e);
      await showAlert(m || 'Registration failed.');
    }
  };

  const menuVisible = menu !== 'closed';

  return (
    <AuthScreen overlay={picker && (
      <DateWheelSheet initial={age} onCancel={() => setPicker(false)} onDone={(v) => { setAge(v); setPicker(false); }} />
    )}>
      <div className="px-[20px] pb-[10px] pt-[20px]">
        <Title>Profile</Title>
        <Subtitle style={{ marginTop: 10 }}>Let&apos;s setup your profile</Subtitle>

        <button type="button" aria-label="Upload profile photo" onClick={pickPhoto}
          className="mx-auto mt-[30px] block h-[120px] w-[120px] overflow-hidden rounded-full" style={{ background: FIELD_FILL }}>
          <img src={avatar ?? img('ic_upload')} alt="" draggable={false} className="h-full w-full object-cover" />
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={libRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

        <Field containerStyle={{ marginTop: 30 }} value={name} onChange={setName} placeholder="Name"
          type="text" autoComplete="name" autoCapitalize="words" name="name" />

        {/* Gender: not typeable; whole field toggles the dropdown. */}
        <div className="relative mt-[20px]">
          <Field value={gender} onChange={() => {}} placeholder="Gender" readOnly tabIndex={-1}
            trailing={
              // iOS bug fix: the arrow pointed up while closed / down while open.
              <Glyph name="upArrow" color="#AFC0CB"
                style={{ width: 14, height: 8, transform: menu === 'open' ? 'none' : 'rotate(180deg)', transition: 'transform .3s' }} />
            }
            trailingWidth={20} />
          <button type="button" aria-label="Gender" aria-expanded={menu === 'open'} onClick={toggleMenu} className="absolute inset-0" />

          {menuVisible && (
            <div className="absolute inset-x-0 top-[66px] z-10 h-[170px] rounded-[16px] p-[5px]"
              style={{
                background: '#0C2D3D', border: `1px solid ${FIELD_STROKE}`,
                opacity: menu === 'open' ? 1 : 0, transition: 'opacity .3s', animation: menu === 'open' ? 'fade-in .3s' : undefined,
              }}>
              <div className="flex flex-col gap-[20px]">
                {[['Male', 'Male'], ['Female', 'Female'], ['Others', 'Other']].map(([title, value]) => (
                  <div key={title} className="h-[40px] p-[5px]">
                    <button type="button" onClick={() => choose(value)}
                      className="h-full w-full text-left text-[16px] text-white active:opacity-50" style={{ fontFamily: HELVETICA }}>
                      {title}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Age: date wheels instead of a keyboard, output dd-MM-yyyy. */}
        <div className="relative mt-[20px]">
          <Field value={age} onChange={() => {}} placeholder="Age" readOnly inputMode="none" tabIndex={-1}
            style={{ caretColor: 'transparent' }} />
          <button type="button" aria-label="Age" onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); setPicker(true); }}
            className="absolute inset-0" />
        </div>

        <div className="mt-[20px] h-[80px] overflow-hidden rounded-[16px]" style={{ background: FIELD_FILL, border: `1px solid ${FIELD_STROKE}` }}>
          <textarea
            value={bio}
            onFocus={() => { if (!bioTouched && bio === 'Bio') setBio(''); setBioTouched(true); }}
            onChange={(e) => setBio(e.target.value.replace(/\n/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            enterKeyHint="done"
            autoCapitalize="sentences"
            aria-label="Bio"
            className="h-full w-full resize-none bg-transparent px-[14px] py-[13px] text-[15px] leading-[18px] text-white caret-secondary outline-none"
          />
        </div>

        <Pill className="mt-[80px]" onClick={submit}>REGISTER</Pill>
      </div>
    </AuthScreen>
  );
}
