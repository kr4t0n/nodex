/**
 * Avatar — every variant, as a specimen sheet.
 *
 * Image or initials in circle and square shapes, with tones drawn from the grey ramp and a stacked group
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function AvatarSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="nx-avatar nx-avatar--sm nx-avatar--tone-1">RH</span>{' '}
          <span className="nx-avatar nx-avatar--tone-2">MK</span>{' '}
          <span className="nx-avatar nx-avatar--tone-3">TA</span>{' '}
          <span className="nx-avatar nx-avatar--lg nx-avatar--tone-4">JL</span>
        </div>{' '}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="nx-avatar nx-avatar--square nx-avatar--tone-2">PL</span>{' '}
          <span className="nx-avatar nx-avatar--outline">DS</span>
        </div>{' '}

        <div className="nx-avatar-group">
          <span className="nx-avatar nx-avatar--tone-4">JL</span>{' '}
          <span className="nx-avatar nx-avatar--tone-3">TA</span>{' '}
          <span className="nx-avatar nx-avatar--tone-2">MK</span>{' '}
          <span className="nx-avatar nx-avatar--tone-1">RH</span>{' '}
          <span className="nx-avatar nx-avatar--count">+7</span>
        </div>
      </div>
    </>
  );
}
