/**
 * Badge — every variant, as a specimen sheet.
 *
 * Uppercase micro-label in solid, outline, dashed, and quiet treatments
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function BadgeSpecimens() {
  return (
    <>
      <span className="nx-badge nx-badge--solid">Close read</span>{' '}
      <span className="nx-badge nx-badge--outline">Glance</span>{' '}
      <span className="nx-badge nx-badge--dashed">Echarts</span>{' '}
      <span className="nx-badge nx-badge--quiet">64 components</span>
    </>
  );
}
