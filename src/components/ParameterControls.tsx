export interface ParameterField {
  readonly id: string;
  readonly label: string;
  readonly inputType: "number" | "select";
  readonly value: string | number;
  readonly min?: number;
  readonly max?: number;
  readonly description?: string;
  readonly options?: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

interface ParameterControlsProps {
  readonly fields: readonly ParameterField[];
  readonly onChange: (fieldId: string, value: string) => void;
}

export function ParameterControls({
  fields,
  onChange,
}: ParameterControlsProps) {
  return (
    <fieldset className="parameter-controls">
      <legend>Scenario parameters</legend>
      {fields.map((field) => (
        <div className="parameter-field" key={field.id}>
          <label htmlFor={field.id}>{field.label}</label>
          {field.inputType === "select" ? (
            <select
              id={field.id}
              value={field.value}
              onChange={(event) => onChange(field.id, event.target.value)}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              type="number"
              value={field.value}
              min={field.min}
              max={field.max}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
          {field.description ? <small>{field.description}</small> : null}
        </div>
      ))}
    </fieldset>
  );
}
