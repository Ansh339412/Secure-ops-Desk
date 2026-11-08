import { saveAsset } from '@/actions/assets';
import {
  ActionForm,
  Checkbox,
  Field,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from '@/components/ui/form';
import { ASSET_STATUSES, ASSET_TYPES } from '@/lib/constants';
import type { Asset } from '@/types';

export function AssetForm({ asset, readOnly = false }: { asset?: Asset; readOnly?: boolean }) {
  return (
    <ActionForm action={saveAsset} className="space-y-4">
      {asset && <input type="hidden" name="id" value={asset.id} />}
      <fieldset disabled={readOnly} className="min-w-0 space-y-4">
        <Field name="name" label="Name">
          <Input name="name" defaultValue={asset?.name} required minLength={2} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="type" label="Type">
            <Select name="type" options={ASSET_TYPES} defaultValue={asset?.type ?? 'laptop'} />
          </Field>
          <Field name="status" label="Status">
            <Select
              name="status"
              options={ASSET_STATUSES}
              defaultValue={asset?.status ?? 'active'}
            />
          </Field>
          <Field name="operating_system" label="Operating system">
            <Input
              name="operating_system"
              defaultValue={asset?.operating_system}
              maxLength={80}
              placeholder="Ubuntu 24.04"
            />
          </Field>
          <Field name="owner_name" label="Owner">
            <Input
              name="owner_name"
              defaultValue={asset?.owner_name}
              maxLength={80}
              placeholder="Person or team"
            />
          </Field>
        </div>
        <Checkbox
          name="is_critical"
          label="Business-critical asset (raises its risk score)"
          defaultChecked={asset?.is_critical}
        />
        <Field name="notes" label="Notes">
          <Textarea name="notes" defaultValue={asset?.notes} maxLength={2000} />
        </Field>
      </fieldset>
      {!readOnly && <SubmitButton>{asset ? 'Save changes' : 'Create asset'}</SubmitButton>}
    </ActionForm>
  );
}
