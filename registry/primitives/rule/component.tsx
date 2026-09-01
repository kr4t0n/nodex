/**
 * Rule — every variant, as a specimen sheet.
 *
 * Hairline separator in strong, faint, dashed, vertical, and inset treatments
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function RuleSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '420px' }}>
        <hr className="nx-rule" />{' '}
        <hr className="nx-rule nx-rule--strong" />{' '}
        <hr className="nx-rule nx-rule--faint" />{' '}
        <hr className="nx-rule nx-rule--dashed" />{' '}

        <div style={{ display: 'flex', alignItems: 'center', height: '26px' }}>
          <span>Close read</span>{' '}
          <hr className="nx-rule nx-rule--vertical" />{' '}
          <span>Glance</span>{' '}
          <hr className="nx-rule nx-rule--vertical" />{' '}
          <span>All types</span>
        </div>
      </div>
    </>
  );
}
