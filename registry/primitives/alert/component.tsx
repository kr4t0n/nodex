/**
 * Alert — every variant, as a specimen sheet.
 *
 * Severity carried by rule weight rather than by hue, for a language with no accent colour
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function AlertSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '440px' }}>
        <div className="nx-alert nx-alert--note">
          <p className="nx-alert__title">Note</p>{' '}
          <p className="nx-alert__body">
            Sample data is generated from a seeded hash, so every reload draws the{' '}
            same chart.
          </p>
        </div>{' '}

        <div className="nx-alert nx-alert--important">
          <p className="nx-alert__title">Important</p>{' '}
          <p className="nx-alert__body">
            This component fetches its geography at runtime, so it needs network{' '}
            access and will not render offline.
          </p>
        </div>{' '}

        <div className="nx-alert nx-alert--critical">
          <p className="nx-alert__title">Breaking</p>{' '}
          <p className="nx-alert__body">
            Renaming a component changes its slug, which invalidates every saved add{' '}
            command and every link to it.
          </p>
        </div>
      </div>
    </>
  );
}
