/**
 * Radio — every variant, as a specimen sheet.
 *
 * Native radio marked with a filled dot, echoing how the charts mark a chosen point
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function RadioSpecimens() {
  return (
    <>
      <div className="nx-choice-group" role="radiogroup" aria-label="Reading speed">
        <label className="nx-choice">
          <input className="nx-radio" type="radio" name="nx-density" defaultChecked />{' '}
          Close read
        </label>{' '}

        <label className="nx-choice">
          <input className="nx-radio" type="radio" name="nx-density" />{' '}
          Glance
        </label>{' '}

        <label className="nx-choice nx-choice--disabled">
          <input className="nx-radio" type="radio" name="nx-density" disabled />{' '}
          Either
        </label>
      </div>
    </>
  );
}
