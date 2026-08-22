import React, { useEffect, useRef } from "react";
import { calculateFibonacciPrices, type DrawingItem } from "./chartDrawing";

type ChartDrawingOverlayProps = {
  drawings: DrawingItem[];
  chart: any;
  series: any;
  onSelectDrawing?: (id: string) => void;
  selectedId?: string | null;
  drawingTool?: string;
  onAddDrawing?: (drawing: DrawingItem) => void;
};

export function ChartDrawingOverlay({ drawings, chart, series, onSelectDrawing, selectedId, drawingTool, onAddDrawing }: ChartDrawingOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingFibRef = useRef<{ p1: { time: number; price: number } } | null>(null);

  useEffect(() => {
    if (!chart || !series || !containerRef.current) return;

    const updatePositions = () => {
      const el = containerRef.current;
      if (!el) return;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      const svg = el.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
    };

    const handleTimeScaleChange = () => updatePositions();
    chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeScaleChange);

    return () => {
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeScaleChange);
      } catch {
        // ignore
      }
    };
  }, [chart, series]);

  // Compute screen pixel coordinates for drawings
  const timeScale = chart?.timeScale();
  const renderedItems = drawings.map((item) => {
    if (!timeScale || !series) return null;

    if (item.type === "horizontal") {
      const y = series.priceToCoordinate(item.p1.price);
      if (y === null || !Number.isFinite(y)) return null;
      return {
        id: item.id,
        type: "horizontal" as const,
        y,
        color: item.color,
        selected: selectedId === item.id,
      };
    } else if (item.type === "trendline" && item.p2) {
      const x1 = timeScale.timeToCoordinate(item.p1.time);
      const y1 = series.priceToCoordinate(item.p1.price);
      const x2 = timeScale.timeToCoordinate(item.p2.time);
      const y2 = series.priceToCoordinate(item.p2.price);

      if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
      return {
        id: item.id,
        type: "trendline" as const,
        x1,
        y1,
        x2,
        y2,
        color: item.color,
        selected: selectedId === item.id,
      };
    } else if (item.type === "fibonacci" && item.p2) {
      const x1 = timeScale.timeToCoordinate(item.p1.time);
      const y1 = series.priceToCoordinate(item.p1.price);
      const x2 = timeScale.timeToCoordinate(item.p2.time);
      const y2 = series.priceToCoordinate(item.p2.price);

      if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

      const fibLevels = calculateFibonacciPrices(item.p1.price, item.p2.price).map((lvl) => ({
        ratio: lvl.ratio,
        price: lvl.price,
        y: series.priceToCoordinate(lvl.price),
      })).filter((lvl) => lvl.y !== null && Number.isFinite(lvl.y));

      return {
        id: item.id,
        type: "fibonacci" as const,
        x1,
        y1,
        x2,
        y2,
        levels: fibLevels,
        color: item.color,
        selected: selectedId === item.id,
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <svg className="h-full w-full">
        {renderedItems.map((item) => {
          if (!item) return null;
          if (item.type === "horizontal") {
            return (
              <g key={item.id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectDrawing?.(item.id)}>
                <line
                  x1={0}
                  y1={item.y}
                  x2="100%"
                  y2={item.y}
                  stroke={item.selected ? "#ffffff" : item.color}
                  strokeWidth={item.selected ? 2 : 1.5}
                  strokeDasharray={item.selected ? "4 4" : undefined}
                />
                <circle cx={40} cy={item.y} r={4} fill={item.color} />
                <text x={48} y={item.y + 4} fill="#cbd5e1" fontSize={10} fontFamily="monospace">
                  Level (${item.y.toFixed(0)})
                </text>
              </g>
            );
          } else if (item.type === "trendline") {
            return (
              <g key={item.id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectDrawing?.(item.id)}>
                <line
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke={item.selected ? "#ffffff" : item.color}
                  strokeWidth={item.selected ? 2.5 : 1.5}
                />
                <circle cx={item.x1} cy={item.y1} r={4} fill={item.color} />
                <circle cx={item.x2} cy={item.y2} r={4} fill={item.color} />
              </g>
            );
          } else if (item.type === "fibonacci") {
            const minX = Math.min(item.x1, item.x2);
            const maxX = Math.max(item.x1, item.x2, minX + 120);
            return (
              <g key={item.id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectDrawing?.(item.id)}>
                <line
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke={item.color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {item.levels.map((lvl) => (
                  <g key={lvl.ratio}>
                    <line
                      x1={minX}
                      y1={lvl.y}
                      x2={Math.max(window.innerWidth - 80, maxX)}
                      y2={lvl.y}
                      stroke={item.selected ? "#ffffff" : item.color}
                      strokeWidth={lvl.ratio === 0 || lvl.ratio === 1 ? 1.5 : 1}
                      strokeOpacity={lvl.ratio > 1 ? 0.6 : 0.8}
                    />
                    <text
                      x={minX + 8}
                      y={lvl.y - 4}
                      fill={item.selected ? "#ffffff" : "#94a3b8"}
                      fontSize={10}
                      fontFamily="monospace"
                    >
                      Fib {(lvl.ratio * 100).toFixed(1).replace(/\.0$/, "")}% ({lvl.price.toFixed(2)})
                    </text>
                  </g>
                ))}
                <circle cx={item.x1} cy={item.y1} r={4} fill={item.color} />
                <circle cx={item.x2} cy={item.y2} r={4} fill={item.color} />
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
