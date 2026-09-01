/**
 * Switch — every variant, as a specimen sheet.
 *
 * A checkbox with role=switch, for settings that take effect immediately rather than on submit
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function SwitchSpecimens() {
  return (
    <>
      <div className="nx-choice-group" style={{ maxWidth: '280px' }}>
        <label className="nx-choice nx-choice--spread">
          Draw on scroll{' '}
          <input className="nx-switch" type="checkbox" role="switch" defaultChecked />
        </label>{' '}

        <label className="nx-choice nx-choice--spread">
          Replay on click{' '}
          <input className="nx-switch" type="checkbox" role="switch" defaultChecked />
        </label>{' '}

        <label className="nx-choice nx-choice--spread">
          Show gridlines{' '}
          <input className="nx-switch" type="checkbox" role="switch" />
        </label>{' '}

        <label className="nx-choice nx-choice--spread nx-choice--disabled">
          Loop animation{' '}
          <input className="nx-switch" type="checkbox" role="switch" disabled />
        </label>
      </div>
    </>
  );
}
