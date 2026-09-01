/**
 * Select — every variant, as a specimen sheet.
 *
 * Native select with a hairline chevron and a fully styled dropdown where the browser supports it
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function SelectSpecimens() {
  return (
    <>
      {/* Two rows rather than one: a labelled field is taller than a bare control, so side by side they sit at different heights. Layout here is inline because it belongs to the demo, not to the primitive. */}{' '}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
        <div className="nx-field">
          <label className="nx-field__label" htmlFor="nx-type">Component type</label>{' '}
          <select className="nx-select" id="nx-type">
            <option>All types</option>{' '}
            <option>bar</option>{' '}
            <option>heatmap</option>{' '}
            <option>lollipop</option>{' '}
            <option>sankey</option>
          </select>
        </div>{' '}

        <select className="nx-select nx-select--auto" aria-label="Reading speed">
          <option>Close read</option>{' '}
          <option>Glance</option>
        </select>
      </div>
    </>
  );
}
