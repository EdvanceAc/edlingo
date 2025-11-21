import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const voiceOptions = [
  { value: "Puck", label: "Puck" },
  { value: "Charon", label: "Charon" },
  { value: "Kore", label: "Kore" },
  { value: "Fenrir", label: "Fenrir" },
  { value: "Aoede", label: "Aoede" },
];

export default function VoiceSelector() {
  const { config, setConfig } = useLiveAPIContext();

  useEffect(() => {
    const voiceName =
      config.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
      "Atari02";
    const voiceOption = { value: voiceName, label: voiceName };
    setSelectedOption(voiceOption);
  }, [config]);

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(voiceOptions[5]);

  const updateConfig = useCallback(
    (voiceName: string) => {
      setConfig({
        ...config,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      });
    },
    [config, setConfig]
  );

  return (
    <div className="select-group">
      <label htmlFor="voice-selector">Voice</label>
      <Select
        id="voice-selector"
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
        value={selectedOption}
        defaultValue={selectedOption}
        options={voiceOptions}
        onChange={(e) => {
          setSelectedOption(e);
          if (e) {
            updateConfig(e.value);
          }
        }}
      />
    </div>
  );
}
