import React from 'react';
interface ArcGaugeProps {
  activePercent?: number;
  value: string | number;
  label: string;
  caption?: string;
}

export const ArcGauge: React.FC<ArcGaugeProps> = ({
  activePercent = 30,
  value,
  label,
  caption,
}) => {
  const circumference = 552.92;
  const maxArcLength = circumference * 0.75;
  const dashOffset = circumference - (activePercent / 100) * maxArcLength;

  // Generate ticks for the "scale"
  const ticks = Array.from({ length: 11 }).map((_, i) => {
    const angle = 135 + (i * 270) / 10;
    return angle;
  });

  const valueStr = String(value);
  const fontSize = valueStr.length > 3 ? 'text-5xl' : 'text-[6rem]';

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative -mt-8 min-h-[380px] w-full max-w-sm mx-auto">
      <div className="relative flex flex-col items-center justify-center w-full">
        <div className="arc-container scale-110">
          <svg className="arc-svg" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#FFB74D', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FF6B00', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Background Arc */}
            <circle
              className="arc-bg stroke-gray-200"
              cx="100"
              cy="100"
              r="88"
              strokeDasharray="414 553"
              strokeDashoffset="0"
            />

            {/* Scale Ticks */}
            {ticks.map((angle, i) => (
              <line
                key={i}
                x1="100"
                y1="15"
                x2="100"
                y2="22"
                transform={`rotate(${angle - 135} 100 100)`}
                className={i / 10 * 100 <= activePercent ? 'stroke-[var(--primary)]' : 'stroke-gray-300'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}

            {/* Progress Arc */}
            <circle
              className="arc-progress stroke-[url(#gaugeGradient)]"
              cx="100"
              cy="100"
              r="88"
              strokeDasharray="553"
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center z-0 mt-2">
            <div className={`${fontSize} leading-none font-black tracking-tighter text-[var(--foreground)] transition-all duration-300`}>
              {value}
            </div>
            <h3 className="text-xl font-bold text-[var(--muted-foreground)] uppercase tracking-widest mt-2">{label}</h3>
          </div>
        </div>

        <div className="flex flex-col items-center text-center -mt-4 space-y-4 z-10 relative">
          {caption && (
            <div className="flex items-center gap-2 text-[var(--primary)] bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100 shadow-sm transition-all duration-300">
              <span className="text-xs font-bold uppercase tracking-wider">{caption}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
