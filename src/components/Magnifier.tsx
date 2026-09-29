// Parmağın biraz üstünde duran yuvarlak büyüteç. Aynı çizimi büyütülmüş olarak gösterir.
import { useRef, useState, type ReactNode } from "react";

type Props = {
  active: boolean;
  width: number;
  height: number;
  zoom?: number;
  render: (width: number, sharp: boolean) => ReactNode;
  onFirstUse?: () => void;
};

const R = 82;         // mercek yarıçapı
const LIFT = 84;      // merceği parmağın ne kadar üstünde göster

export function Magnifier({ active, width, height, zoom = 3, render, onFirstUse }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const update = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(height, e.clientY - rect.top));
    setPos({ x, y });
  };

  return (
    <div
      ref={ref}
      className={`mag-wrap ${active ? "on" : ""}`}
      style={{ width, height, touchAction: active ? "none" : "auto" }}
      onPointerDown={e => { if (!active) return; (e.target as Element).setPointerCapture?.(e.pointerId); onFirstUse?.(); update(e); }}
      onPointerMove={e => { if (active && pos) update(e); }}
      onPointerUp={() => setPos(null)}
      onPointerCancel={() => setPos(null)}
    >
      {render(width, false)}
      {active && pos && (
        <div className="lens" style={{ left: pos.x - R, top: pos.y - R - LIFT, width: R * 2, height: R * 2 }}>
          <div style={{ position: "absolute", left: -(pos.x * zoom - R), top: -(pos.y * zoom - R), width: width * zoom, pointerEvents: "none" }}>
            {render(width * zoom, true)}
          </div>
        </div>
      )}
      {active && pos && <div className="lens-dot" style={{ left: pos.x - 4, top: pos.y - 4 }} />}
    </div>
  );
}
