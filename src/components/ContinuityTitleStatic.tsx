const ContinuityTitleStatic = () => {
  return (
    <div className="w-full flex justify-center">
      <svg
        viewBox="0 0 1200 360"
        className="w-full max-w-[860px] h-auto"
        aria-label="Essais Continuité"
        role="img"
      >
        <defs>
          <style>{`
            .frame {
              fill: none;
              stroke: #4f678e;
              stroke-width: 12;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .dot {
              fill: white;
              stroke: #4f678e;
              stroke-width: 10;
            }

            .arrow {
              fill: none;
              stroke: #4f678e;
              stroke-width: 10;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .title {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 62px;
              font-weight: 900;
              letter-spacing: -0.04em;
              fill: #000814;
            }
          `}</style>
        </defs>

        <path
          className="frame"
          d="
            M185 95
            H420

            M520 95
            H985
            C1035 95 1075 135 1075 185
            C1075 235 1035 275 985 275

            H780

            M400 275
            H185
            C135 275 95 235 95 185
            C95 135 135 95 185 95
          "
        />

        <circle className="dot" cx="470" cy="95" r="22" />
        <line className="arrow" x1="615" y1="95" x2="560" y2="95" />
        <path className="arrow" d="M590 65 L560 95 L590 125" />

        <circle className="dot" cx="790" cy="275" r="22" />
        <line className="arrow" x1="670" y1="275" x2="725" y2="275" />
        <path className="arrow" d="M695 245 L725 275 L695 305" />

        <text
          x="600"
          y="193"
          textAnchor="middle"
          dominantBaseline="middle"
          className="title"
        >
          ESSAIS CONTINUITÉ
        </text>
      </svg>
    </div>
  );
};

export default ContinuityTitleStatic;
