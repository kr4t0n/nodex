import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './component';

const plans = [
  { name: 'Starter', accounts: '1,284', revenue: '182.4' },
  { name: 'Pro', accounts: '612', revenue: '486.1' },
  { name: 'Team', accounts: '207', revenue: '391.7' },
];

export function Example() {
  return (
    <Table>
      <TableCaption>Revenue by plan, Q2</TableCaption>
      <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Accounts</TableHead><TableHead numeric>MRR</TableHead></TableRow></TableHeader>
      <TableBody>
        {plans.map((plan) => <TableRow key={plan.name}><TableCell>{plan.name}</TableCell><TableCell quiet>{plan.accounts}</TableCell><TableCell numeric>{plan.revenue}</TableCell></TableRow>)}
        <TableRow strong><TableCell>Total</TableCell><TableCell quiet>2,103</TableCell><TableCell numeric>1,060.2</TableCell></TableRow>
      </TableBody>
    </Table>
  );
}
