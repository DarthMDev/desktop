import React, { useMemo } from 'react';
import { FormProps } from 'antd/lib/form';
import debounce from 'lodash/debounce';
import cloneDeep from 'lodash/cloneDeep';
import * as inputs from './inputList';
import { TInputType, TSlobsInputProps } from './inputs';
import Form, { useForm } from './Form';
import { TInputMetadata } from './metadata';

export type TInputValue = string | number | boolean | IRGBColor;

const componentTable: {
  [k in TInputType]?: React.FunctionComponent<TSlobsInputProps<{}, TInputValue>>;
} = {
  text: inputs.TextInput,
  number: inputs.NumberInput,
  slider: inputs.SliderInput,
  checkbox: inputs.CheckboxInput,
  list: inputs.ListInput,
  switch: inputs.SwitchInput,
  autocomplete: inputs.AutocompleteInput,
  checkboxGroup: inputs.CheckboxGroup,
  textarea: inputs.TextAreaInput,
  color: inputs.ColorInput,
};

interface IFormMetadata {
  [value: string]: TInputMetadata;
}

export default function FormFactory(p: {
  metadata: IFormMetadata;
  onChange: (key: string) => (value: TInputValue) => void;
  values: Dictionary<TInputValue>;
  formOptions?: FormProps;
  name?: string;
}) {
  const form = useForm();

  useMemo(() => form.setFieldsValue(cloneDeep(p.values)), []);

  return (
    <Form
      {...p.formOptions}
      name={p.name}
      form={form}
      onFieldsChange={() => debounce(form.validateFields, 500)()}
    >
      {Object.keys(p.metadata).map((inputKey: string) => (
        <FormInput
          key={inputKey}
          id={inputKey}
          metadata={p.metadata[inputKey]}
          values={p.values}
          onChange={p.onChange}
        />
      ))}
    </Form>
  );
}

function FormInput(p: {
  id: string;
  metadata: TInputMetadata<unknown>;
  values: Dictionary<TInputValue>;
  onChange: (key: string) => (value: TInputValue) => void;
}) {
  const { children, type } = p.metadata;

  if (!type) return <></>;

  const Input = componentTable[type];
  let handleChange = p.onChange(p.id);
  if (type === 'checkboxGroup') handleChange = p.onChange;
  if (p.metadata.onChange) handleChange = p.metadata.onChange;

  return (
    <>
      <Input
        {...p.metadata}
        name={p.id}
        value={p.values[p.id]}
        values={type === 'checkboxGroup' && p.values}
        onChange={handleChange}
      />
      {!!children &&
        type !== 'checkboxGroup' &&
        Object.keys(children)
          .filter(childKey => children[childKey].displayed)
          .map(childKey => (
            <FormInput
              key={childKey}
              id={childKey}
              metadata={children[childKey]}
              values={p.values}
              onChange={p.onChange}
            />
          ))}
    </>
  );
}
