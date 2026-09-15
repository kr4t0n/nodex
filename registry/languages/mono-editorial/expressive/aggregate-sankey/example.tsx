import { AggregateSankey, type AggregateSankeyDatum } from './component';
const plans = ['FREE', 'PRO', 'TEAM'];
const data: readonly AggregateSankeyDatum[] = [{ channel: 'SEARCH', toPlans: [20, 10, 4] }, { channel: 'REFERRAL', toPlans: [12, 9, 6] }, { channel: 'SOCIAL', toPlans: [12, 4, 2] }, { channel: 'PAID', toPlans: [6, 3, 3] }, { channel: 'OTHER', toPlans: [5, 2, 2] }];
export function Example() { return <AggregateSankey data={data} plans={plans} height={288} />; }
