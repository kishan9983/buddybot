export default function HexGrid() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.035]">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <defs>
          <pattern
            id="hex-pattern"
            x="0"
            y="0"
            width="60"
            height="104"
            patternUnits="userSpaceOnUse"
          >
            {/* Hexagon shape */}
            <polygon
              points="30,2 58,17 58,47 30,62 2,47 2,17"
              fill="none"
              stroke="#00ffff"
              strokeWidth="1"
            />
            <polygon
              points="30,54 58,69 58,99 30,114 2,99 2,69"
              fill="none"
              stroke="#00ffff"
              strokeWidth="1"
            />
            <polygon
              points="-30,54 -2,69 -2,99 -30,114 -58,99 -58,69"
              fill="none"
              stroke="#00ffff"
              strokeWidth="1"
            />
            <polygon
              points="90,54 118,69 118,99 90,114 62,99 62,69"
              fill="none"
              stroke="#00ffff"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
      </svg>
    </div>
  );
}
