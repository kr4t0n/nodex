import { Dialog, DialogAction } from './component';

export function Example() {
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[18px]">
      <Dialog
        title="Replace this component?"
        description="You have edited this file since adding it. Fetching it again overwrites your changes, and nodex keeps no copy of them."
        inline
        open
        actions={<><DialogAction>Keep mine</DialogAction><DialogAction confirm>Overwrite</DialogAction></>}
      />
    </div>
  );
}
