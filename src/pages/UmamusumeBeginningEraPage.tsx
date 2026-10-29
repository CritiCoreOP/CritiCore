import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { feature } from "topojson-client";
import { Sparkles, MapPin, Clock } from "lucide-react";
import umamusumeLogo from "@/assets/umamusume-beginning-era-logo.png";
import umamusumeBackdrop from "@/assets/umamusume-beginning-era-backdrop.jpg";

type Status = "in_theaters" | "soon";

interface Country {
  name: string;
  lat: number;
  lng: number;
  status: Status;
  flag: string;
}

const COUNTRIES: Country[] = [
  // IN_THEATERS
  { name: "Japan", lat: 36.2048, lng: 138.2529, status: "in_theaters", flag: "🇯🇵" },
  { name: "Südkorea", lat: 35.9078, lng: 127.7669, status: "in_theaters", flag: "🇰🇷" },
  { name: "Hongkong", lat: 22.3193, lng: 114.1694, status: "in_theaters", flag: "🇭🇰" },
  { name: "Taiwan", lat: 23.6978, lng: 120.9605, status: "in_theaters", flag: "🇹🇼" },
  { name: "USA", lat: 39.8283, lng: -98.5795, status: "in_theaters", flag: "🇺🇸" },
  { name: "Kanada", lat: 56.1304, lng: -106.3468, status: "in_theaters", flag: "🇨🇦" },
  { name: "Australien", lat: -25.2744, lng: 133.7751, status: "in_theaters", flag: "🇦🇺" },
  { name: "Neuseeland", lat: -40.9006, lng: 174.886, status: "in_theaters", flag: "🇳🇿" },
  // SOON
  { name: "Mexiko", lat: 23.6345, lng: -102.5528, status: "soon", flag: "🇲🇽" },
  { name: "Kolumbien", lat: 4.5709, lng: -74.2973, status: "soon", flag: "🇨🇴" },
  { name: "Ecuador", lat: -1.8312, lng: -78.1834, status: "soon", flag: "🇪🇨" },
  { name: "Peru", lat: -9.19, lng: -75.0152, status: "soon", flag: "🇵🇪" },
  { name: "Bolivien", lat: -16.2902, lng: -63.5887, status: "soon", flag: "🇧🇴" },
  { name: "Chile", lat: -35.6751, lng: -71.543, status: "soon", flag: "🇨🇱" },
  { name: "Argentinien", lat: -38.4161, lng: -63.6167, status: "soon", flag: "🇦🇷" },
  { name: "Uruguay", lat: -32.5228, lng: -55.7658, status: "soon", flag: "🇺🇾" },
];

const RADIUS = 2;

/** Convert lat/lng to 3D vector on sphere */
function latLngToVector3(lat: number, lng: number, radius = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function GlobeMesh({
  onSelect,
  selected,
  hoveredId,
  setHoveredId,
  t,
}: {
  onSelect: (c: Country) => void;
  selected: Country | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  t: (key: string) => string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isInteracting = useRef(false);

  useFrame((_, delta) => {
    if (groupRef.current && !isInteracting.current && !selected) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ocean sphere */}
      <mesh>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshPhongMaterial
          color="#1e3a5f"
          emissive="#0a1929"
          emissiveIntensity={0.4}
          shininess={20}
          specular="#4a90e2"
        />
      </mesh>

      {/* Country borders from world atlas */}
      <CountryBorders />

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[RADIUS * 1.08, 64, 64]} />
        <meshBasicMaterial color="#7ab8ff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* Country markers */}
      {COUNTRIES.map((c) => {
        const pos = latLngToVector3(c.lat, c.lng, RADIUS * 1.02);
        const isHovered = hoveredId === c.name;
        const isSelected = selected?.name === c.name;
        const color = c.status === "in_theaters" ? "#22c55e" : "#f59e0b";
        const scale = isHovered || isSelected ? 1.6 : 1;

        return (
          <group key={c.name} position={pos}>
            {/* Pin base */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
                setHoveredId(c.name);
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
                setHoveredId(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(c);
              }}
              scale={scale}
            >
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered || isSelected ? 1.2 : 0.6}
              />
            </mesh>

            {/* Pulse ring for "in theaters" */}
            {c.status === "in_theaters" && <PulseRing color={color} />}


            {/* Tooltip on hover */}
            {(isHovered || isSelected) && (
              <Html distanceFactor={6} position={[0, 0.25, 0]} center style={{ pointerEvents: "none" }}>
                <div className="px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-md border border-border text-xs font-medium whitespace-nowrap shadow-lg">
                  {c.flag} {t(`umamusume.countries.${c.name}`)}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Country borders rendered from world-atlas TopoJSON */
function CountryBorders() {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        const geo: any = feature(topo, topo.objects.countries);
        setGeoData(geo);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const lineSegments = useMemo(() => {
    if (!geoData) return null;
    const r = RADIUS * 1.003;
    const positions: number[] = [];

    const addRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = latLngToVector3(ring[i][1], ring[i][0], r);
        const b = latLngToVector3(ring[i + 1][1], ring[i + 1][0], r);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    };

    for (const f of geoData.features) {
      const geom = f.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) addRing(ring);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) for (const ring of poly) addRing(ring);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [geoData]);

  if (!lineSegments) return null;

  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial color="#7ab8ff" transparent opacity={0.55} />
    </lineSegments>
  );
}

function PulseRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (clock.getElapsedTime() % 2) / 2;
      ref.current.scale.setScalar(1 + t * 3);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 * (1 - t);
    }
  });
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.05, 0.07, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function UmamusumeBeginningEraPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Country | null>(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = t("umamusume.pageTitle");
    return () => { document.title = prevTitle; };
  }, [t]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");

  const filteredCountries = useMemo(() => {
    if (filter === "all") return COUNTRIES;
    return COUNTRIES.filter((c) => c.status === filter);
  }, [filter]);

  const inTheaters = COUNTRIES.filter((c) => c.status === "in_theaters");
  const soon = COUNTRIES.filter((c) => c.status === "soon");

  return (
    <>
      {/* Fixed-height app layout only on desktop; on phones the page scrolls normally so the list clears the dock */}
      <div className="relative min-h-[100dvh] pt-16 pb-3 flex flex-col lg:h-screen lg:overflow-hidden">
        {/* Cinematic backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${umamusumeBackdrop})` }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div aria-hidden className="absolute inset-0 -z-10 backdrop-blur-[2px]" />

        {/* Hero */}
        <div className="container mx-auto px-4 mb-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center">
              <img
                src={umamusumeLogo}
                alt="Umamusume: Pretty Derby – Beginning of a New Era"
                className="w-full max-w-md lg:max-w-lg h-auto drop-shadow-[0_12px_48px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 flex-1 min-h-0">
          <div className="grid lg:grid-cols-[1fr_340px] gap-4 max-w-7xl mx-auto lg:h-full">
            {/* Globe */}
            <div className="relative h-[52vh] min-h-[320px] lg:h-full lg:min-h-0 rounded-3xl overflow-hidden border border-border bg-gradient-to-b from-[#020617] to-[#0a1929]">
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">{t("umamusume.loading")}</div>}>
                <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
                  <ambientLight intensity={0.3} />
                  <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
                  <pointLight position={[-10, -5, -10]} intensity={0.4} color="#7ab8ff" />
                  <Stars radius={50} depth={50} count={2500} factor={4} fade speed={0.5} />

                  <GlobeMesh
                    onSelect={setSelected}
                    selected={selected}
                    hoveredId={hoveredId}
                    setHoveredId={setHoveredId}
                    t={t}
                  />

                  <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minDistance={3.5}
                    maxDistance={9}
                    rotateSpeed={0.5}
                    zoomSpeed={0.6}
                    autoRotate={false}
                  />
                </Canvas>
              </Suspense>

              {/* Legend overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 justify-center pointer-events-none">
                <div className="px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  {t("umamusume.legend.inTheaters")}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  {t("umamusume.legend.soon")}
                </div>
              </div>

              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border text-xs text-muted-foreground pointer-events-none">
                {t("umamusume.hint")}
              </div>
            </div>

            {/* Sidebar list */}
            <div className="space-y-3 pr-1 lg:overflow-y-auto lg:h-full lg:min-h-0">
              {/* Filter chips */}
              <div className="flex gap-2">
                {(["all", "in_theaters", "soon"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 px-3 py-2 rounded-2xl text-xs font-medium transition-all ${
                      filter === f
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {f === "all" ? t("umamusume.filters.all") : f === "in_theaters" ? t("umamusume.filters.inTheaters") : t("umamusume.filters.soon")}
                  </button>
                ))}
              </div>

              {/* In theaters */}
              {(filter === "all" || filter === "in_theaters") && (
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    <h3 className="font-semibold text-xs">{t("umamusume.sectionInTheaters", { count: inTheaters.length })}</h3>
                  </div>
                  <div className="space-y-0.5">
                    {inTheaters.map((c) => (
                      <CountryRow
                        key={c.name}
                        country={c}
                        active={selected?.name === c.name}
                        onClick={() => setSelected(c)}
                        onHover={setHoveredId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Soon */}
              {(filter === "all" || filter === "soon") && (
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <h3 className="font-semibold text-xs">{t("umamusume.sectionSoon", { count: soon.length })}</h3>
                  </div>
                  <div className="space-y-0.5">
                    {soon.map((c) => (
                      <CountryRow
                        key={c.name}
                        country={c}
                        active={selected?.name === c.name}
                        onClick={() => setSelected(c)}
                        onHover={setHoveredId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Selected detail */}
              {selected && (
                <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{selected.flag}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{t(`umamusume.countries.${selected.name}`)}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°
                      </p>
                      <div
                        className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          selected.status === "in_theaters"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {selected.status === "in_theaters" ? t("umamusume.badgeInTheaters") : t("umamusume.badgeSoon")}
                      </div>
                      {selected.status === "soon" && (
                        <div className="mt-3">
                          <a
                            href="https://x.com/CinetopiaLatam/status/2044808041951035623"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                          >
                            {t("umamusume.moreInfo")}
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CountryRow({
  country,
  active,
  onClick,
  onHover,
}: {
  country: Country;
  active: boolean;
  onClick: () => void;
  onHover: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(country.name)}
      onMouseLeave={() => onHover(null)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
        active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/60"
      }`}
    >
      <span className="text-xl">{country.flag}</span>
      <span className="text-sm font-medium flex-1">{t(`umamusume.countries.${country.name}`)}</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          country.status === "in_theaters" ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
    </button>
  );
}
