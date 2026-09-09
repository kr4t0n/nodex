import { Alert } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[18px]">
      <Alert title="Note">Sample data is generated from a seeded hash, so every reload draws the same chart.</Alert>
      <Alert title="Important" severity="important">This component fetches its geography at runtime, so it needs network access and will not render offline.</Alert>
      <Alert title="Breaking" severity="critical">Renaming a component changes its slug, which invalidates every saved add command and every link to it.</Alert>
    </div>
  );
}
