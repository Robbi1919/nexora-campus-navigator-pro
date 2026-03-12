const ScannerViewfinder = () => {
  const cornerSize = 28;
  const cornerThickness = 4;

  return (
    <div className="relative w-full h-full">
      {/* Corner brackets */}
      {[
        "top-0 left-0",
        "top-0 right-0 rotate-90",
        "bottom-0 right-0 rotate-180",
        "bottom-0 left-0 -rotate-90",
      ].map((pos, i) => (
        <div key={i} className={`absolute ${pos}`}>
          <svg width={cornerSize} height={cornerSize} viewBox="0 0 28 28" fill="none">
            <path
              d={`M0 ${cornerThickness / 2}H${cornerSize - 8}Q${cornerSize} 0 ${cornerSize} ${8}V${cornerSize}`}
              stroke="hsl(var(--primary))"
              strokeWidth={cornerThickness}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      ))}

      {/* Scan line */}
      <div className="absolute inset-x-4 top-4 bottom-4 overflow-hidden">
        <div className="scan-line-animation h-0.5 w-full rounded-full bg-primary/60" />
      </div>
    </div>
  );
};

export default ScannerViewfinder;
