/**
 * Checkbox — every variant, as a specimen sheet.
 *
 * Native checkbox with a border-drawn tick, plus indeterminate and disabled states
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function CheckboxSpecimens() {
  return (
    <div className="nx-choice-group">
      <label className="nx-choice">
        <input className="nx-checkbox" type="checkbox" defaultChecked />
        Hand-rolled SVG
      </label>

      <label className="nx-choice">
        <input className="nx-checkbox" type="checkbox" />
        ECharts
      </label>

      <label className="nx-choice">
        {/* Indeterminate is a DOM property with no markup attribute behind it.
            The ref is the real mechanism and is what a browser reports to
            assistive technology; the attribute exists so the state survives
            server rendering, where a ref never runs and the checkbox would
            otherwise render as plainly unchecked. The stylesheet matches both. */}
        <input
          className="nx-checkbox"
          type="checkbox"
          data-indeterminate="true"
          ref={(el) => {
            if (el) el.indeterminate = true;
          }}
        />
        All runtimes
      </label>

      <label className="nx-choice nx-choice--disabled">
        <input className="nx-checkbox" type="checkbox" disabled />
        Chart.js, removed
      </label>
    </div>
  );
}
