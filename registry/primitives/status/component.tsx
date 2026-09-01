/**
 * Status — every variant, as a specimen sheet.
 *
 * Inline state where the label carries the meaning, since there is no hue for failure and no loop for waiting
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function StatusSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start', width: '100%' }}>
        <span className="nx-status nx-status--idle">
          <span className="nx-status__mark"></span>{' '}
          Waiting for input
        </span>{' '}

        <span className="nx-status nx-status--working">
          <span className="nx-status__mark"></span>{' '}
          Building registry{' '}
          <span className="nx-status__meta">80 items</span>
        </span>{' '}

        <span className="nx-status nx-status--done">
          <span className="nx-status__mark"></span>{' '}
          Extraction verified{' '}
          <span className="nx-status__meta">62 of 64</span>
        </span>{' '}

        <span className="nx-status nx-status--failed">
          <span className="nx-status__mark"></span>{' '}
          Two components need network
        </span>{' '}

        <div className="nx-status-block nx-status-block--inline" role="status">
          Loading registry
        </div>
      </div>
    </>
  );
}
