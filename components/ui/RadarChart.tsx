'use client';

interface Props {
  data: { label: string; value: number }[];
  max?: number;
  size?: number;
}

/** 三维雷达图（三角形），纯 SVG 手写 */
export default function RadarChart({ data, max = 100, size = 190 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 26;
  const n = data.length;

  const pt = (i: number, ratio: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(ang) * r * ratio, cy + Math.sin(ang) * r * ratio] as const;
  };

  // ratio 钳到 1：成长点投入后属性可超过刻度上限，图形不外溢
  const ratio = (v: number) => Math.min(1, Math.max(0.05, v / max));
  const poly = data.map((d, i) => pt(i, ratio(d.value)).join(',')).join(' ');
  const gridRings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} className="overflow-visible">
      {/* 网格 */}
      {gridRings.map((g) => (
        <polygon
          key={g}
          points={data.map((_, i) => pt(i, g).join(',')).join(' ')}
          fill="none"
          stroke="rgba(224,224,224,0.12)"
          strokeWidth={g === 1 ? 1 : 0.6}
        />
      ))}
      {/* 轴线 */}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(224,224,224,0.12)" strokeWidth={0.6} />;
      })}

      {/* 数据区 */}
      <polygon points={poly} fill="rgba(0,255,157,0.16)" stroke="#00ff9d" strokeWidth={1.4} />
      {data.map((d, i) => {
        const [x, y] = pt(i, ratio(d.value));
        return <circle key={d.label} cx={x} cy={y} r={2.6} fill="#00ff9d" />;
      })}

      {/* 标签 */}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.24);
        return (
          <text
            key={d.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-chalk/70 font-mono text-[10px] tracking-[0.2em]"
          >
            {d.label}
            <tspan className="fill-toxic" dx="4">
              {d.value}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
