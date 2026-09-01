/**
 * Link — every variant, as a specimen sheet.
 *
 * Hairline underline offset clear of descenders, with quiet, strong, and external treatments
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function LinkSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', lineHeight: '1.7', maxWidth: '44ch' }}>
        <p style={{ margin: '0' }}>
          Every hairline is a day. Read the{' '}
          <a className="nx-link" href="#">field rather than the numbers</a>, because the{' '}
          season has a texture before it has a value.
        </p>{' '}

        <p style={{ margin: '0' }}>
          Sourced from the{' '}
          <a className="nx-link nx-link--strong" href="#">deploy log</a>, with{' '}
          <a className="nx-link nx-link--external" href="#" rel="noreferrer">methodology</a>{' '}
          published separately.
        </p>{' '}

        <p style={{ margin: '0', color: 'var(--nx-muted)' }}>
          <a className="nx-link nx-link--quiet" href="#">Live ops</a>{' '}
          <span style={{ opacity: '0.5' }}>&nbsp;/&nbsp;</span>{' '}
          <a className="nx-link nx-link--quiet" href="#">Product analytics</a>
        </p>
      </div>
    </>
  );
}
