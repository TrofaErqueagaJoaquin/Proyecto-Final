import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextField, type TextFieldProps } from './TextField';

/** TextField conectado a react-hook-form: el error viene del esquema zod compartido. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  ...props
}: Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <TextField
      {...props}
      value={typeof field.value === 'string' ? field.value : ''}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
