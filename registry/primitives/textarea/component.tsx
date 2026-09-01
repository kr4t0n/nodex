/**
 * Textarea — every variant, as a specimen sheet.
 *
 * Multi-line field with vertical-only resize, a monospace variant, and content sizing where supported
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function TextareaSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '380px' }}>
        <div className="nx-field">
          <label className="nx-field__label" htmlFor="nx-sub">Subtitle</label>{' '}
          <textarea className="nx-textarea" id="nx-sub" rows={3} defaultValue={`one tick = one respondent in a hundred · inked = picked it`} />{' '}
          <div className="nx-field__foot">
            <span>Say what one mark represents.</span>{' '}
            <span className="nx-field__count">58 / 120</span>
          </div>
        </div>{' '}

        <div className="nx-field">
          <label className="nx-field__label" htmlFor="nx-opt">Chart options</label>{' '}
          <textarea className="nx-textarea nx-textarea--mono nx-textarea--auto" id="nx-opt" rows={3} defaultValue={`{ lineStyle: { width: 0.8 } }`} />{' '}
          <p className="nx-field__help">Grows with its content where supported.</p>
        </div>
      </div>
    </>
  );
}
