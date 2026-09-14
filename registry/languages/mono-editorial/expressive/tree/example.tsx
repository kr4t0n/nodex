import{Tree}from'./component';
const data=[
  { name: 'Editor', features: ['Blocks', 'Tables', 'Comments', 'History'] },
  { name: 'Automate', features: ['Workflows', 'Triggers', 'Webhooks'] },
  { name: 'Collaborate', features: ['Spaces', 'Guests', 'Mentions'] },
  { name: 'Integrate', features: ['API', 'Slack', 'GitHub'] },
];
export function Example(){return <Tree data={data} root="Platform"/>;}
