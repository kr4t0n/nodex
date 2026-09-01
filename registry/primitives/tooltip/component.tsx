/**
 * Tooltip — every variant, as a specimen sheet.
 *
 * CSS-only label on hover and focus. Not announced by assistive technology, so pair it with a headless tooltip when the text matters
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function TooltipSpecimens() {
  return (
    <>
      {/* Padded so an upward tooltip has somewhere to go. Inside a preview frame nothing can escape the iframe, whatever the CSS does. */}{' '}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', alignItems: 'flex-start', paddingTop: '34px', fontSize: '12.5px', lineHeight: '1.7' }}>
        <p style={{ margin: '0', maxWidth: '40ch' }}>
          Charts are tagged{' '}
          <span className="nx-tooltip" data-tooltip="One mark per record. Rewards study.">
            <span className="nx-tooltip__trigger" tabIndex={0}>close read</span>
          </span>{' '}
          or glance, depending on how they are meant to be read.
        </p>{' '}

        <span className="nx-tooltip nx-tooltip--below nx-tooltip--wrap" data-tooltip="Sub-pixel strokes are the strongest signature in this language. Anything above the line maximum reads as a different product.">
          <span className="nx-tooltip__trigger" tabIndex={0}>Why 0.8px?</span>
        </span>{' '}

        <span className="nx-tooltip nx-tooltip--start" data-tooltip="Copied to clipboard">
          <span className="nx-tooltip__trigger" tabIndex={0}>Copy command</span>
        </span>
      </div>
    </>
  );
}
