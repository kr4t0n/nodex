/**
 * Prose — every variant, as a specimen sheet.
 *
 * One class that styles authored long-form text: headings, lists, quotes, tables, and code
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function ProseSpecimens() {
  return (
    <>
      <div className="nx-prose">
        <h2>Motion philosophy</h2>{' '}
        <p>{' '}
          One rule: <strong>marks draw themselves when they scroll into view, and{' '}
          clicking replays.</strong> Nothing animates on a loop, and nothing animates{' '}
          on hover except the native tooltip.
        </p>{' '}
        <p>{' '}
          Implemented as an <code>IntersectionObserver</code> that disconnects after{' '}
          firing once. Stagger delays are computed per index, so a field of marks{' '}
          arrives as a wave rather than all at once.
        </p>{' '}
        <blockquote>
          Read the field, not the numbers. The season has a texture before it has a{' '}
          value.
        </blockquote>{' '}
        <h3>Anti-patterns</h3>{' '}
        <ul>
          <li>Never exceed the line maximum on a stroke that reads as a line.</li>{' '}
          <li>Never introduce a hue. No accent, no semantic red or green.</li>{' '}
          <li>Never aggregate in close-read mode. One mark per record, always.</li>
        </ul>
      </div>
    </>
  );
}
