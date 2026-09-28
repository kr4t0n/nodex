import assert from 'node:assert/strict';

import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const PRIMITIVE_SLUGS = [
  'alert', 'avatar', 'badge', 'button', 'card', 'checkbox', 'code', 'details',
  'dialog', 'empty-state', 'input', 'link', 'progress', 'prose', 'radio', 'rule',
  'select', 'slider', 'stat', 'status', 'switch', 'table', 'textarea', 'tooltip',
] as const;

// Application-owned fixtures exercise the delivered APIs without importing
// registry examples, making the smoke test a real consumer of their contract.
export const PRIMITIVE_CONSUMER_SOURCE = String.raw`import { useState } from 'react';
import { Alert } from './components/nodex/alert/component';
import { Avatar, AvatarGroup } from './components/nodex/avatar/component';
import { Badge } from './components/nodex/badge/component';
import { Button } from './components/nodex/button/component';
import { Card, CardTitle, CardSubtitle, CardBody, CardCaption } from './components/nodex/card/component';
import { Checkbox, CheckboxGroup } from './components/nodex/checkbox/component';
import { Code, CodeBlock, Kbd } from './components/nodex/code/component';
import { Details } from './components/nodex/details/component';
import { Dialog, DialogAction } from './components/nodex/dialog/component';
import { EmptyState } from './components/nodex/empty-state/component';
import { Input } from './components/nodex/input/component';
import { Link } from './components/nodex/link/component';
import { Progress } from './components/nodex/progress/component';
import { Prose } from './components/nodex/prose/component';
import { Radio, RadioGroup } from './components/nodex/radio/component';
import { Rule } from './components/nodex/rule/component';
import { Select } from './components/nodex/select/component';
import { Slider } from './components/nodex/slider/component';
import { Stat, StatGroup } from './components/nodex/stat/component';
import { Status } from './components/nodex/status/component';
import { Switch } from './components/nodex/switch/component';
import { Table, TableCaption, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/nodex/table/component';
import { Textarea } from './components/nodex/textarea/component';
import { Tooltip, TooltipTrigger } from './components/nodex/tooltip/component';

function PrimitiveScope({ id }: { id: string }) {
  const [submitted, setSubmitted] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  return <section id={id} data-primitive-scope className="flex min-w-0 flex-col gap-5 p-4">
    <form data-primitive-form className="flex flex-col gap-4" onSubmit={(event) => {
      event.preventDefault();
      setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
    }}>
      <Card data-primitive="card"><CardTitle>Saved reports</CardTitle><CardSubtitle>Reports owned by this application.</CardSubtitle><CardBody>Choose a window and delivery settings.</CardBody><CardCaption>Updated after submission</CardCaption></Card>
      <Alert data-primitive="alert" title="Local fixture" severity="important">Settings remain inside this test application.</Alert>
      <AvatarGroup data-primitive="avatar" aria-label="Report owners"><Avatar name="Lee Rivera" shape="square" /><Avatar name="Jo Patel" size="sm" /></AvatarGroup>
      <div data-primitive="badge"><Badge variant="solid">Ready</Badge></div>
      <div data-primitive="input"><Input name="title" label="Report title" help="A title chosen by the caller." defaultValue="Weekly report" required /></div>
      <div data-primitive="textarea"><Textarea name="notes" label="Notes" help="Plain text notes." defaultValue="Initial note" /></div>
      <div data-primitive="select"><Select name="window" label="Reporting window" defaultValue="week"><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option></Select><Select label="Compact window" autoWidth defaultValue="week"><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option></Select></div>
      <CheckboxGroup data-primitive="checkbox"><Checkbox name="includeArchived" label="Include archived reports" /><Checkbox label="Unavailable setting" disabled /></CheckboxGroup>
      <RadioGroup data-primitive="radio" aria-label="Report format"><Radio name="format" value="csv" label="CSV" defaultChecked /><Radio name="format" value="json" label="JSON" /></RadioGroup>
      <div data-primitive="switch"><Switch name="notify" label="Notify after export" /></div>
      <div data-primitive="slider"><Slider name="limit" label="Row limit" min={0} max={100} step={5} defaultValue={50} valueLabel="Rows" ticks={5} /></div>
      <div data-primitive="progress"><Progress label="Export progress" value={35} /></div>
      <div data-primitive="button"><Button type="submit" data-submit>Save settings</Button><Button disabled>Unavailable action</Button><Button variant="outline" aria-pressed="true" data-selected-action>Selected filter</Button></div>
    </form>
    <p data-form-result>{submitted}</p>
    <div data-primitive="code"><Code>report_id</Code> <Kbd>Enter</Kbd><CodeBlock>{'select report_id;\n'}</CodeBlock></div>
    <Details data-primitive="details" summary="Delivery details" meta="Local">The browser owns this disclosure.</Details>
    <div data-primitive="dialog"><Button data-open-dialog onClick={() => setDialogOpen(true)}>Review settings</Button><Dialog title="Review settings" description="This modal uses the native dialog behavior." open={dialogOpen} onOpenChange={setDialogOpen} actions={<DialogAction onClick={() => setDialogOpen(false)}>Close review</DialogAction>}><Input label="Reviewer note" defaultValue="Ready" /></Dialog></div>
    <EmptyState data-primitive="empty-state" title="No scheduled reports" hint="A report can be scheduled after review." />
    <div data-primitive="link"><Link href={'#' + id} external>Return to settings</Link></div>
    <Prose data-primitive="prose"><h2>Delivery notes</h2><p>Reports use the selected <strong>window</strong> and format.</p><p><code>report_id</code> remains stable.</p></Prose>
    <div data-primitive="rule"><Rule inset /></div>
    <StatGroup data-primitive="stat"><Stat label="Queued reports" value={12} unit="jobs" note="Updated locally" delta={{ direction: 'up', label: '+2' }} /></StatGroup>
    <div data-primitive="status"><Status state="done" meta="Local">Settings available</Status></div>
    <Table data-primitive="table"><TableCaption>Saved windows</TableCaption><TableHeader><TableRow><TableHead>Window</TableHead><TableHead numeric>Reports</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Week</TableCell><TableCell numeric>12</TableCell></TableRow></TableBody></Table>
    <div data-primitive="tooltip"><Tooltip label="Already explained in the nearby text"><TooltipTrigger>Additional hint</TooltipTrigger></Tooltip></div>
  </section>;
}

export function PrimitiveConsumer() {
  return <section aria-label="Installed primitive contract" className="flex flex-col gap-8">
    <div data-primitive-language="mono-editorial" className="grid grid-cols-2"><PrimitiveScope id="primitives-mono-editorial-original" /><PrimitiveScope id="primitives-mono-editorial-edited" /></div>
    <div data-primitive-language="signal-console" data-signal className="grid grid-cols-2"><PrimitiveScope id="primitives-signal-console-original" /><PrimitiveScope id="primitives-signal-console-edited" /></div>
    <div data-primitive-language="neo-brutalism" data-neo className="grid grid-cols-2"><PrimitiveScope id="primitives-neo-brutalism-original" /><PrimitiveScope id="primitives-neo-brutalism-edited" /></div>
    <div data-primitive-language="sketchbook" data-sketchbook className="grid grid-cols-2"><PrimitiveScope id="primitives-sketchbook-original" /><PrimitiveScope id="primitives-sketchbook-edited" /></div>
    <div data-primitive-language="soft-studio" data-studio className="grid grid-cols-2"><PrimitiveScope id="primitives-soft-studio-original" /><PrimitiveScope id="primitives-soft-studio-edited" /></div>
    <div data-primitive-language="nocturne" data-nocturne className="grid grid-cols-2"><PrimitiveScope id="primitives-nocturne-original" /><PrimitiveScope id="primitives-nocturne-edited" /></div>
  </section>;
}
`;

interface StyleCheck {
  selector: string;
  property: string;
  expected: string;
  pseudo?: string;
}

const OVERRIDES: Record<string, string> = {
  '--nx-ink': '#123456',
  '--nx-bg': '#edf7f2',
  '--nx-muted': '#516273',
  '--nx-grid': '#8a9baa',
  '--nx-border': '#8a9baa',
  '--nx-actionFill': '#fae97b',
  '--nx-actionText': '#123456',
  '--nx-actionBorder': '#123456',
  '--nx-surfaceFill': '#eee2ff',
  '--nx-fieldFill': '#fff4db',
  '--nx-selectionFill': '#bae8d0',
  '--nx-selectionText': '#123456',
  '--nx-badgeFill': '#ffb7a6',
  '--nx-badgeText': '#123456',
  '--nx-shadow-action': '7px 5px 0px',
  '--nx-shadow-control': '3px 2px 0px',
  '--nx-shadow-badge': '3px 1px 0px',
  '--nx-shadow-surface': '9px 7px 0px',
  '--nx-shadow-popover': '8px 6px 0px',
  '--nx-font-sans': 'Georgia, serif',
  '--nx-font-heading': 'monospace',
  '--nx-font-ui': 'Arial, sans-serif',
  '--nx-font-mono': 'monospace',
  '--nx-stroke-hairline': '2px',
  '--nx-radius-card': '13px',
  '--nx-radius-avatar': '6px',
  '--nx-radius-pill': '8px',
  '--nx-radius-checkbox': '5px',
  '--nx-radius-code': '7px',
  '--nx-radius-tooltip': '11px',
  '--nx-type-cardTitle-size': '23px',
  '--nx-type-cardTitle-weight': '500',
  '--nx-type-cardTitle-tracking': '0.04em',
  '--nx-type-subtitle-size': '15px',
  '--nx-type-caption-size': '13px',
  '--nx-type-control-size': '17px',
  '--nx-type-control-lineHeight': '1.6',
  '--nx-type-action-size': '16px',
  '--nx-type-action-weight': '500',
  '--nx-type-action-tracking': '0.025em',
  '--nx-type-action-lineHeight': '1.25',
  '--nx-type-label-size': '14px',
  '--nx-type-label-weight': '500',
  '--nx-type-label-tracking': '0.05em',
  '--nx-type-uiLabel-size': '16px',
  '--nx-type-uiLabel-weight': '500',
  '--nx-type-uiLabel-tracking': '0.05em',
  '--nx-type-uiLabel-transform': 'lowercase',
  '--nx-type-choice-size': '21px',
  '--nx-type-choice-weight': '700',
  '--nx-type-choice-lineHeight': '1.5',
  '--nx-texture-outlineOpacity': '0.7',
  '--nx-texture-hatchOpacity': '0.3',
  '--nx-type-body-size': '16px',
  '--nx-type-body-lineHeight': '1.8',
  '--nx-type-avatar-size': '18px',
  '--nx-type-disclosure-size': '19px',
  '--nx-type-emptyTitle-size': '22px',
  '--nx-type-prose-size': '18px',
  '--nx-type-stat-size': '34px',
  '--nx-type-status-size': '16px',
  '--nx-type-tooltip-size': '15px',
  '--nx-space-cardPadding': '31px 29px 27px',
  '--nx-space-fieldGap': '11px',
  '--nx-space-controlPadding': '10px 18px',
  '--nx-space-actionPadding': '12px 20px',
  '--nx-space-linkIconGap': '9px',
  '--nx-space-ruleInset': '23px',
  '--nx-space-tableCellPadding': '15px 20px 15px 0',
  '--nx-motion-control-duration': '73ms',
  '--nx-motion-control-easing': 'linear',
  '--nx-motion-toggle-duration': '89ms',
  '--nx-motion-disclosure-duration': '101ms',
  '--nx-motion-surface-duration': '113ms',
  '--nx-motion-progress-duration': '127ms',
  '--nx-motion-press-duration': '137ms',
  '--nx-motion-tooltip-duration': '149ms',
};

const STYLE_CHECKS: StyleCheck[] = [
  { selector: '.nx-card', property: 'backgroundColor', expected: 'rgb(238, 226, 255)' },
  { selector: '.nx-dialog', property: 'backgroundColor', expected: 'rgb(238, 226, 255)' },
  { selector: '.nx-input', property: 'backgroundColor', expected: 'rgb(255, 244, 219)' },
  { selector: '.nx-select', property: 'backgroundColor', expected: 'rgb(255, 244, 219)' },
  { selector: '.nx-textarea', property: 'backgroundColor', expected: 'rgb(255, 244, 219)' },
  { selector: '.nx-badge', property: 'backgroundColor', expected: 'rgb(255, 183, 166)' },
  { selector: '.nx-badge', property: 'color', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-checkbox', property: 'backgroundColor', expected: 'rgb(186, 232, 208)' },
  { selector: '.nx-checkbox', pseudo: '::before', property: 'borderBottomColor', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-switch', property: 'backgroundColor', expected: 'rgb(186, 232, 208)' },
  { selector: '.nx-switch', pseudo: '::before', property: 'backgroundColor', expected: 'rgb(18, 52, 86)' },
  { selector: '[data-selected-action]', property: 'backgroundColor', expected: 'rgb(186, 232, 208)' },
  { selector: '[data-selected-action]', property: 'color', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-card__title', property: 'color', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-card', property: 'borderTopColor', expected: 'rgb(138, 155, 170)' },
  { selector: '.nx-card', property: 'boxShadow', expected: 'rgb(18, 52, 86) 9px 7px 0px 0px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'backgroundColor', expected: 'rgb(250, 233, 123)' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'color', expected: 'rgb(18, 52, 86)' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'borderTopColor', expected: 'rgb(18, 52, 86)' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'boxShadow', expected: 'rgb(18, 52, 86) 7px 5px 0px 0px' },
  { selector: '.nx-input', property: 'boxShadow', expected: 'rgb(18, 52, 86) 3px 2px 0px 0px' },
  { selector: '.nx-select', property: 'boxShadow', expected: 'rgb(18, 52, 86) 3px 2px 0px 0px' },
  { selector: '.nx-textarea', property: 'boxShadow', expected: 'rgb(18, 52, 86) 3px 2px 0px 0px' },
  { selector: '.nx-badge', property: 'boxShadow', expected: 'rgb(18, 52, 86) 3px 1px 0px 0px' },
  { selector: '.nx-dialog', property: 'boxShadow', expected: 'rgb(18, 52, 86) 9px 7px 0px 0px' },
  { selector: '.nx-card', property: 'fontFamily', expected: 'Georgia, serif' },
  { selector: '.nx-input', property: 'fontFamily', expected: 'Georgia, serif' },
  { selector: '.nx-table', property: 'fontFamily', expected: 'Georgia, serif' },
  { selector: '.nx-btn', property: 'fontFamily', expected: 'Arial, sans-serif' },
  { selector: '.nx-field__label', property: 'fontFamily', expected: 'Arial, sans-serif' },
  { selector: '.nx-choice', property: 'fontFamily', expected: 'Arial, sans-serif' },
  { selector: '.nx-choice', property: 'fontSize', expected: '21px' },
  { selector: '.nx-choice', property: 'fontWeight', expected: '700' },
  { selector: '.nx-field__label', property: 'textTransform', expected: 'lowercase' },
  { selector: '.nx-card', pseudo: '::before', property: 'opacity', expected: '0.7' },
  { selector: '.nx-card', pseudo: '::before', property: 'borderTopColor', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-card', pseudo: '::after', property: 'opacity', expected: '0.3' },
  { selector: '[data-submit]', pseudo: '::before', property: 'opacity', expected: '0.7' },
  { selector: '[data-submit]', pseudo: '::before', property: 'borderTopColor', expected: 'rgb(18, 52, 86)' },
  { selector: '.nx-card', property: 'paddingTop', expected: '31px' },
  { selector: '.nx-card', property: 'paddingRight', expected: '29px' },
  { selector: '.nx-card', property: 'paddingBottom', expected: '27px' },
  { selector: '.nx-card', property: 'borderTopLeftRadius', expected: '13px' },
  { selector: '.nx-avatar--square', property: 'borderTopLeftRadius', expected: '6px' },
  { selector: '.nx-card__title', property: 'fontSize', expected: '23px' },
  { selector: '.nx-card__title', property: 'fontFamily', expected: 'monospace' },
  { selector: '.nx-dialog__title', property: 'fontFamily', expected: 'monospace' },
  { selector: '.nx-empty__title', property: 'fontFamily', expected: 'monospace' },
  { selector: '.nx-prose h2', property: 'fontFamily', expected: 'monospace' },
  { selector: '.nx-card__title', property: 'fontWeight', expected: '500' },
  { selector: '.nx-card__title', property: 'letterSpacing', expected: '0.92px' },
  { selector: '.nx-card__sub', property: 'fontSize', expected: '15px' },
  { selector: '.nx-card__caption', property: 'fontSize', expected: '13px' },
  { selector: '.nx-dialog__title', property: 'fontSize', expected: '23px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'fontSize', expected: '16px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'fontWeight', expected: '500' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'letterSpacing', expected: '0.4px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'lineHeight', expected: '20px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'paddingTop', expected: '12px' },
  { selector: '[data-primitive="button"] .nx-btn', property: 'paddingRight', expected: '20px' },
  { selector: '[data-primitive="input"] .nx-field', property: 'rowGap', expected: '11px' },
  { selector: '[data-primitive="input"] .nx-field__label', property: 'fontSize', expected: '16px' },
  { selector: '[data-primitive="input"] .nx-field__label', property: 'fontWeight', expected: '500' },
  { selector: '[data-primitive="input"] .nx-field__label', property: 'letterSpacing', expected: '0.8px' },
  { selector: '[data-primitive="input"] .nx-input', property: 'fontSize', expected: '17px' },
  { selector: '[data-primitive="input"] .nx-input', property: 'lineHeight', expected: '27.2px' },
  { selector: '[data-primitive="input"] .nx-input', property: 'paddingLeft', expected: '18px' },
  { selector: '.nx-select', property: 'fontSize', expected: '17px' },
  { selector: '.nx-textarea', property: 'fontSize', expected: '17px' },
  { selector: '.nx-alert', property: 'fontSize', expected: '16px' },
  { selector: '.nx-alert', property: 'lineHeight', expected: '28.8px' },
  { selector: '.nx-avatar', property: 'fontSize', expected: '18px' },
  { selector: '.nx-badge', property: 'fontSize', expected: '16px' },
  { selector: '.nx-checkbox', property: 'borderTopLeftRadius', expected: '5px' },
  { selector: '[data-primitive="code"] > .nx-code', property: 'borderTopLeftRadius', expected: '7px' },
  { selector: '.nx-details__summary', property: 'fontSize', expected: '19px' },
  { selector: '.nx-details__body', property: 'fontSize', expected: '16px' },
  { selector: '.nx-empty__title', property: 'fontSize', expected: '22px' },
  { selector: '.nx-link', pseudo: '::after', property: 'marginLeft', expected: '9px' },
  { selector: '.nx-progress-label', property: 'fontSize', expected: '13px' },
  { selector: '.nx-prose', property: 'fontSize', expected: '18px' },
  { selector: '.nx-prose code', property: 'borderTopLeftRadius', expected: '7px' },
  { selector: '.nx-radio', property: 'borderTopWidth', expected: '2px' },
  { selector: '.nx-rule', property: 'marginInlineStart', expected: '23px' },
  { selector: '.nx-slider-value', property: 'fontSize', expected: '13px' },
  { selector: '.nx-stat__value', property: 'fontSize', expected: '34px' },
  { selector: '.nx-status', property: 'fontSize', expected: '16px' },
  { selector: '.nx-switch', property: 'borderTopLeftRadius', expected: '8px' },
  { selector: '.nx-table td', property: 'paddingTop', expected: '15px' },
  { selector: '.nx-table td', property: 'paddingRight', expected: '20px' },
  { selector: '.nx-tooltip', pseudo: '::after', property: 'fontSize', expected: '15px' },
  { selector: '.nx-tooltip', pseudo: '::after', property: 'borderTopLeftRadius', expected: '11px' },
];

async function readStyle(scope: Locator, check: StyleCheck): Promise<string> {
  return scope.locator(check.selector).first().evaluate((element, { property, pseudo }) => {
    const style = getComputedStyle(element, pseudo ?? null);
    return style[property as keyof CSSStyleDeclaration] as string;
  }, check);
}

async function checkSelectWidths(scope: Locator): Promise<void> {
  const dimensions = await scope.locator('[data-primitive="select"] select').evaluateAll((elements) => elements.map((element) => ({
    compact: element.classList.contains('nx-select--auto'),
    width: element.getBoundingClientRect().width,
    wrapper: element.parentElement!.getBoundingClientRect().width,
  })));
  assert.equal(dimensions.length, 2, 'The consumer must exercise full-width and intrinsic-width Select APIs');
  for (const { compact, width, wrapper } of dimensions) {
    assert(wrapper > 0 && width > 0, 'Select and its wrapper must have measurable widths');
    if (compact) assert(width < wrapper - 1, `autoWidth Select must fit its content instead of stretching (${width}px inside ${wrapper}px)`);
    else assert(Math.abs(width - wrapper) < 1, `Default Select must fill its wrapper (${width}px inside ${wrapper}px)`);
  }
}

async function checkNativeBehavior(scope: Locator): Promise<void> {
  const title = scope.getByRole('textbox', { name: 'Report title' });
  await title.fill('Quarterly report');
  await scope.getByRole('textbox', { name: 'Notes' }).fill('Keep this application state.');

  const checkbox = scope.getByRole('checkbox', { name: 'Include archived reports' });
  await checkbox.focus();
  await checkbox.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(scope.getByRole('checkbox', { name: 'Unavailable setting' })).toBeDisabled();
  const setting = scope.getByRole('switch', { name: 'Notify after export' });
  await setting.focus();
  await setting.press('Space');
  await expect(setting).toBeChecked();

  await scope.getByRole('radio', { name: 'CSV', exact: true }).focus();
  await scope.getByRole('radio', { name: 'CSV', exact: true }).press('ArrowRight');
  await expect(scope.getByRole('radio', { name: 'JSON', exact: true })).toBeChecked();
  const slider = scope.getByRole('slider', { name: 'Row limit' });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('55');

  const select = scope.getByRole('combobox', { name: 'Reporting window' });
  await select.selectOption('month');
  await scope.locator('[data-submit]').click();
  await expect(scope.locator('[data-form-result]')).toHaveText(JSON.stringify({
    title: 'Quarterly report', notes: 'Keep this application state.', window: 'month',
    includeArchived: 'on', format: 'json', notify: 'on', limit: '55',
  }));
  await expect(scope.getByRole('button', { name: 'Unavailable action' })).toBeDisabled();

  const summary = scope.locator('.nx-details__summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(scope.locator('.nx-details')).toHaveAttribute('open', '');

  const opener = scope.locator('[data-open-dialog]');
  await opener.click();
  const dialog = scope.getByRole('dialog', { name: 'Review settings' });
  await expect(dialog).toBeVisible();
  assert(await dialog.evaluate((element) => element.matches(':modal')), 'Dialog must open through the native modal API');
  await expect(dialog.getByRole('textbox', { name: 'Reviewer note' })).toBeFocused();
  await dialog.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'Close review' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();

  const tooltip = scope.locator('.nx-tooltip');
  await tooltip.locator('.nx-tooltip__trigger').focus();
  await expect.poll(() => tooltip.evaluate((element) => getComputedStyle(element, '::after').visibility)).toBe('visible');
  await title.focus();
  await expect.poll(() => tooltip.evaluate((element) => getComputedStyle(element, '::after').visibility)).toBe('hidden');
}

async function checkNeoActions(page: Page): Promise<void> {
  const scope = page.locator('#primitives-neo-brutalism-original');
  const button = scope.locator('[data-submit]');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await expect(button).toHaveCSS('background-color', 'rgb(255, 216, 77)');
  await expect(button).toHaveCSS('color', 'rgb(24, 24, 24)');
  await expect(button).toHaveCSS('border-top-width', '2px');
  await expect(button).toHaveCSS('border-radius', '4px');
  await expect(button).toHaveCSS('font-size', '14px');
  assert((await button.boundingBox())!.height >= 44, 'Neo-brutalism actions must retain a comfortable target height');
  await expect(button).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 4px 4px 0px 0px');
  await expect(scope.locator('.nx-card')).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 6px 6px 0px 0px');
  await expect(scope.locator('.nx-card')).toHaveCSS('border-top-color', 'rgb(24, 24, 24)');
  await expect(scope.locator('.nx-card')).toHaveCSS('font-family', '"Space Grotesk", ui-sans-serif, system-ui, sans-serif');
  await expect(scope.locator('.nx-card')).toHaveCSS('background-color', 'rgb(229, 216, 255)');
  await expect(scope.locator('.nx-card')).toHaveCSS('border-radius', '8px');
  const input = scope.getByRole('textbox', { name: 'Report title' });
  await expect(input).toHaveCSS('background-color', 'rgb(255, 243, 214)');
  await expect(input).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 4px 4px 0px 0px');
  assert((await input.boundingBox())!.height >= 44, 'Neo-brutalism fields must retain a comfortable target height');
  await expect(scope.locator('.nx-badge')).toHaveCSS('background-color', 'rgb(255, 143, 181)');
  await expect(scope.locator('.nx-badge')).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 2px 2px 0px 0px');
  await expect(scope.locator('[data-selected-action]')).toHaveCSS('background-color', 'rgb(141, 229, 193)');

  await button.hover();
  await expect(button).toHaveCSS('background-color', 'rgb(241, 194, 50)');
  await page.mouse.down();
  try {
    await expect(button).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 4, 4)');
    await expect(button).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 0px 0px 0px 0px');
  } finally {
    await page.mouse.up();
  }
  await expect(button).toHaveCSS('transform', 'none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await button.hover();
  await page.mouse.down();
  try {
    await expect(button).toHaveCSS('transform', 'none');
    await expect(button).toHaveCSS('box-shadow', 'rgb(24, 24, 24) 4px 4px 0px 0px');
    await expect(button).toHaveCSS('transition-duration', '0s');
  } finally {
    await page.mouse.up();
  }
  const disabled = scope.getByRole('button', { name: 'Unavailable action' });
  await disabled.hover();
  await page.mouse.down();
  try {
    await expect(disabled).toHaveCSS('background-color', 'rgb(255, 216, 77)');
    await expect(disabled).toHaveCSS('transform', 'none');
  } finally {
    await page.mouse.up();
  }
  await page.mouse.move(0, 0);
}

export async function checkPrimitiveConsumer(page: Page): Promise<void> {
  await checkNeoActions(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const language of ['mono-editorial', 'signal-console', 'neo-brutalism', 'sketchbook', 'soft-studio', 'nocturne']) {
    const original = page.locator(`#primitives-${language}-original`);
    const edited = page.locator(`#primitives-${language}-edited`);
    if (language === 'sketchbook') {
      for (const selector of ['.nx-card__title', '.nx-btn', '.nx-field__label', '.nx-choice', '.nx-badge', '.nx-details__summary', '.nx-dialog__action', '.nx-slider-value > label', '.nx-progress-label > label']) {
        assert.match(await readStyle(original, { selector, property: 'fontFamily', expected: '' }), /Gaegu/);
      }
      for (const selector of ['.nx-input', '.nx-select', '.nx-textarea', '.nx-card__body', '.nx-prose p', '.nx-table th', '.nx-table td', '.nx-slider-value > span', '.nx-progress-label > span']) {
        assert.match(await readStyle(original, { selector, property: 'fontFamily', expected: '' }), /Gaegu/);
      }
      await expect(original.locator('.nx-table th').first()).toHaveCSS('font-size', '14px');
      const action = original.locator('[data-submit]');
      await action.scrollIntoViewIfNeeded();
      const before = await action.boundingBox();
      assert(before && before.height >= 44, 'Handwritten actions need a comfortable target height');
      await action.hover();
      assert.deepEqual(await action.boundingBox(), before, 'Decorative strokes must not move the hit target');
      for (const selector of ['.nx-card', '[data-submit]']) {
        for (const pseudo of ['::before', '::after']) {
          assert.equal(await readStyle(original, { selector, pseudo, property: 'pointerEvents', expected: '' }), 'none');
        }
        assert.equal(await readStyle(original, { selector, pseudo: '::before', property: 'opacity', expected: '' }), '0.4');
        assert.equal(await readStyle(original, { selector, pseudo: '::after', property: 'opacity', expected: '' }), '0.18');
      }
      await page.mouse.move(0, 0);
    } else {
      for (const selector of ['.nx-card', '[data-submit]']) {
        for (const pseudo of ['::before', '::after']) {
          assert.equal(await readStyle(original, { selector, pseudo, property: 'opacity', expected: '' }), '0', `${language}: texture must remain invisible`);
        }
      }
    }
    for (const scope of [original, edited]) {
      const rendered = await scope.locator('[data-primitive]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-primitive')).sort());
      assert.deepEqual(rendered, [...PRIMITIVE_SLUGS].sort(), `${language}: all delivered primitive APIs must render`);
      await checkSelectWidths(scope);
    }

    await checkNativeBehavior(edited);
    await expect(original.getByRole('textbox', { name: 'Report title' })).toHaveValue('Weekly report');
    await expect(original.getByRole('radio', { name: 'CSV', exact: true })).toBeChecked();
    await expect(original.locator('.nx-details')).not.toHaveAttribute('open');
    const input = await edited.getByRole('textbox', { name: 'Report title' }).elementHandle();
    assert(input, 'The edited input must exist before tokens change');
    const originalStyles = await Promise.all(STYLE_CHECKS.map((check) => readStyle(original, check)));

    await edited.evaluate((element, overrides) => {
      for (const [name, value] of Object.entries(overrides)) (element as HTMLElement).style.setProperty(name, value);
    }, OVERRIDES);
    for (const check of STYLE_CHECKS) {
      await expect.poll(() => readStyle(edited, check), { message: `${language}: ${check.selector}${check.pseudo ?? ''} ${check.property} must consume its scoped token` }).toBe(check.expected);
    }
    assert.deepEqual(await Promise.all(STYLE_CHECKS.map((check) => readStyle(original, check))), originalStyles, `${language}: descendant overrides leaked into sibling primitives`);
    await checkSelectWidths(original);
    await checkSelectWidths(edited);
    assert(await input.evaluate((element) => element.isConnected), 'Changing tokens must not replace native controls');
    await expect(edited.getByRole('textbox', { name: 'Report title' })).toHaveValue('Quarterly report');
    await expect(edited.getByRole('checkbox', { name: 'Include archived reports' })).toBeChecked();
    await expect(edited.getByRole('switch', { name: 'Notify after export' })).toBeChecked();
    await expect(edited.getByRole('slider', { name: 'Row limit' })).toHaveValue('55');

    const select = edited.getByRole('combobox', { name: 'Reporting window' });
    if (await page.evaluate(() => CSS.supports('appearance', 'base-select'))) {
      await select.click();
      await expect.poll(() => select.evaluate((element) => element.matches(':open'))).toBe(true);
      const picker = await select.evaluate((element) => {
        const style = getComputedStyle(element, '::picker(select)');
        return { appearance: style.appearance, background: style.backgroundColor, radius: style.borderTopLeftRadius, shadow: style.boxShadow };
      });
      assert.deepEqual(picker, { appearance: 'base-select', background: 'rgb(255, 244, 219)', radius: '13px', shadow: 'rgb(18, 52, 86) 8px 6px 0px 0px' }, `${language}: opened picker must consume descendant tokens in the browser top layer`);
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await expect(select).toHaveValue('day');
      await select.click();
      await page.keyboard.press('Escape');
      await expect.poll(() => select.evaluate((element) => element.matches(':open'))).toBe(false);
    }

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => readStyle(edited, { selector: '[data-primitive="input"] .nx-input', property: 'transitionDuration', expected: '' })).toBe('0.073s');
    await expect.poll(() => readStyle(edited, { selector: '[data-primitive="input"] .nx-input', property: 'transitionTimingFunction', expected: '' })).toBe('linear');
    await expect.poll(() => readStyle(edited, { selector: '.nx-details__summary', pseudo: '::after', property: 'transitionDuration', expected: '' })).toBe('0.101s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const check of [
      { selector: '[data-primitive="button"] .nx-btn', property: 'transitionDuration', expected: '0s' },
      { selector: '.nx-checkbox', property: 'transitionDuration', expected: '0s' },
      { selector: '.nx-switch', property: 'transitionDuration', expected: '0s' },
      { selector: '.nx-tooltip', pseudo: '::after', property: 'transitionDuration', expected: '0s' },
    ]) assert.equal(await readStyle(edited, check), check.expected, `${language}: reduced motion must override duration tokens`);
  }
  console.log('Validated all 24 CLI-delivered primitives in all six languages: scoped paint/type/UI fonts/texture/spacing/radius/shadows/motion, Sketchbook typography and stable targets, tactile Neo-brutalism actions, native controls, custom picker, modal focus/Escape, and sibling/state isolation.');
}
