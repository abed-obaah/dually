// Live Summary (LiveSummaryViewController) — shown to the host after End Live.
import { Img } from '../../ui/icons';
import { showAlert } from '../../ui/overlays';
import { fmtCount, mmss } from './api';
import { giftArt, giftLabel } from './ui';

export type SummaryData = {
  duration: number; totalViewers: number; peakViewers: number; likes: number; comments: number;
  gifts: Record<string, number>; video: Blob | null;
};

const ICON_GIFTS = new Set(['king', 'queen', 'horse', 'camel', 'elephant', 'soldier', 'butterfly']);

function Tile({ label, value, heart }: { label: string; value: number; heart?: boolean }) {
  return (
    <div className="flex-1 rounded-[18px] border border-white/[.12] bg-white/[.07] p-[16px]">
      <div className="flex items-center gap-[6px] text-[24px] font-bold text-white">
        {heart && <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF2D55"><path d="M12 21s-7.5-4.6-9.2-9.3C1.6 8.4 3.8 5 7.2 5c2 0 3.6 1.1 4.8 2.8C13.2 6.1 14.8 5 16.8 5c3.4 0 5.6 3.4 4.4 6.7C19.5 16.4 12 21 12 21z" /></svg>}
        {fmtCount(value)}
      </div>
      <div className="mt-[2px] text-[13px] text-white/40">{label}</div>
    </div>
  );
}

export default function LiveSummary({ data, onDone }: { data: SummaryData; onDone: () => void }) {
  const gifts = Object.entries(data.gifts).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b));
  const download = () => {
    if (!data.video) return;
    try {
      const url = URL.createObjectURL(data.video);
      const a = document.createElement('a');
      const d = new Date();
      a.href = url;
      a.download = `dually-live-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      showAlert("Couldn't save the video.");
    }
  };
  return (
    <div className="screen flex flex-col" style={{ background: 'linear-gradient(160deg,#17222B 0%,#0B0F14 55%,#05070A 100%)' }}>
      <div className="no-scrollbar flex-1 overflow-y-auto px-[20px] pt-safe">
        <div className="pt-[28px]">
          <span className="inline-block rounded-[8px] bg-[#FF2D55] px-[10px] py-[4px] text-[11px] font-bold text-white">LIVE</span>
          <div className="mt-[14px] text-[26px] font-bold text-white">Your live has ended</div>
          <div className="mt-[4px] text-[14px] text-white/40">Here's how it went</div>
          <div className="mt-[22px] rounded-[22px] border border-[rgba(255,45,85,0.24)] py-[22px] text-center" style={{ background: 'rgba(229,35,45,0.12)' }}>
            <div className="text-[42px] font-bold leading-none text-white">{mmss(data.duration)}</div>
            <div className="mt-[8px] text-[12px] font-medium tracking-wide text-white/40">DURATION</div>
          </div>
          <div className="mt-[12px] flex gap-[12px]"><Tile label="Viewers" value={data.totalViewers} /><Tile label="Peak viewers" value={data.peakViewers} /></div>
          <div className="mt-[12px] flex gap-[12px]"><Tile label="Likes" value={data.likes} heart /><Tile label="Comments" value={data.comments} /></div>
          <div className="mt-[26px] text-[16px] font-bold text-white">Gifts received</div>
          {gifts.length === 0 ? (
            <div className="mt-[10px] text-[13px] text-white/[.33]">No gifts this time. Streaming for longer gives viewers more of a chance to send one.</div>
          ) : (
            <div className="no-scrollbar mt-[10px] flex gap-[8px] overflow-x-auto">
              {gifts.map(([k, n]) => (
                <div key={k} className="flex h-[36px] shrink-0 items-center gap-[6px] rounded-[18px] border border-white/[.15] bg-white/10 pl-[6px] pr-[12px]">
                  {ICON_GIFTS.has(k) ? <Img name={giftArt(k)} size={26} /> : <span className="text-[#FF2D55]">🎁</span>}
                  <span className="text-[13px] font-medium text-white">{giftLabel(k)} ×{n}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-[18px] pb-[20px] text-[13px] text-white/[.33]">
            {data.totalViewers} {data.totalViewers === 1 ? 'person' : 'people'} watched your live.
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-[10px] px-[20px] pt-[8px]" style={{ paddingBottom: 'calc(var(--sab) + 20px)' }}>
        {data.video ? (
          <button onClick={download} className="h-[52px] rounded-[26px] bg-primary text-[15px] font-bold text-white">Download your live video</button>
        ) : (
          <div className="text-center text-[13px] text-white/[.33]">Your live wasn't recorded, so there's nothing to download this time.</div>
        )}
        <button onClick={onDone} className="h-[52px] rounded-[26px] border border-white/30 text-[15px] text-white">Done</button>
      </div>
    </div>
  );
}
