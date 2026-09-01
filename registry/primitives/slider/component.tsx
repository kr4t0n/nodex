import type { CSSProperties } from 'react';

/**
 * Slider — every variant, as a specimen sheet.
 *
 * Single-value range on a hairline track with a filled or hollow thumb, plus optional ticks
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function SliderSpecimens() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', maxWidth: '320px' }}>
        <div className="nx-slider-field">
          <div className="nx-slider-value">
            <span>Stroke width</span>{' '}
            <span>0.8px</span>
          </div>{' '}
          <input className="nx-slider" type="range" min="0" max="100" defaultValue="42" aria-label="Stroke width" />
        </div>{' '}

        <div className="nx-slider-field">
          <div className="nx-slider-value">
            <span>Sample size</span>{' '}
            <span>90 days</span>
          </div>{' '}
          <input className="nx-slider nx-slider--hollow" type="range" min="0" max="100" defaultValue="72" aria-label="Sample size" />{' '}
          <div className="nx-slider-ticks" style={{ '--nx-slider-steps': '12' } as CSSProperties}></div>
        </div>{' '}

        <div className="nx-slider-field">
          <div className="nx-slider-value">
            <span>Unavailable</span>{' '}
            <span>--</span>
          </div>{' '}
          <input className="nx-slider" type="range" min="0" max="100" defaultValue="25" disabled aria-label="Unavailable" />
        </div>
      </div>
    </>
  );
}
