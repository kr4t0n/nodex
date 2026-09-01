/**
 * Button — every variant, as a specimen sheet.
 *
 * Solid, outline, and quiet variants with hover, pressed, focus, and disabled states
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function ButtonSpecimens() {
  return (
    <>
      <button className="nx-btn nx-btn--solid" type="button">Add component</button>{' '}
      <button className="nx-btn nx-btn--outline" type="button">Close read</button>{' '}
      <button className="nx-btn nx-btn--outline" type="button" aria-pressed="true">Glance</button>{' '}
      <button className="nx-btn nx-btn--quiet" type="button">Clear filters</button>{' '}
      <button className="nx-btn nx-btn--solid" type="button" disabled>Unavailable</button>
    </>
  );
}
