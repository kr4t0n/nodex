/**
 * Code — every variant, as a specimen sheet.
 *
 * Inline code, keyboard keys, code blocks, and a runnable command row
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function CodeSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '460px' }}>
        <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.7' }}>
          Reference tokens as <code className="nx-code">var(--nx-ink)</code>, never a hex{' '}
          value. Press <kbd className="nx-kbd">/</kbd> to search.
        </p>{' '}

        <div className="nx-command">nodex add mono-editorial/barcode-lollipop</div>{' '}

        <pre className="nx-pre"><code className="nx-code">{`export function mount(root) {
  const q = (name) =>
    root.querySelector(\`[data-nx-mount="\${name}"]\`);
}`}</code></pre>
      </div>
    </>
  );
}
