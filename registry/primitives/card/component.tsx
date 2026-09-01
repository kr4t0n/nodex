/**
 * Card — every variant, as a specimen sheet.
 *
 * Container with the fixed title, sub, body, and caption anatomy, plus an inverted variant
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function CardSpecimens() {
  return (
    <>
      <div className="nx-card">
        <h3 className="nx-card__title">Ninety days as a barcode</h3>{' '}
        <p className="nx-card__sub">peak concurrent users, daily</p>{' '}
        <div className="nx-card__body">Body content sits here.</div>{' '}
        <div className="nx-card__caption">LOLLIPOP · CLOSE READ</div>
      </div>{' '}

      <div className="nx-card nx-card--invert">
        <h3 className="nx-card__title">What breaks, stacked and ranked</h3>{' '}
        <p className="nx-card__sub">incidents by root cause</p>{' '}
        <div className="nx-card__caption">DOT PLOT · CLOSE READ</div>
      </div>
    </>
  );
}
