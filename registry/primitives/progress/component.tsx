/**
 * Progress — every variant, as a specimen sheet.
 *
 * A rule that fills rather than a container that drains, with a static dashed indeterminate state
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function ProgressSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '320px' }}>
        <div className="nx-progress-field">
          <div className="nx-progress-label">
            <span>Quarter target</span>{' '}
            <span>68%</span>
          </div>{' '}
          <progress className="nx-progress" max="100" value="68"></progress>
        </div>{' '}

        <div className="nx-progress-field">
          <div className="nx-progress-label">
            <span>Last quarter</span>{' '}
            <span>41%</span>
          </div>{' '}
          <progress className="nx-progress nx-progress--quiet" max="100" value="41"></progress>
        </div>{' '}

        <div className="nx-progress-field">
          <div className="nx-progress-label">
            <span>Migration</span>{' '}
            <span>82%</span>
          </div>{' '}
          <progress className="nx-progress nx-progress--thick" max="100" value="82"></progress>
        </div>{' '}

        <div className="nx-progress-field">
          <div className="nx-progress-label">
            <span>Indexing</span>{' '}
            <span>Unknown</span>
          </div>{' '}
          <progress className="nx-progress"></progress>
        </div>
      </div>
    </>
  );
}
