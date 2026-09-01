/**
 * Details — every variant, as a specimen sheet.
 *
 * Disclosure built on native details and summary, separated by rules rather than boxed
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function DetailsSpecimens() {
  return (
    <>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <details className="nx-details" open>
          <summary className="nx-details__summary">
            What does close read mean?{' '}
            <span className="nx-details__meta">Density</span>
          </summary>{' '}
          <div className="nx-details__body">
            A close-read chart draws one mark per record and rewards study. If ninety{' '}
            days are being shown, ninety marks are drawn. Use it for reports, not for{' '}
            dashboards.
          </div>
        </details>{' '}

        <details className="nx-details">
          <summary className="nx-details__summary">
            Why are the strokes so thin?{' '}
            <span className="nx-details__meta">Tokens</span>
          </summary>{' '}
          <div className="nx-details__body">
            Sub-pixel hairlines are the strongest signature in the language. A two{' '}
            pixel line reads as a different product entirely.
          </div>
        </details>{' '}

        <details className="nx-details">
          <summary className="nx-details__summary">Can I edit what I add?</summary>{' '}
          <div className="nx-details__body">
            Yes. Added components are copies you own. Nothing updates them and there{' '}
            is no version to upgrade.
          </div>
        </details>
      </div>
    </>
  );
}
