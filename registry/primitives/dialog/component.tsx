/**
 * Dialog — every variant, as a specimen sheet.
 *
 * Native dialog with a mixed-ink backdrop, since a language with no elevation model cannot lift a panel with a shadow
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function DialogSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '440px' }}>
        {/* Rendered open and in flow so the styling is visible here. In use, omit `open` and `nx-dialog--inline`, then call el.showModal() to get the top layer, the focus trap, and the backdrop. */}{' '}
        <dialog className="nx-dialog nx-dialog--inline" open>
          <div className="nx-dialog__body">
            <h2 className="nx-dialog__title">Replace this component?</h2>{' '}
            <p className="nx-dialog__sub">
              You have edited this file since adding it. Fetching it again overwrites{' '}
              your changes, and nodex keeps no copy of them.
            </p>
          </div>{' '}
          <div className="nx-dialog__actions">
            <button className="nx-dialog__action" type="button">Keep mine</button>{' '}
            <button className="nx-dialog__action nx-dialog__action--confirm" type="button">
              Overwrite
            </button>
          </div>
        </dialog>
      </div>
    </>
  );
}
