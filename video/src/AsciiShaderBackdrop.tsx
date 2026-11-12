import React, { useEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type VideoAsciiMode = "globe" | "donut" | "topography" | "plasma";

interface AsciiShaderBackdropProps {
  mode: VideoAsciiMode;
  width?: number;
  height?: number;
  cellSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  opacity?: number;
}

const CHARSET_STD = " .:-=+*#%@";
const CHARSET_BLOCKS = " ░▒▓█";

/**
 * Deterministic frame-driven `asciicn` shader & 3D ASCII renderer for 60 FPS Remotion.
 * Renders 3D rotating ASCII Globe, 3D ASCII Vault Torus, Topography Contours, or Plasma Field.
 */
export const AsciiShaderBackdrop: React.FC<AsciiShaderBackdropProps> = ({
  mode,
  width = 1920,
  height = 1080,
  cellSize = 18,
  primaryColor = "#FFD244",
  secondaryColor = "#22D7DA",
  opacity = 0.55,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = frame / fps;
    const cols = Math.floor(width / (cellSize * 0.62));
    const rows = Math.floor(height / cellSize);
    const cw = width / cols;
    const ch = height / rows;

    ctx.clearRect(0, 0, width, height);
    ctx.font = `600 ${Math.round(cellSize * 0.88)}px "Commit Mono", ui-monospace, Menlo, monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    if (mode === "globe") {
      const cx = cols * 0.5;
      const cy = rows * 0.5;
      const rad = Math.min(cols * 0.24, rows * 0.38);
      const rotY = t * 0.85;
      const tiltX = 0.32;
      const cosT = Math.cos(tiltX);
      const sinT = Math.sin(tiltX);

      for (let r = 0; r < rows; r++) {
        const ny = (r - cy) / rad;
        if (Math.abs(ny) > 1.02) continue;
        for (let c = 0; c < cols; c++) {
          const nx = (c - cx) / (rad * 1.55);
          const d2 = nx * nx + ny * ny;
          if (d2 > 1.0) continue;
          const nz = Math.sqrt(Math.max(0, 1.0 - d2));

          // Rotate around X then Y
          const y1 = ny * cosT - nz * sinT;
          const z1 = ny * sinT + nz * cosT;
          const lon = Math.atan2(nx, z1) + rotY;
          const lat = Math.asin(Math.max(-1, Math.min(1, y1)));

          // Procedural continent mask + lat/lon gridlines
          const continent =
            Math.sin(lon * 2.4 + Math.cos(lat * 3.1)) * 0.55 +
            Math.cos(lat * 3.6 - Math.sin(lon * 1.8)) * 0.45;
          const gridLine =
            Math.abs(Math.sin(lon * 6)) < 0.08 || Math.abs(Math.sin(lat * 6)) < 0.08;

          const light = Math.max(0.12, nx * -0.45 + ny * -0.35 + nz * 0.82);
          const isLand = continent > 0.08;
          const val = Math.min(0.99, light * (isLand ? 1.0 : gridLine ? 0.58 : 0.26));
          const chIdx = Math.floor(val * (CHARSET_STD.length - 1));
          if (chIdx <= 0) continue;

          ctx.fillStyle = isLand ? primaryColor : secondaryColor;
          ctx.globalAlpha = opacity * (isLand ? 0.95 : 0.58);
          ctx.fillText(CHARSET_STD[chIdx], (c + 0.5) * cw, (r + 0.5) * ch);
        }
      }
      return;
    }

    if (mode === "donut") {
      const zbuf = new Float32Array(cols * rows);
      const lum = new Float32Array(cols * rows);
      const A = t * 1.15;
      const B = t * 0.68;
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const cosB = Math.cos(B);
      const sinB = Math.sin(B);

      const R1 = 1.0;
      const R2 = 2.15;
      const K2 = 5.4;
      const K1 = rows * K2 * 0.24;

      for (let theta = 0; theta < Math.PI * 2; theta += 0.065) {
        const cost = Math.cos(theta);
        const sint = Math.sin(theta);
        for (let phi = 0; phi < Math.PI * 2; phi += 0.03) {
          const cosp = Math.cos(phi);
          const sinp = Math.sin(phi);
          const circlex = R2 + R1 * cost;
          const circley = R1 * sint;

          const x = circlex * (cosB * cosp + sinA * sinB * sinp) - circley * cosA * sinB;
          const y = circlex * (sinB * cosp - sinA * cosB * sinp) + circley * cosA * cosB;
          const z = K2 + cosA * circlex * sinp + circley * sinA;
          const ooz = 1 / z;

          const xp = Math.floor(cols * 0.5 + K1 * ooz * x * 1.55);
          const yp = Math.floor(rows * 0.5 - K1 * ooz * y);
          if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;

          const L =
            cosp * cost * sinB -
            cosA * cost * sinp -
            sinA * sint +
            cosB * (cosA * sint - cost * sinA * sinp);
          const idx = xp + yp * cols;
          if (ooz > zbuf[idx]) {
            zbuf[idx] = ooz;
            lum[idx] = Math.max(0.08, (L + 1.4) / 2.8);
          }
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = lum[c + r * cols];
          if (v <= 0.01) continue;
          const chIdx = Math.min(CHARSET_STD.length - 1, Math.floor(v * CHARSET_STD.length));
          ctx.fillStyle = v > 0.58 ? primaryColor : secondaryColor;
          ctx.globalAlpha = opacity * (0.45 + 0.55 * v);
          ctx.fillText(CHARSET_STD[chIdx], (c + 0.5) * cw, (r + 0.5) * ch);
        }
      }
      return;
    }

    // Topography or Plasma ASCII shader field
    const chars = mode === "plasma" ? CHARSET_BLOCKS : CHARSET_STD;
    for (let r = 0; r < rows; r++) {
      const ny = r / rows;
      for (let c = 0; c < cols; c++) {
        const nx = c / cols;
        let val = 0;
        if (mode === "topography") {
          const w1 = Math.sin(nx * 9.0 + t * 0.7 + Math.cos(ny * 6.5 - t * 0.45));
          const w2 = Math.cos(ny * 8.0 - t * 0.5 + Math.sin(nx * 5.0 + t * 0.35));
          const band = Math.abs(((w1 + w2) * 2.6) % 1);
          val = band < 0.22 ? 0.85 : band < 0.38 ? 0.38 : 0.0;
        } else {
          const p =
            Math.sin(nx * 10 + t * 1.4) +
            Math.sin(ny * 8 - t * 1.1) +
            Math.sin((nx + ny) * 7 + t * 0.9);
          val = (p + 3) / 6;
        }
        const chIdx = Math.floor(val * (chars.length - 1));
        if (chIdx <= 0) continue;
        ctx.fillStyle = val > 0.62 ? primaryColor : secondaryColor;
        ctx.globalAlpha = opacity * (0.3 + 0.65 * val);
        ctx.fillText(chars[chIdx], (c + 0.5) * cw, (r + 0.5) * ch);
      }
    }
  }, [frame, fps, mode, width, height, cellSize, primaryColor, secondaryColor, opacity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};
