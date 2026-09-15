type GeoCoordinate = readonly number[];
type GeoRing = readonly GeoCoordinate[];
type GeoPolygon = readonly GeoRing[];
export interface GeoFeature {
  properties: { name: string };
  geometry: { type: string; coordinates: GeoPolygon | readonly GeoPolygon[] };
}
export interface GeoCollection { features: readonly GeoFeature[] }
export interface GeoPoint { x: number; y: number }
export interface GeoBounds { left: number; right: number; bottom: number; top: number }
export interface GeoRegion { name: string; rings: GeoPoint[][]; center: GeoPoint; bounds: GeoBounds }
export interface GeoInset { left: number; top: number; width: number }

function bounds(points: readonly GeoPoint[]): GeoBounds {
  return points.reduce((box, point) => ({ left: Math.min(box.left, point.x), right: Math.max(box.right, point.x), bottom: Math.min(box.bottom, point.y), top: Math.max(box.top, point.y) }), { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
}
function centroid(points: readonly GeoPoint[]): GeoPoint {
  let twiceArea = 0; let x = 0; let y = 0;
  for (let i = 0; i < points.length; i++) { const a = points[i]!; const b = points[(i + 1) % points.length]!; const cross = a.x * b.y - b.x * a.y; twiceArea += cross; x += (a.x + b.x) * cross; y += (a.y + b.y) * cross; }
  return twiceArea ? { x: x / (twiceArea * 3), y: y / (twiceArea * 3) } : points[0] ?? { x: 0, y: 0 };
}

/** Keep the original outlines, point-count label centers and rectangular inset transforms. */
export function geographicRegions(collection: GeoCollection, insets: Readonly<Record<string, GeoInset>> = {}): GeoRegion[] {
  return collection.features.map(feature => {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates as GeoPolygon] : feature.geometry.coordinates as readonly GeoPolygon[];
    const exteriors = polygons.map(polygon => polygon[0] ?? []);
    let rings = polygons.flatMap(polygon => polygon.map(ring => ring.map(point => ({ x: point[0]!, y: point[1]! }))));
    let box = bounds(rings.flat()); const inset = insets[feature.properties.name];
    const longest = exteriors.reduce<GeoRing>((previous, ring) => ring.length > previous.length ? ring : previous, []);
    let center = centroid(longest.map(point => ({ x: point[0]!, y: point[1]! })));
    if (inset) {
      const ratio = inset.width / (box.right - box.left); const height = (box.top - box.bottom) * ratio;
      rings = rings.map(ring => ring.map(point => ({ x: inset.left + (point.x - box.left) * ratio, y: inset.top + (point.y - box.bottom) * ratio })));
      box = { left: inset.left, right: inset.left + inset.width, bottom: inset.top, top: inset.top + height };
      center = { x: (box.left + box.right) / 2, y: (box.bottom + box.top) / 2 };
    }
    return { name: feature.properties.name, rings, center, bounds: box };
  });
}
export function geographyBounds(regions: readonly GeoRegion[]): GeoBounds {
  return bounds(regions.flatMap(region => [{ x: region.bounds.left, y: region.bounds.bottom }, { x: region.bounds.right, y: region.bounds.top }]));
}

/** The original top/bottom anchors determine map height; horizontal overflow stays clipped. */
export function geographicDomains(box: GeoBounds, width: number, height: number): { x: [number, number]; y: [number, number] } {
  const spanX = box.right - box.left; const spanY = box.top - box.bottom; const aspect = spanX / spanY * 0.75;
  const fittedWidth = height * aspect; const fittedHeight = height;
  const halfX = spanX / 2 * width / Math.max(1, fittedWidth); const halfY = spanY / 2 * height / Math.max(1, fittedHeight);
  const centerX = (box.left + box.right) / 2; const centerY = (box.bottom + box.top) / 2;
  return { x: [centerX - halfX, centerX + halfX], y: [centerY - halfY, centerY + halfY] };
}
