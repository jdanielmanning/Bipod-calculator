const { useState, useMemo } = React;

function BipodCalculator() {
  const [load, setLoad] = useState("1000");
  const [luffAngle, setLuffAngle] = useState("45");
  const [legSpread, setLegSpread] = useState("60");
  const [guyAngle, setGuyAngle] = useState("15");

  const results = useMemo(() => {
    const L = parseFloat(load);
    const luff = parseFloat(luffAngle);
    const spread = parseFloat(legSpread);
    const alpha = parseFloat(guyAngle);

    if (
      isNaN(L) || isNaN(luff) || isNaN(spread) || isNaN(alpha) ||
      L <= 0 || luff <= 0 || luff >= 90 ||
      spread <= 0 || spread >= 180 ||
      alpha < 0 || alpha >= 90
    ) {
      return null;
    }

    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;

    // Equilibrium at the head:
    //   Horizontal: A·cos(luff) = F3·cos(α)  (leg pulls head forward, guy pulls back)
    //   Vertical:   A·sin(luff) = L + F3·sin(α)  (guy also pulls head down, adds to load)
    // Solving for F3:
    //   F3 = L / (cos(α)·tan(luff) − sin(α))
    const luffRad = toRad(luff);
    const alphaRad = toRad(alpha);
    const denom = Math.cos(alphaRad) * Math.tan(luffRad) - Math.sin(alphaRad);
    // Geometry breaks down if guyline angle ≥ luff angle (guy can no longer
    // resist the load's overturning moment). Guard against that.
    if (denom <= 0) {
      return null;
    }
    const F3 = L / denom;
    // Horizontal force at head (= horizontal component of axial)
    const F1 = F3 * Math.cos(alphaRad);
    // Total axial compression in the bipod
    const A = F1 / Math.cos(luffRad);
    const beta = spread / 2;
    const A2 = (A / 2) / Math.cos(toRad(beta));
    const S = (A / 2) * Math.tan(toRad(beta));
    const hobble = S;
    // Kickback at each foot = half the horizontal force the guyline pulls back with
    const kickback = F1 / 2;
    const R = Math.sqrt(S * S + kickback * kickback);
    const gamma = toDeg(Math.atan2(kickback, S));

    const maxForce = Math.max(L, A, A2, F3, S, kickback, R);
    const forceScale = 120 / maxForce;

    return {
      L, luff, spread, alpha, beta,
      F1, F3, A, A2, S, hobble, kickback, R, gamma,
      forceScale, maxForce,
    };
  }, [load, luffAngle, legSpread, guyAngle]);

  const fmt = (n) => {
    if (n === undefined || n === null || isNaN(n)) return "—";
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const fmtAngle = (n) => {
    if (n === undefined || n === null || isNaN(n)) return "—";
    return n.toFixed(1) + "°";
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-12">
      <div className="max-w-md mx-auto">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-stone-900">Bipod Calculator</h1>
          <p className="text-sm text-stone-600 mt-1">
            Rigging force analysis for A-frame lifts
          </p>
        </header>

        <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">
            Inputs
          </h2>

          <div className="space-y-3">
            <Field
              label="Load weight"
              unit="lbs"
              value={load}
              onChange={setLoad}
              hint="Weight being lifted"
            />
            <Field
              label="Luff angle"
              unit="°"
              value={luffAngle}
              onChange={setLuffAngle}
              hint="Angle from ground to bipod"
            />
            <Field
              label="Leg spread"
              unit="°"
              value={legSpread}
              onChange={setLegSpread}
              hint="Total angle between legs"
            />
            <Field
              label="Guyline angle"
              unit="°"
              value={guyAngle}
              onChange={setGuyAngle}
              hint="Angle of guyline below horizontal"
            />
          </div>
        </section>

        {results && (
          <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">
              Diagrams
            </h2>
            <div className="space-y-4">
              <DiagramCard title="Side view (luff & guyline)">
                <SideView results={results} fmt={fmt} />
              </DiagramCard>
              <DiagramCard title="Front view (leg spread)">
                <FrontView results={results} fmt={fmt} />
              </DiagramCard>
              <DiagramCard title="Top view (plan)">
                <TopView results={results} fmt={fmt} />
              </DiagramCard>
            </div>
            <p className="text-[10px] text-stone-500 mt-3 italic">
              Force arrows use a shared scale across all three diagrams, so
              their lengths are visually comparable.
            </p>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide p-4 pb-2">
            Results
          </h2>

          {results === null ? (
            <div className="p-4 text-sm text-stone-500">
              Enter valid values to see results.
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              <Row label="Axial load (total)" value={fmt(results.A) + " lbs"} />
              <Row label="Axial load per leg" value={fmt(results.A2) + " lbs"} emphasized />
              <Row label="Guyline tension" value={fmt(results.F3) + " lbs"} emphasized />
              <Row label="Splay force (hobble tension)" value={fmt(results.S) + " lbs"} />
              <Row label="Kickback force" value={fmt(results.kickback) + " lbs"} />
              <Row label="Resultant force at foot" value={fmt(results.R) + " lbs"} />
              <Row label="Resultant angle (from splay)" value={fmtAngle(results.gamma)} />
            </div>
          )}
        </section>

        <p className="text-xs text-stone-500 mt-4 px-1 leading-relaxed">
          Calculations are theoretical and assume rigid, symmetric geometry with
          no friction or dynamic loading. Always apply appropriate safety
          factors and verify with a qualified rigger.
        </p>
      </div>
    </div>
  );
}

function Field({ label, unit, value, onChange, hint }) {
  return (
    <div>
      <label className="block">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm font-medium text-stone-800">{label}</span>
          <span className="text-xs text-stone-500">{hint}</span>
        </div>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2.5 pr-12 text-base text-stone-900 focus:border-stone-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 pointer-events-none">
            {unit}
          </span>
        </div>
      </label>
    </div>
  );
}

function Row({ label, value, emphasized }) {
  return (
    <div
      className={
        "flex items-center justify-between px-4 py-3 " +
        (emphasized ? "bg-amber-50" : "")
      }
    >
      <span className={"text-sm " + (emphasized ? "font-semibold text-stone-900" : "text-stone-700")}>
        {label}
      </span>
      <span className={"text-base tabular-nums " + (emphasized ? "font-bold text-stone-900" : "font-medium text-stone-800")}>
        {value}
      </span>
    </div>
  );
}

function DiagramCard({ title, children }) {
  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <div className="text-xs font-medium text-stone-600 uppercase tracking-wide px-3 py-2 bg-stone-50 border-b border-stone-200">
        {title}
      </div>
      <div className="bg-white p-2">{children}</div>
    </div>
  );
}

const STROKE = "#1c1917";
const FORCE = "#dc2626";
const GUY = "#059669";
const MUTED = "#a8a29e";
const LABEL = "#44403c";

function SideView({ results, fmt }) {
  const { luff, alpha, A, L, F3, forceScale } = results;
  const W = 380, H = 320;
  const ground = H - 30;

  const luffRad = (luff * Math.PI) / 180;
  const alphaRad = (alpha * Math.PI) / 180;

  const axialPx = A * forceScale;
  const guyPx = F3 * forceScale;
  const loadPx = L * forceScale;

  const legLen = Math.min(220, axialPx + 40);

  const headProjForward = legLen * Math.cos(luffRad);
  const guyHorizFull = Math.tan(alphaRad) > 0.001
    ? (legLen * Math.sin(luffRad)) / Math.tan(alphaRad)
    : 0;

  const desiredAnchorX = 30;
  let footX = desiredAnchorX + guyHorizFull - headProjForward;
  footX = Math.max(footX, 60);
  footX = Math.min(footX, W - headProjForward - 60);

  const headX = footX + headProjForward;
  const headY = ground - legLen * Math.sin(luffRad);

  const headHeight = ground - headY;
  const guyHorizToGround = Math.tan(alphaRad) > 0.001 ? headHeight / Math.tan(alphaRad) : 1000;
  const maxHoriz = headX - 20;
  const fullHoriz = Math.min(guyHorizToGround, maxHoriz);
  const anchorX = headX - fullHoriz;
  const fullGuyEndY = headY + fullHoriz * Math.tan(alphaRad);
  const reachedGround = fullGuyEndY >= ground - 0.5;

  const guyDx = -Math.cos(alphaRad);
  const guyDy = Math.sin(alphaRad);
  const guyArrowEndX = headX + guyDx * guyPx;
  const guyArrowEndY = headY + guyDy * guyPx;

  const loadEndY = Math.min(headY + loadPx, ground - 10);

  const legDx = (footX - headX) / legLen;
  const legDy = (ground - headY) / legLen;
  const axialEndX = headX + legDx * axialPx;
  const axialEndY = headY + legDy * axialPx;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1="20" y1={ground} x2={W - 20} y2={ground} stroke={MUTED} strokeWidth="1" />
      <Hatching y={ground} x1={20} x2={W - 20} />

      <line x1={footX} y1={ground} x2={headX} y2={headY} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />

      <line
        x1={headX}
        y1={headY}
        x2={headX - 50}
        y2={headY}
        stroke={MUTED}
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      <line x1={headX} y1={headY} x2={anchorX} y2={fullGuyEndY} stroke={GUY} strokeWidth="2" strokeLinecap="round" />
      {reachedGround && (
        <polygon
          points={`${anchorX},${ground} ${anchorX - 5},${ground + 8} ${anchorX + 5},${ground + 8}`}
          fill={GUY}
        />
      )}

      <ForceArrow x1={headX} y1={headY} x2={guyArrowEndX} y2={guyArrowEndY} color={FORCE} width={2.5} />
      <RotatedLabel
        x={(headX + guyArrowEndX) / 2}
        y={(headY + guyArrowEndY) / 2}
        dx={guyArrowEndX - headX}
        dy={guyArrowEndY - headY}
        offset={14}
        text={fmt(F3)}
        color={FORCE}
        bold
      />

      <line x1={headX} y1={headY} x2={headX} y2={loadEndY} stroke={STROKE} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <ForceArrow x1={headX} y1={headY} x2={headX} y2={loadEndY} color={FORCE} width={2.5} />
      <RotatedLabel
        x={headX}
        y={(headY + loadEndY) / 2}
        dx={0}
        dy={loadEndY - headY}
        offset={14}
        flipSide
        text={fmt(L)}
        color={FORCE}
        bold
      />

      <ForceArrow x1={headX} y1={headY} x2={axialEndX} y2={axialEndY} color={FORCE} width={2.5} />
      <RotatedLabel
        x={(headX + axialEndX) / 2}
        y={(headY + axialEndY) / 2}
        dx={axialEndX - headX}
        dy={axialEndY - headY}
        offset={14}
        flipSide
        text={fmt(A)}
        color={FORCE}
        bold
      />

      <circle cx={footX} cy={ground} r="4" fill={STROKE} />
      <circle cx={headX} cy={headY} r="3" fill={STROKE} />

      <AngleArc cx={footX} cy={ground} r={28} from={0} to={luff} color={LABEL} label={`${Math.round(luff)}°`} labelOffset={42} />

      <AngleArc
        cx={headX}
        cy={headY}
        r={22}
        from={180}
        to={180 + alpha}
        color={LABEL}
        label={`${Math.round(alpha)}°`}
        labelOffset={36}
      />

      <text x={footX - 8} y={ground + 18} fontSize="10" fill={LABEL} textAnchor="end">foot</text>
      <text x={headX + 6} y={headY - 8} fontSize="10" fill={LABEL}>head</text>
      {reachedGround && (
        <text x={anchorX} y={ground + 22} fontSize="10" fill={GUY} fontWeight="600" textAnchor="middle">anchor</text>
      )}

      <text x={W - 22} y={ground - 6} fontSize="9" fill={MUTED} textAnchor="end">→ load</text>
    </svg>
  );
}

function FrontView({ results, fmt }) {
  const { spread, A2, hobble, forceScale } = results;
  const W = 380, H = 280;
  const ground = H - 30;
  const apexX = W / 2;
  const apexY = 30;
  const halfSpread = (spread / 2) * Math.PI / 180;

  const a2Px = A2 * forceScale;

  const legByHeight = (ground - apexY) / Math.cos(halfSpread);
  const maxByWidth = (W / 2 - 80) / Math.sin(halfSpread);
  const len = Math.min(legByHeight, Math.max(maxByWidth, a2Px + 40));

  const leftFootX = apexX - len * Math.sin(halfSpread);
  const rightFootX = apexX + len * Math.sin(halfSpread);
  const footY = apexY + len * Math.cos(halfSpread);

  const axialLen = Math.min(a2Px, len * 0.8);
  const leftLegDx = (leftFootX - apexX) / len;
  const leftLegDy = (footY - apexY) / len;
  const rightLegDx = (rightFootX - apexX) / len;
  const rightLegDy = (footY - apexY) / len;
  const leftAxX = apexX + leftLegDx * axialLen;
  const leftAxY = apexY + leftLegDy * axialLen;
  const rightAxX = apexX + rightLegDx * axialLen;
  const rightAxY = apexY + rightLegDy * axialLen;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1="20" y1={ground} x2={W - 20} y2={ground} stroke={MUTED} strokeWidth="1" />
      <Hatching y={ground} x1={20} x2={W - 20} />

      <ApexArc cx={apexX} cy={apexY} halfSpread={spread / 2} r={36} color={LABEL} label={`${Math.round(spread)}°`} />

      <line x1={apexX} y1={apexY} x2={leftFootX} y2={footY} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <line x1={apexX} y1={apexY} x2={rightFootX} y2={footY} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />

      <line x1={leftFootX} y1={footY} x2={rightFootX} y2={footY} stroke={GUY} strokeWidth="2" />
      <text
        x={(leftFootX + rightFootX) / 2}
        y={footY + 18}
        fontSize="11"
        fill={GUY}
        textAnchor="middle"
        fontWeight="700"
      >
        {fmt(hobble)}
      </text>
      <text
        x={(leftFootX + rightFootX) / 2}
        y={footY + 30}
        fontSize="9"
        fill={GUY}
        textAnchor="middle"
        fontStyle="italic"
      >
        hobble tension
      </text>

      <ForceArrow x1={apexX} y1={apexY} x2={leftAxX} y2={leftAxY} color={FORCE} width={2.5} />
      <ForceArrow x1={apexX} y1={apexY} x2={rightAxX} y2={rightAxY} color={FORCE} width={2.5} />

      <RotatedLabel
        x={(apexX + leftAxX) / 2}
        y={(apexY + leftAxY) / 2}
        dx={leftAxX - apexX}
        dy={leftAxY - apexY}
        offset={14}
        text={fmt(A2)}
        color={FORCE}
        bold
      />
      <RotatedLabel
        x={(apexX + rightAxX) / 2}
        y={(apexY + rightAxY) / 2}
        dx={rightAxX - apexX}
        dy={rightAxY - apexY}
        offset={14}
        flipSide
        text={fmt(A2)}
        color={FORCE}
        bold
      />

      <circle cx={apexX} cy={apexY} r="4" fill={STROKE} />
      <circle cx={leftFootX} cy={footY} r="4" fill={STROKE} />
      <circle cx={rightFootX} cy={footY} r="4" fill={STROKE} />

      <text x={apexX} y={apexY - 8} fontSize="10" fill={LABEL} textAnchor="middle">apex</text>
    </svg>
  );
}

function TopView({ results, fmt }) {
  const { luff, spread, gamma, S, kickback, R, forceScale } = results;
  const W = 360, H = 460;

  const luffRad = (luff * Math.PI) / 180;
  const halfSpreadRad = (spread / 2) * Math.PI / 180;

  const sinB = Math.sin(halfSpreadRad);
  const cosB = Math.cos(halfSpreadRad);

  const fLeft = { x: -sinB, y: 0 };
  const fRight = { x: +sinB, y: 0 };
  const head = { x: 0, y: cosB * Math.cos(luffRad) };

  const reach = head.y;
  const halfWidth = sinB;

  const splayPx = S * forceScale;
  const kickPx = kickback * forceScale;

  const padding = 50;
  const drawW = W - padding * 2;
  const drawH = H - padding * 2;

  const reserveBelow = kickPx + 50;
  const reserveSide = splayPx + 30;

  const availableY = drawH - reserveBelow;
  const availableX = drawW - 2 * reserveSide;
  const spanX = Math.max(2 * halfWidth, 0.4);
  const spanY = Math.max(reach + 0.05, 0.3);
  const scale = Math.min(availableX / spanX, availableY / spanY) * 0.95;

  const cxScreen = W / 2;
  const feetScreenY = padding + reach * scale;

  const tx = (px) => cxScreen + px * scale;
  const ty = (py) => feetScreenY - py * scale;

  const fLeftSx = tx(fLeft.x);
  const fLeftSy = ty(fLeft.y);
  const fRightSx = tx(fRight.x);
  const fRightSy = ty(fRight.y);
  const headSx = tx(head.x);
  const headSy = ty(head.y);

  const rSplayEndX = fRightSx + splayPx;
  const rSplayEndY = fRightSy;
  const rKickEndX = fRightSx;
  const rKickEndY = fRightSy + kickPx;
  const rResEndX = fRightSx + splayPx;
  const rResEndY = fRightSy + kickPx;

  const lSplayEndX = fLeftSx - splayPx;
  const lSplayEndY = fLeftSy;
  const lKickEndX = fLeftSx;
  const lKickEndY = fLeftSy + kickPx;
  const lResEndX = fLeftSx - splayPx;
  const lResEndY = fLeftSy + kickPx;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <g opacity="0.75">
        <line x1={W / 2} y1={28} x2={W / 2} y2={10} stroke={MUTED} strokeWidth="1.25" />
        <polygon points={`${W / 2},${8} ${W / 2 - 4},${15} ${W / 2 + 4},${15}`} fill={MUTED} />
        <text x={W / 2 + 10} y={16} fontSize="10" fill={LABEL}>load</text>
      </g>

      <g opacity="0.75">
        <line x1={W / 2} y1={H - 28} x2={W / 2} y2={H - 10} stroke={MUTED} strokeWidth="1.25" />
        <polygon points={`${W / 2},${H - 8} ${W / 2 - 4},${H - 15} ${W / 2 + 4},${H - 15}`} fill={MUTED} />
        <text x={W / 2 + 10} y={H - 14} fontSize="10" fill={LABEL}>anchor</text>
      </g>

      <line x1={fLeftSx} y1={fLeftSy} x2={fRightSx} y2={fRightSy} stroke={GUY} strokeWidth="1.5" strokeDasharray="4 3" />

      <line x1={fLeftSx} y1={fLeftSy} x2={headSx} y2={headSy} stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <line x1={fRightSx} y1={fRightSy} x2={headSx} y2={headSy} stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />

      <line
        x1={(fLeftSx + fRightSx) / 2}
        y1={(fLeftSy + fRightSy) / 2}
        x2={headSx}
        y2={headSy}
        stroke={MUTED}
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      <line x1={rSplayEndX} y1={rSplayEndY} x2={rResEndX} y2={rResEndY} stroke={FORCE} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
      <line x1={rKickEndX} y1={rKickEndY} x2={rResEndX} y2={rResEndY} stroke={FORCE} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />

      <ForceArrow x1={fRightSx} y1={fRightSy} x2={rSplayEndX} y2={rSplayEndY} color={FORCE} width={1.75} dashed />
      <RotatedLabel
        x={(fRightSx + rSplayEndX) / 2}
        y={fRightSy}
        dx={splayPx}
        dy={0}
        offset={12}
        flipSide
        text={fmt(S)}
        color={FORCE}
        bold
      />

      <ForceArrow x1={fRightSx} y1={fRightSy} x2={rKickEndX} y2={rKickEndY} color={FORCE} width={1.75} dashed />
      <RotatedLabel
        x={fRightSx}
        y={(fRightSy + rKickEndY) / 2}
        dx={0}
        dy={kickPx}
        offset={12}
        text={fmt(kickback)}
        color={FORCE}
        bold
      />

      <ForceArrow x1={fRightSx} y1={fRightSy} x2={rResEndX} y2={rResEndY} color={FORCE} width={2.5} />
      <RotatedLabel
        x={(fRightSx + rResEndX) / 2}
        y={(fRightSy + rResEndY) / 2}
        dx={splayPx}
        dy={kickPx}
        offset={14}
        text={fmt(R)}
        color={FORCE}
        bold
      />

      <AngleArc
        cx={fRightSx}
        cy={fRightSy}
        r={Math.min(splayPx, kickPx) * 0.55}
        from={0}
        to={-gamma}
        color={LABEL}
        label={`γ = ${gamma.toFixed(1)}°`}
        labelOffset={Math.min(splayPx, kickPx) * 0.55 + 18}
      />

      <line x1={lSplayEndX} y1={lSplayEndY} x2={lResEndX} y2={lResEndY} stroke={FORCE} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
      <line x1={lKickEndX} y1={lKickEndY} x2={lResEndX} y2={lResEndY} stroke={FORCE} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />

      <ForceArrow x1={fLeftSx} y1={fLeftSy} x2={lSplayEndX} y2={lSplayEndY} color={FORCE} width={1.75} dashed />
      <RotatedLabel
        x={(fLeftSx + lSplayEndX) / 2}
        y={fLeftSy}
        dx={-splayPx}
        dy={0}
        offset={12}
        text={fmt(S)}
        color={FORCE}
        bold
      />

      <ForceArrow x1={fLeftSx} y1={fLeftSy} x2={lKickEndX} y2={lKickEndY} color={FORCE} width={1.75} dashed />
      <RotatedLabel
        x={fLeftSx}
        y={(fLeftSy + lKickEndY) / 2}
        dx={0}
        dy={kickPx}
        offset={12}
        flipSide
        text={fmt(kickback)}
        color={FORCE}
        bold
      />

      <ForceArrow x1={fLeftSx} y1={fLeftSy} x2={lResEndX} y2={lResEndY} color={FORCE} width={2.5} />
      <RotatedLabel
        x={(fLeftSx + lResEndX) / 2}
        y={(fLeftSy + lResEndY) / 2}
        dx={-splayPx}
        dy={kickPx}
        offset={14}
        flipSide
        text={fmt(R)}
        color={FORCE}
        bold
      />

      <circle cx={fLeftSx} cy={fLeftSy} r="4" fill={STROKE} />
      <circle cx={fRightSx} cy={fRightSy} r="4" fill={STROKE} />
      <text x={fLeftSx} y={fLeftSy - 8} fontSize="10" fill={LABEL} textAnchor="middle">foot</text>
      <text x={fRightSx} y={fRightSy - 8} fontSize="10" fill={LABEL} textAnchor="middle">foot</text>

      <circle cx={headSx} cy={headSy} r="4" fill={STROKE} />
      <text x={headSx + 8} y={headSy + 4} fontSize="10" fill={LABEL}>head (proj.)</text>

      <text
        x={((fLeftSx + fRightSx) / 2 + headSx) / 2 + 8}
        y={((fLeftSy + fRightSy) / 2 + headSy) / 2}
        fontSize="9"
        fill={MUTED}
        fontStyle="italic"
      >
        reach
      </text>
    </svg>
  );
}

function Hatching({ y, x1, x2 }) {
  const lines = [];
  for (let x = x1; x < x2; x += 8) {
    lines.push(<line key={x} x1={x} y1={y} x2={x - 6} y2={y + 6} stroke={MUTED} strokeWidth="0.75" />);
  }
  return <g opacity="0.6">{lines}</g>;
}

function ForceArrow({ x1, y1, x2, y2, color, width = 2, dashed }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const ahLen = 8;
  const ahWid = 4.5;
  const baseX = x2 - ux * ahLen;
  const baseY = y2 - uy * ahLen;
  const perpX = -uy * ahWid;
  const perpY = ux * ahWid;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeLinecap={dashed ? "butt" : "round"}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      <polygon
        points={`${x2},${y2} ${baseX + perpX},${baseY + perpY} ${baseX - perpX},${baseY - perpY}`}
        fill={color}
      />
    </g>
  );
}

function RotatedLabel({ x, y, dx, dy, offset, flipSide, text, color, bold }) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return null;
  const sign = flipSide ? -1 : 1;
  const px = (-dy / len) * sign;
  const py = (dx / len) * sign;
  const labelX = x + px * offset;
  const labelY = y + py * offset;

  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  return (
    <text
      x={labelX}
      y={labelY}
      fontSize="10"
      fill={color}
      fontWeight={bold ? 700 : 600}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(${angle.toFixed(1)} ${labelX} ${labelY})`}
    >
      {text}
    </text>
  );
}

function AngleArc({ cx, cy, r, from, to, color, label, labelOffset = 30 }) {
  const toRad = (d) => (d * Math.PI) / 180;
  const point = (angDeg) => [cx + r * Math.cos(toRad(angDeg)), cy - r * Math.sin(toRad(angDeg))];
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  const delta = to - from;
  const largeArc = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 0 : 1;
  const midDeg = (from + to) / 2;
  const lx = cx + labelOffset * Math.cos(toRad(midDeg));
  const ly = cy - labelOffset * Math.sin(toRad(midDeg)) + 3;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
      />
      {label && (
        <text x={lx} y={ly} fontSize="10" fill={color} textAnchor="middle" fontWeight="600">
          {label}
        </text>
      )}
    </g>
  );
}

function ApexArc({ cx, cy, halfSpread, r, color, label }) {
  const toRad = (d) => (d * Math.PI) / 180;
  const fromDeg = -90 - halfSpread;
  const toDeg = -90 + halfSpread;

  const point = (angDeg) => [cx + r * Math.cos(toRad(angDeg)), cy - r * Math.sin(toRad(angDeg))];
  const [x1, y1] = point(fromDeg);
  const [x2, y2] = point(toDeg);
  const delta = toDeg - fromDeg;
  const largeArc = delta > 180 ? 1 : 0;
  const sweep = 1;

  const labelDist = r + 12;
  const lx = cx + labelDist * Math.cos(toRad(-90));
  const ly = cy - labelDist * Math.sin(toRad(-90)) + 4;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
      />
      <text x={lx} y={ly} fontSize="10" fill={color} textAnchor="middle" fontWeight="600">
        {label}
      </text>
    </g>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BipodCalculator />);
