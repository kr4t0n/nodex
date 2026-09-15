'use client';

import { useId } from 'react';
import { Radio, RadioGroup } from './component';

export function Example() {
  const name = useId();
  return (
    <RadioGroup aria-label="Reading speed">
      <Radio label="Close read" name={name} value="close-read" defaultChecked />
      <Radio label="Glance" name={name} value="glance" />
      <Radio label="Either" name={name} value="either" disabled />
    </RadioGroup>
  );
}
