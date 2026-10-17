"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
const short = (name: string) =>
  name
    .replace("Other infrastructure problems", "Other")
    .replace("Overflowing public bins", "Bins")
    .replace("Broken streetlights", "Streetlights")
    .replace("streetlights", "Streetlights")
    .replace("Damaged ", "")
    .replace("Blocked drains", "Drains")
    .replace("traffic signs", "Signs");
export default function CategoryChart({
  data,
  time = false,
}: {
  data: { name: string; value: number }[];
  time?: boolean;
}) {
  const values = data.map((d) => ({
    ...d,
    name: time ? d.name.replace(/ 20[0-9]{2}$/, "") : short(d.name),
  }));
  return (
    <div
      role="img"
      aria-label={values.map((d) => `${d.name}: ${d.value}`).join("; ")}
      style={{
        height: Math.max(260, time ? 260 : data.length * 25),
        minWidth: 0,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={values}
          layout={time ? "horizontal" : "vertical"}
          margin={{
            left: time ? -25 : 0,
            right: 20,
            top: 10,
            bottom: time ? 25 : 0,
          }}
        >
          <CartesianGrid horizontal={time} vertical={!time} stroke="#edf1f2" />
          <XAxis
            type={time ? "category" : "number"}
            dataKey={time ? "name" : undefined}
            tick={{ fontSize: 9 }}
            interval={
              time ? Math.max(0, Math.floor(values.length / 7) - 1) : undefined
            }
            angle={time ? -25 : 0}
            textAnchor={time ? "end" : "middle"}
            allowDecimals={false}
          />
          <YAxis
            type={time ? "number" : "category"}
            dataKey={time ? undefined : "name"}
            width={time ? 40 : 100}
            tick={{ fontSize: 9 }}
            allowDecimals={false}
          />
          <Tooltip />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            name={time ? "Reports" : "Canonical issues"}
            fill="#2563eb"
            radius={time ? [5, 5, 0, 0] : [0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
