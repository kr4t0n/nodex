/**
 * Stat — every variant, as a specimen sheet.
 *
 * A measured figure with its label and direction of change, carried by a drawn mark rather than by colour
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function StatSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', width: '100%' }}>
        <div className="nx-stat-group nx-stat-group--ruled">
          <div className="nx-stat">
            <span className="nx-stat__label">Peak concurrent</span>{' '}
            <span className="nx-stat__value">208<span className="nx-stat__unit">k</span></span>{' '}
            <span className="nx-stat__delta nx-stat__delta--up nx-stat__delta--strong">
              4.2% on last quarter
            </span>
          </div>{' '}

          <div className="nx-stat">
            <span className="nx-stat__label">Median reply</span>{' '}
            <span className="nx-stat__value">1.9<span className="nx-stat__unit">h</span></span>{' '}
            <span className="nx-stat__delta nx-stat__delta--down">18 min faster</span>
          </div>{' '}

          <div className="nx-stat">
            <span className="nx-stat__label">Deploys</span>{' '}
            <span className="nx-stat__value">312</span>{' '}
            <span className="nx-stat__delta nx-stat__delta--flat">unchanged</span>
          </div>
        </div>{' '}

        <div className="nx-stat nx-stat--lg">
          <span className="nx-stat__label">Quarter to date</span>{' '}
          <span className="nx-stat__value">$1,060<span className="nx-stat__unit">k</span></span>{' '}
          <span className="nx-stat__note">Across 2,103 paying accounts on four plans.</span>
        </div>
      </div>
    </>
  );
}
