import { useCallback, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Modality } from "@google/genai";

const responseOptions = [
  { value: "audio", label: "audio" },
  { value: "text", label: "text" },
];

export default function ResponseModalitySelector() {
  const { config, setConfig } = useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(responseOptions[0]);

  const updateConfig = useCallback(
    (modality: "audio" | "text") => {
      setConfig({
        ...config,
        responseModalities: [
          modality === "audio" ? Modality.AUDIO : Modality.TEXT,
        ],
      });
    },
    [config, setConfig]
  );

  return (
    <div className="select-group">
      <label htmlFor="response-modality-selector">Response modality</label>
      <Select
        id="response-modality-selector"
        className="react-select"
        classNamePrefix="react-select"
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            background: "var(--Neutral-10)",
            color: "var(--Neutral-90)",
            minHeight: "36px",
            borderRadius: 10,
            border: "1px solid var(--Neutral-30)",
            boxShadow: state.isFocused
              ? "0 0 0 2px rgba(161, 228, 242, 0.35)"
              : "none",
            transition: "border-color .15s ease, box-shadow .15s ease",
          }),
          placeholder: (styles) => ({
            ...styles,
            color: "var(--Neutral-60)",
          }),
          singleValue: (styles) => ({
            ...styles,
            color: "var(--Neutral-90)",
          }),
          dropdownIndicator: (styles) => ({
            ...styles,
            color: "var(--Neutral-80)",
          }),
          indicatorSeparator: (styles) => ({
            ...styles,
            backgroundColor: "var(--Neutral-30)",
          }),
          menu: (styles) => ({
            ...styles,
            background: "var(--Neutral-10)",
            border: "1px solid var(--Neutral-30)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
          }),
          option: (styles, { isFocused, isSelected }) => ({
            ...styles,
            color: "var(--Neutral-90)",
            backgroundColor: isSelected
              ? "var(--Neutral-30)"
              : isFocused
              ? "var(--Neutral-20)"
              : "transparent",
          }),
          input: (styles) => ({
            ...styles,
            color: "var(--Neutral-90)",
          }),
        }}
        defaultValue={selectedOption}
        options={responseOptions}
        onChange={(e) => {
          setSelectedOption(e);
          if (e && (e.value === "audio" || e.value === "text")) {
            updateConfig(e.value);
          }
        }}
      />
    </div>
  );
}
