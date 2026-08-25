import { LanguageView } from '@/components/LanguageView.tsx';
import { languageSlugs } from '@/lib/manifest.server.ts';

/** Routes come from the manifest, so the registry stays the single source of
    truth for what exists and every page prerenders at build time. */
export async function generateStaticParams() {
  return (await languageSlugs()).map((slug) => ({ slug }));
}

/**
 * Params are awaited here and handed down as plain props, so the view never
 * needs a routing hook. That keeps the views testable and portable.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <LanguageView slug={slug} />;
}
