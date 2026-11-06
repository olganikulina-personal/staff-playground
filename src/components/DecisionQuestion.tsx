import type { DecisionQuestion as DecisionQuestionModel } from "../simulations/types";

interface DecisionQuestionProps {
  readonly question: DecisionQuestionModel;
  readonly selectedOption?: string;
  readonly onSelect: (option: string) => void;
}

export function DecisionQuestion({
  question,
  selectedOption,
  onSelect,
}: DecisionQuestionProps) {
  return (
    <fieldset className="lab-panel decision-question">
      <legend>
        <span className="eyebrow">Decide</span>
        <strong>{question.prompt}</strong>
      </legend>
      <div className="decision-options">
        {question.options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="decision-question"
              value={option}
              checked={selectedOption === option}
              onChange={() => onSelect(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <p className="decision-focus">
        Reasoning focus: {question.reasoningFocus}
      </p>
    </fieldset>
  );
}
