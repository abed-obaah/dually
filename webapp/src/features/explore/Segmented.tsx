// DuallySegmentedControl: recessed track #EFF2F4, sliding gradient thumb.
export default function Segmented({ titles, index, onChange, height, badges }: {
  titles: string[]; index: number; onChange: (i: number) => void; height: number; badges?: (string | null)[];
}) {
  const n = titles.length;
  return (
    <div className="relative w-full select-none rounded-full" style={{ height, background: '#EFF2F4' }}>
      <div className="absolute rounded-full"
        style={{
          top: 4, bottom: 4, left: 4, width: `calc((100% - 8px) / ${n})`,
          transform: `translateX(${index * 100}%)`,
          transition: 'transform .28s cubic-bezier(.34,1.3,.64,1)',
          background: 'linear-gradient(90deg, #0384B3, #0A9BD4)',
        }} />
      <div className="absolute inset-x-[4px] inset-y-0 flex">
        {titles.map((t, i) => (
          <button key={t} onClick={() => onChange(i)} className="flex flex-1 items-center justify-center gap-[5px]">
            <span className="font-poppins text-[13px]" style={{ color: i === index ? '#fff' : '#5B6770', transition: 'color .28s' }}>{t}</span>
            {badges?.[i] && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-[5px] text-[10px] font-bold text-white" style={{ background: '#E53935' }}>
                {badges[i]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
