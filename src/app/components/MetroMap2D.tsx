import { forwardRef, useImperativeHandle, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { MetroMap3D, DEFAULT_MAP_LAYERS, type MapLayers } from "@/app/components/MetroMap3D";
import type { Station } from "@/app/data/metro";
import { SOLMOVE } from "@/app/theme/solmove";

export interface MetroMap2DHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

function MapLegends() {
  return (
    <>
      <div className="absolute left-2 bottom-2 rounded-xl bg-white/95 border px-2.5 py-2 shadow-sm pointer-events-none z-10"
        style={{ borderColor: SOLMOVE.gray, fontFamily: "'Onest', sans-serif" }}>
        {[[SOLMOVE.path, "Working"], [SOLMOVE.sun, "Maintenance"], [SOLMOVE.ink, "Closed"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full border-2" style={{ borderColor: c }} />
            <span className="text-[9px]" style={{ color: SOLMOVE.muted }}>{l}</span>
          </div>
        ))}
      </div>
      <div className="absolute right-2 bottom-2 rounded-xl bg-white/95 border px-2.5 py-2 shadow-sm pointer-events-none z-10 max-w-[148px]"
        style={{ borderColor: SOLMOVE.gray, fontFamily: "'Onest', sans-serif" }}>
        {[
          ["#E3051B", "L1 — Fondo / H. Bellvitge"],
          ["#9B2D9E", "L2 — Badalona / Paral·lel"],
          ["#3FAB2E", "L3 — Trinitat Nova / Zona Univ."],
          ["#F5A800", "L4 — Fòrum / Trinitat Nova"],
          ["#0065A7", "L5 — Vall d'Hebron / Cornellà"],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <span className="w-4 h-1 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[8px] leading-tight" style={{ color: SOLMOVE.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export const MetroMap2D = forwardRef<MetroMap2DHandle, {
  filter: string;
  onStation: (s: Station) => void;
  selectedId?: string | null;
  layers?: MapLayers;
}>(function MetroMap2D({ filter, onStation, selectedId, layers = DEFAULT_MAP_LAYERS }, ref) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const zoomRef = useRef(55);

  const applyZoom = (zoom: number) => {
    const cam = controlsRef.current?.object;
    if (cam instanceof THREE.OrthographicCamera) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      zoomRef.current = Math.min(zoomRef.current * 1.25, 105);
      applyZoom(zoomRef.current);
    },
    zoomOut: () => {
      zoomRef.current = Math.max(zoomRef.current / 1.25, 35);
      applyZoom(zoomRef.current);
    },
    reset: () => {
      zoomRef.current = 55;
      controlsRef.current?.target.set(0, 0, 0);
      const cam = controlsRef.current?.object;
      if (cam instanceof THREE.OrthographicCamera) {
        cam.position.set(0, 50, 0);
        cam.up.set(0, 1, 0);
        cam.lookAt(0, 0, 0);
        cam.zoom = 55;
        cam.updateProjectionMatrix();
      }
      controlsRef.current?.update();
    },
  }));

  return (
    <div className="relative w-full h-full min-h-[280px] bg-[#E4E4E8]">
      <MetroMap3D
        variant="2d"
        filter={filter}
        onStation={onStation}
        selectedId={selectedId}
        layers={layers}
        controlsRef={controlsRef}
        zoomRef={zoomRef}
      />
      <MapLegends />
    </div>
  );
});
