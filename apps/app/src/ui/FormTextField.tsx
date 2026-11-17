import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextField, type TextFieldProps } from './TextField';

/**
 * TextField conectado a react-hook-form: el error viene del esquema zod compartido. Conecta la
 * ref, así `handleSubmit` lleva el foco al primer error y `setFocus` funciona. Con `onNext`,
 * Enter pasa al campo siguiente: `onNext={() => { setFocus('password'); }}`.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  onNext,
  ...props
}: Omit<TextFieldProps, 'value' | 'onChangeText' | 'error' | 'ref'> & {
  control: Control<T>;
  name: FieldPath<T>;
  onNext?: () => void;
}) {
  const {
    field: { ref: inputRef, value, onChange, onBlur },
    fieldState,
  } = useController({ control, name });
  return (
    <TextField
      {...(onNext ? { returnKeyType: 'next' as const, onSubmitEditing: onNext } : null)}
      {...props}
      ref={inputRef}
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      onBlur={onBlur}
      error={fieldState.error?.message}
    />
  );
}
