/**
 * Input — every variant, as a specimen sheet.
 *
 * Text field with label above, helper below, and an invalid state. Never placeholder-as-label
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function InputSpecimens() {
  return (
    <>
      <div className="nx-field">
        <label className="nx-field__label" htmlFor="nx-search">Search components</label>{' '}
        <input className="nx-input" id="nx-search" type="search" placeholder="lollipop, heatmap, sankey" />{' '}
        <p className="nx-field__help">Matches titles, types, and tags.</p>
      </div>{' '}

      <div className="nx-field" data-invalid="true">
        <label className="nx-field__label" htmlFor="nx-slug">Component slug</label>{' '}
        <input className="nx-input" id="nx-slug" type="text" defaultValue="Matrix Heat" />{' '}
        <p className="nx-field__error">Slugs are lowercase and hyphenated.</p>
      </div>
    </>
  );
}
