import type { FormState } from '@/types';
import { ActionForm, SubmitButton } from './form';

export function DeleteForm({
  action,
  id,
  confirm,
  children = 'Delete',
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  confirm: string;
  children?: React.ReactNode;
}) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={confirm}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
