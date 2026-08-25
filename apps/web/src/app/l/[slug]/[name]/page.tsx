import { ComponentView } from '@/components/ComponentView.tsx';
import { componentParams } from '@/lib/manifest.server.ts';

export async function generateStaticParams() {
  return componentParams();
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; name: string }>;
}) {
  const { slug, name } = await params;
  return <ComponentView slug={slug} name={name} />;
}
