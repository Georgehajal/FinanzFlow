import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Circle, Polyline, Line, Path, G } from 'react-native-svg';
import { Theme } from '../theme/tokens';

// ── Jahresverlauf: Einnahmen vs. Ausgaben (Balken) + Überschuss-Linie ─────────

export function BarYearChart({
  theme, width, months,
}: {
  theme: Theme; width: number;
  months: { einnahmen: number; ausgaben: number; ueberschuss: number }[];
}) {
  const H = 170;
  const padT = 10, padB = 18, padX = 6;
  const innerH = H - padT - padB;
  const n = months.length || 1;
  const slot = (width - padX * 2) / n;
  const barW = Math.max(3, slot * 0.32);
  const maxVal = Math.max(1, ...months.map(m => Math.max(m.einnahmen, m.ausgaben)));
  const minU = Math.min(0, ...months.map(m => m.ueberschuss));
  const maxU = Math.max(1, ...months.map(m => m.ueberschuss));
  const y = (v: number) => padT + innerH - (v / maxVal) * innerH;
  const yU = (v: number) => padT + innerH - ((v - minU) / (maxU - minU || 1)) * innerH;

  const linePts = months
    .map((m, i) => `${padX + slot * i + slot / 2},${yU(m.ueberschuss)}`)
    .join(' ');

  return (
    <Svg width={width} height={H}>
      <Line x1={padX} y1={padT + innerH} x2={width - padX} y2={padT + innerH} stroke={theme.border} strokeWidth={1} />
      {months.map((m, i) => {
        const cx = padX + slot * i + slot / 2;
        return (
          <G key={i}>
            <Rect x={cx - barW - 1} y={y(m.einnahmen)} width={barW} height={Math.max(0, padT + innerH - y(m.einnahmen))} rx={2} fill={theme.income} />
            <Rect x={cx + 1} y={y(m.ausgaben)} width={barW} height={Math.max(0, padT + innerH - y(m.ausgaben))} rx={2} fill={theme.expense} />
          </G>
        );
      })}
      <Polyline points={linePts} fill="none" stroke={theme.text} strokeWidth={2} strokeLinejoin="round" />
      {months.map((m, i) => (
        <Circle key={`d${i}`} cx={padX + slot * i + slot / 2} cy={yU(m.ueberschuss)} r={2.6} fill={theme.text} />
      ))}
    </Svg>
  );
}

// ── Donut: Ausgaben nach Kategorie ───────────────────────────────────────────

export function DonutChart({
  theme, size = 150, stroke = 26, data, centerLabel, centerValue,
}: {
  theme: Theme; size?: number; stroke?: number;
  data: { label: string; value: number; color: string }[];
  centerLabel: string; centerValue: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} stroke={theme.surface2} strokeWidth={stroke} fill="none" />
          {total > 0 && data.map((d, i) => {
            const frac = d.value / total;
            const seg = (
              <Circle
                key={i}
                cx={cx} cy={cy} r={r}
                stroke={d.color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
                strokeLinecap="butt"
              />
            );
            acc += frac;
            return seg;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: theme.textMuted }}>{centerLabel}</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, marginTop: 2 }}>{centerValue}</Text>
      </View>
    </View>
  );
}

// ── Trend: eine Linie über Monate (mit Nulllinie + Punkten) ──────────────────

export function TrendLineChart({
  theme, width, points, color, fmt,
}: {
  theme: Theme; width: number;
  points: { label: string; value: number }[];
  color: string;
  fmt?: (v: number) => string;
}) {
  const H = 130;
  const padT = 14, padB = 16, padX = 8;
  const innerH = H - padT - padB;
  const n = Math.max(1, points.length);
  const vals = points.map(p => p.value);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const x = (i: number) => padX + (n === 1 ? (width - padX * 2) / 2 : ((width - padX * 2) / (n - 1)) * i);
  const y = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;
  const poly = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const zeroY = y(0);

  return (
    <View>
      <Svg width={width} height={H}>
        {min < 0 && (
          <Line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke={theme.border} strokeWidth={1} strokeDasharray="3 4" />
        )}
        <Polyline points={poly} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill={color} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 10, color: theme.textDim }}>{points[0]?.label}</Text>
        <Text style={{ fontSize: 10, color: theme.textDim }}>{points[points.length - 1]?.label}</Text>
      </View>
      {fmt && (
        <Text style={{ fontSize: 11, color: theme.textMuted, textAlign: 'right', paddingRight: 4, marginTop: 2 }}>
          aktuell {fmt(points[points.length - 1]?.value ?? 0)}
        </Text>
      )}
    </View>
  );
}

// ── Immobilien-Tilgungsverlauf: Restschuld (Fläche) vs. getilgt ──────────────

export function AmortAreaChart({
  theme, width, schedule,
}: {
  theme: Theme; width: number;
  schedule: { jahr: number; restschuld: number; getilgtKumuliert: number }[];
}) {
  const H = 160;
  const padT = 10, padB = 18, padX = 6;
  const innerH = H - padT - padB;
  const n = Math.max(1, schedule.length);
  const maxV = Math.max(1, ...schedule.map(s => Math.max(s.restschuld, s.getilgtKumuliert)));
  const x = (i: number) => padX + (n === 1 ? 0 : ((width - padX * 2) / (n - 1)) * i);
  const y = (v: number) => padT + innerH - (v / maxV) * innerH;

  const restLine = schedule.map((s, i) => `${x(i)},${y(s.restschuld)}`).join(' ');
  const tilgLine = schedule.map((s, i) => `${x(i)},${y(s.getilgtKumuliert)}`).join(' ');
  const area = `${padX},${padT + innerH} ` + restLine + ` ${x(n - 1)},${padT + innerH}`;

  return (
    <Svg width={width} height={H}>
      <Line x1={padX} y1={padT + innerH} x2={width - padX} y2={padT + innerH} stroke={theme.border} strokeWidth={1} />
      <Polyline points={area} fill={theme.expense + '22'} stroke="none" />
      <Polyline points={restLine} fill="none" stroke={theme.expense} strokeWidth={2.5} strokeLinejoin="round" />
      <Polyline points={tilgLine} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinejoin="round" />
    </Svg>
  );
}

// ── Mini-Legende ─────────────────────────────────────────────────────────────

export function Legend({
  theme, items,
}: { theme: Theme; items: { label: string; color: string; value?: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
      {items.map(it => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: it.color }} />
          <Text style={{ fontSize: 12, color: theme.textMuted }}>
            {it.label}{it.value ? ` · ${it.value}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}
