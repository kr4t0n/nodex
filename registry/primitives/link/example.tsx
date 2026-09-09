import { Link } from './component';

export function Example() {
  return (
    <div className="flex max-w-[44ch] flex-col gap-3 text-[12.5px] leading-[1.7]">
      <p className="m-0">Every hairline is a day. Read the <Link href="#">field rather than the numbers</Link>, because the season has a texture before it has a value.</p>
      <p className="m-0">Sourced from the <Link href="#" variant="strong">deploy log</Link>, with <Link href="#" rel="noreferrer" external>methodology</Link> published separately.</p>
      <p className="m-0 text-[var(--nx-muted)]"><Link href="#" variant="quiet">Live ops</Link>{' '}<span className="opacity-50">&nbsp;/&nbsp;</span>{' '}<Link href="#" variant="quiet">Product analytics</Link></p>
    </div>
  );
}
