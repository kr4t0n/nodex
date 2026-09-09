import { Code, CodeBlock, Command, Kbd } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-4">
      <p className="m-0 text-[12.5px] leading-[1.7]">Reference tokens as <Code>var(--nx-ink)</Code>, never a hex value. Press <Kbd>/</Kbd> to search.</p>
      <Command>nodex add mono-editorial/hairline-line</Command>
      <CodeBlock>{'export function Report({ observations }) {\n  return <HairlineLine data={observations} />;\n}'}</CodeBlock>
    </div>
  );
}
