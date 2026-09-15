import { Avatar, AvatarGroup } from './component';

export function Example() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex items-center gap-2.5">
        <Avatar name="Robin Hill" size="sm" />
        <Avatar name="Morgan Kim" tone={2} />
        <Avatar name="Taylor Adams" tone={3} />
        <Avatar name="Jordan Lee" size="lg" tone={4} />
      </div>
      <div className="flex items-center gap-2.5">
        <Avatar name="Project Lab" shape="square" tone={2} />
        <Avatar name="Drew Smith" variant="outline" />
      </div>
      <AvatarGroup aria-label="Contributors">
        <Avatar name="Jordan Lee" tone={4} />
        <Avatar name="Taylor Adams" tone={3} />
        <Avatar name="Morgan Kim" tone={2} />
        <Avatar name="Robin Hill" />
        <Avatar name="7 more contributors" fallback="+7" variant="count" />
      </AvatarGroup>
    </div>
  );
}
