"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "./StarRating";

export type ReviewAttributeDefinition = {
  id: string;
  key: string;
  label: string;
  kind: string;
  required: boolean;
  options?: { choices?: string[] } | null;
};

export type AttributeAnswerDraft = {
  definition_id: string;
  key: string;
  rating_value?: number;
  text_value?: string;
  choice_values?: string[];
};

type ReviewAttributeQuestionsProps = {
  definitions: ReviewAttributeDefinition[];
  answers: Record<string, AttributeAnswerDraft>;
  onChange: (answers: Record<string, AttributeAnswerDraft>) => void;
  disabled?: boolean;
  legend: string;
};

export function ReviewAttributeQuestions({
  definitions,
  answers,
  onChange,
  disabled = false,
  legend,
}: ReviewAttributeQuestionsProps) {
  const groupId = useId();

  if (definitions.length === 0) return null;

  function update(
    definition: ReviewAttributeDefinition,
    patch: Partial<AttributeAnswerDraft>,
  ) {
    const current = answers[definition.key] ?? {
      definition_id: definition.id,
      key: definition.key,
    };
    onChange({
      ...answers,
      [definition.key]: {
        ...current,
        ...patch,
        definition_id: definition.id,
        key: definition.key,
      },
    });
  }

  return (
    <fieldset className="space-y-4 rounded-md bg-marketplace-surface-warm/60 p-4 sm:p-5">
      <legend className="text-sm font-semibold text-marketplace-foreground">
        {legend}
      </legend>
      {definitions.map((definition) => {
        const answer = answers[definition.key];
        const requiredMark = definition.required ? (
          <span aria-hidden="true" className="text-red-600">
            {" "}
            *
          </span>
        ) : null;

        if (definition.kind === "rating_5") {
          return (
            <div
              key={definition.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-marketplace-foreground">
                {definition.label}
                {requiredMark}
              </p>
              <StarRatingInput
                value={answer?.rating_value ?? 0}
                onChange={(value) =>
                  update(definition, { rating_value: value })
                }
                label={definition.label}
                disabled={disabled}
              />
            </div>
          );
        }

        if (definition.kind === "text") {
          const inputId = `${groupId}-${definition.key}`;
          return (
            <div key={definition.id}>
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-marketplace-foreground"
              >
                {definition.label}
                {requiredMark}
              </label>
              <Textarea
                id={inputId}
                value={answer?.text_value ?? ""}
                onChange={(event) =>
                  update(definition, { text_value: event.target.value })
                }
                disabled={disabled}
                rows={3}
                className="mt-2"
              />
            </div>
          );
        }

        const choices = definition.options?.choices ?? [];
        const selected = answer?.choice_values ?? [];

        if (definition.kind === "single_choice") {
          return (
            <div key={definition.id}>
              <p className="text-sm font-medium text-marketplace-foreground">
                {definition.label}
                {requiredMark}
              </p>
              <div className="mt-2 space-y-2">
                {choices.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={`${groupId}-${definition.key}`}
                      checked={selected[0] === choice}
                      disabled={disabled}
                      onChange={() =>
                        update(definition, { choice_values: [choice] })
                      }
                    />
                    {choice}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (definition.kind === "multi_choice") {
          return (
            <div key={definition.id}>
              <p className="text-sm font-medium text-marketplace-foreground">
                {definition.label}
                {requiredMark}
              </p>
              <div className="mt-2 space-y-2">
                {choices.map((choice) => {
                  const checked = selected.includes(choice);
                  return (
                    <label
                      key={choice}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((value) => value !== choice)
                            : [...selected, choice];
                          update(definition, { choice_values: next });
                        }}
                      />
                      {choice}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={definition.id}>
            <label className="text-sm font-medium text-marketplace-foreground">
              {definition.label}
              {requiredMark}
            </label>
            <Input
              value={answer?.text_value ?? ""}
              onChange={(event) =>
                update(definition, { text_value: event.target.value })
              }
              disabled={disabled}
              className="mt-2"
            />
          </div>
        );
      })}
    </fieldset>
  );
}

export function validateAttributeAnswers(
  definitions: ReviewAttributeDefinition[],
  answers: Record<string, AttributeAnswerDraft>,
): boolean {
  for (const definition of definitions) {
    if (!definition.required) continue;
    const answer = answers[definition.key];
    if (!answer) return false;
    switch (definition.kind) {
      case "rating_5":
        if (!answer.rating_value || answer.rating_value < 1) return false;
        break;
      case "text":
        if (!answer.text_value?.trim()) return false;
        break;
      case "single_choice":
        if (!answer.choice_values?.length) return false;
        break;
      case "multi_choice":
        if (!answer.choice_values?.length) return false;
        break;
    }
  }
  return true;
}

export function serializeAttributeAnswers(
  answers: Record<string, AttributeAnswerDraft>,
): AttributeAnswerDraft[] {
  return Object.values(answers).filter((answer) => {
    if (answer.rating_value) return true;
    if (answer.text_value?.trim()) return true;
    if (answer.choice_values?.length) return true;
    return false;
  });
}
