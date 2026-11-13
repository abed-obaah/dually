// Edit Profile (EditProfileViewController + DetailScreensAndroidParity, specs/03 §3).
import { useEffect, useRef, useState } from 'react';
import { api, mediaForm } from '../../api/client';
import { session, useSession } from '../../lib/session';
import { store } from '../../lib/storage';
import { useNav } from '../../lib/nav';
import { Hud, showActions, showAlert } from '../../ui/overlays';
import { Avatar } from '../../ui/chrome';
import { Glyph, SF } from '../../ui/icons';
import { findCountry, flagOf, type Country } from './countries';
import { CountrySheet, DateWheelSheet, SquareCropper, parseDMY } from './pickers';
import { Bar, HELV, errMsg } from './ui';

const GENDER_LABEL: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const genderKey = (g: string) => (g === 'Male' ? 'MALE' : g === 'Female' ? 'FEMALE' : 'OTHER');

const FIELD = 'h-[52px] w-full rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7]';
const INPUT = 'h-full w-full bg-transparent px-[10px] text-[15px] text-ink caret-[#0384B3] outline-none placeholder:text-caption';

export default function EditProfile() {
  const nav = useNav();
  const { profile } = useSession();
  const inited = useRef(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [country, setCountry] = useState<Country>(() => findCountry());
  const [dropdown, setDropdown] = useState(false);
  const [datePicker, setDatePicker] = useState(false);
  const [countrySheet, setCountrySheet] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!profile) session.loadProfile().catch((e) => showAlert(errMsg(e))); }, [profile]);
  useEffect(() => {
    if (!profile || inited.current) return;
    inited.current = true;
    setName(profile.fullName ?? '');
    setGender(GENDER_LABEL[String(profile.gender ?? '').toUpperCase()] ?? '');
    setAge(profile.age != null ? String(profile.age) : '');
    setPhone(String(profile.mobileNumber ?? '').replace(/\D/g, '').slice(-10));
    setBio(profile.bio ?? '');
    setImage(profile.image ?? store.avatar ?? '');
    setCountry(findCountry(profile.isoCode, profile.countryCode));
  }, [profile]);

  const save = async () => {
    const body: Record<string, string> = {
      fullName: name, gender: genderKey(gender), age, bio, mobileNumber: phone,
      countryCode: `+${country.code}`, isoCode: country.iso,
    };
    Hud.show();
    try {
      await api('api/v1/user/registration', { method: 'POST', body });
      await session.loadProfile().catch(() => {});
      Hud.dismiss();
      nav.back('/profile');
    } catch (e) {
      Hud.dismiss();
      showAlert(errMsg(e));
    }
  };

  const changePhoto = async () => {
    const i = await showActions('Photo Source', 'Choose a source', [
      { title: 'Camera' }, { title: 'Photo Library' }, { title: 'Cancel', style: 'cancel' },
    ]);
    if (i === 0) cameraInput.current?.click();
    else if (i === 1) libraryInput.current?.click();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) setCropFile(f);
  };

  const upload = async (blob: Blob) => {
    setCropFile(null);
    Hud.show();
    try {
      const r = await api('api/v1/user/upload-profile-picture', {
        method: 'PUT', form: mediaForm(new File([blob], `${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' })), timeoutMs: 180000,
      });
      Hud.dismiss();
      await showAlert(r?.message ?? '');
      const url = r?.data?.image;
      if (url) { setImage(url); store.avatar = url; }
      session.loadProfile().catch(() => {});
    } catch (err) {
      Hud.dismiss();
      showAlert(errMsg(err));
    }
  };

  const startDate = parseDMY(age) ?? new Date();

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-page">
      <Bar title="Edit Profile" titleClass="text-[22px] font-bold" fallback="/profile"
        right={<button onClick={save} className="text-[16px] font-semibold text-primary">Save</button>} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-tabbar"
        onClick={(e) => { if (!(e.target as HTMLElement).closest('input,textarea')) (document.activeElement as HTMLElement | null)?.blur?.(); }}>
        <div className="flex flex-col items-center pt-[20px]">
          <Avatar src={image} size={108} />
          <button onClick={changePhoto} className="mt-[10px] text-[14px] font-semibold text-primary">Change Photo</button>
        </div>

        <div className="relative mx-[6px] mb-[20px] mt-[16px] rounded-[18px] border border-cardstroke bg-white px-[14px] py-[18px]">
          <div className="flex flex-col gap-[20px]">
            <div className={FIELD}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={INPUT} />
            </div>

            <button onClick={() => setDropdown((v) => !v)} className={`${FIELD} relative flex items-center text-left`}>
              <span className={`flex-1 px-[10px] text-[15px] ${gender ? 'text-ink' : 'text-caption'}`}>{gender || 'Gender'}</span>
              <Glyph name={dropdown ? 'downArrow' : 'upArrow'} size={20} color="#8A97A0" className="mr-[10px]" />
            </button>

            <div className={FIELD} onClick={() => { setDropdown(false); setDatePicker(true); }}>
              <input value={age} readOnly placeholder="Age" className={`${INPUT} cursor-pointer caret-transparent`} />
            </div>

            <div className={`${FIELD} flex items-center`}>
              <button onClick={() => setCountrySheet(true)} className="flex h-full shrink-0 items-center gap-[3px] pl-[8px] pr-[4px]"
                style={{ minWidth: 61, fontFamily: HELV }}>
                <span className="whitespace-nowrap text-[18px] text-black">{flagOf(country.iso)} +{country.code}</span>
                <span className="text-[#555555]"><SF.chevronDown size={12} weight={2.4} /></span>
              </button>
              <input value={phone} inputMode="numeric" placeholder="Phone"
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))} className={INPUT} />
            </div>

            <div className="h-[120px] w-full rounded-[14px] border border-[#E6EBEF] bg-[#F3F5F7]">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                className="h-full w-full resize-none bg-transparent px-[10px] py-[8px] text-[15px] text-ink caret-[#0384B3] outline-none" />
            </div>
          </div>

          {dropdown && (
            <div className="anim-fade absolute left-[14px] right-[14px] z-10 h-[170px] rounded-[10px] bg-[#F1F1F1] py-[5px]" style={{ top: 18 + 52 + 20 + 52 + 20, fontFamily: HELV }}>
              {[['Male', 'Male'], ['Female', 'Female'], ['Others', 'Other']].map(([label, value]) => (
                <button key={label} onClick={() => { setGender(value); setDropdown(false); }}
                  className="block h-[40px] w-full px-[14px] text-left text-[16px] text-black">{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <input ref={libraryInput} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden" onChange={onPick} />

      {datePicker && <DateWheelSheet value={startDate} onCancel={() => setDatePicker(false)} onDone={(v) => { setAge(v); setDatePicker(false); }} />}
      {countrySheet && <CountrySheet onClose={() => setCountrySheet(false)} onPick={(c) => { setCountry(c); setCountrySheet(false); }} />}
      {cropFile && <SquareCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={upload} />}
    </div>
  );
}
