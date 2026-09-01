/**
 * Table — every variant, as a specimen sheet.
 *
 * Hairline rules between rows, tabular numerals, emphasis by weight rather than fill
 *
 * This is not a component API. A primitive's artifact is its stylesheet, and
 * this file records which classes produce which variant so you can copy the one
 * you need. Apply the classes to your own element, or to a headless Radix or
 * Ark component when you need real keyboard and ARIA behaviour — that is what
 * keeps the presentational rule intact for controls this file cannot implement.
 */
export function TableSpecimens() {
  return (
    <>
      <table className="nx-table">
        <caption>Revenue by plan, Q2</caption>{' '}
        <thead>
          <tr>
            <th scope="col">Plan</th>{' '}
            <th scope="col">Accounts</th>{' '}
            <th scope="col" className="nx-num">MRR</th>
          </tr>
        </thead>{' '}
        <tbody>
          <tr>
            <td>Starter</td>{' '}
            <td className="nx-cell--quiet">1,284</td>{' '}
            <td className="nx-num">182.4</td>
          </tr>{' '}
          <tr>
            <td>Pro</td>{' '}
            <td className="nx-cell--quiet">612</td>{' '}
            <td className="nx-num">486.1</td>
          </tr>{' '}
          <tr>
            <td>Team</td>{' '}
            <td className="nx-cell--quiet">207</td>{' '}
            <td className="nx-num">391.7</td>
          </tr>{' '}
          <tr className="nx-row--strong">
            <td>Total</td>{' '}
            <td className="nx-cell--quiet">2,103</td>{' '}
            <td className="nx-num">1,060.2</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
