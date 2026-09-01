/**
 * Empty state — every variant, as a specimen sheet.
 *
 * A dashed boundary marking something provisional, with a hint that says how to fill it
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function EmptyStateSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '440px' }}>
        <div className="nx-empty">
          <p className="nx-empty__title">Nothing matches</p>{' '}
          <p className="nx-empty__hint">
            Try a broader search, or clear the filters to see the whole language.
          </p>
        </div>{' '}

        <div className="nx-empty nx-empty--quiet">
          <p className="nx-empty__title">No primitives yet</p>{' '}
          <p className="nx-empty__hint">
            This language has tokens and charts but no shared controls. Run{' '}
            nodex new-language to scaffold them.
          </p>
        </div>
      </div>
    </>
  );
}
