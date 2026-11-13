// SuccesfullViewController (reset success, specs/01-auth §9): image + CONTINUE only.
import { useNav } from '../../lib/nav';
import { img } from '../../ui/icons';
import { AuthScreen, Pill } from './ui';

export default function Success() {
  const nav = useNav();
  return (
    <AuthScreen scroll={false}>
      {/* `success` 200×200, vertical centre at 0.45 × screen height. */}
      <img src={img('success')} alt="" draggable={false}
        className="absolute left-1/2 top-[45%] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 object-contain" />
      <div className="mt-auto px-[20px] pb-[20px]">
        <Pill onClick={() => nav.reset('/login')}>CONTINUE</Pill>
      </div>
    </AuthScreen>
  );
}
