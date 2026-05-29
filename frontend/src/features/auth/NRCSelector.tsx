import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import nrcData from "@/mock-data/nrc.json";

const NRC_TYPES = [
  { value: "N", label: { en: "N", mm: "နိုင်" } },
  { value: "E", label: { en: "E", mm: "ဧည့်" } },
  { value: "P", label: { en: "P", mm: "ပြု" } },
  { value: "S", label: { en: "S", mm: "စ" } },
];

const glassSelectClass =
  "h-12 border-white/15 bg-white/10 text-white focus:ring-white/40";

type NRCSelectorProps = {
  value?: string;
  onChange: (value: string) => void;
};

export function NRCSelector({ onChange }: NRCSelectorProps) {
  const [selectedState, setSelectedState] = useState("");
  const [selectedTownship, setSelectedTownship] = useState("");
  const [selectedType, setSelectedType] = useState("N");
  const [nrcNumber, setNrcNumber] = useState("");

  const selectedStateData = useMemo(
    () => nrcData.find((s) => s.value === selectedState),
    [selectedState],
  );

  const townshipOptions = selectedStateData?.townships ?? [];

  const emitChange = (state: string, township: string, type: string, number: string) => {
    if (state && township && type && number.length === 6) {
      onChange(`${state}/${township}(${type})${number}`);
    } else {
      onChange("");
    }
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedTownship("");
    emitChange(value, "", selectedType, nrcNumber);
  };

  const handleTownshipChange = (value: string) => {
    setSelectedTownship(value);
    emitChange(selectedState, value, selectedType, nrcNumber);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    emitChange(selectedState, selectedTownship, value, nrcNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setNrcNumber(value);
    emitChange(selectedState, selectedTownship, selectedType, value);
  };

  const generatedNRC = useMemo(() => {
    if (selectedState && selectedTownship && selectedType && nrcNumber.length === 6) {
      return `${selectedState}/${selectedTownship}(${selectedType})${nrcNumber}`;
    }
    return "";
  }, [selectedState, selectedTownship, selectedType, nrcNumber]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-white/60">State / Division</Label>
          <Select value={selectedState} onValueChange={handleStateChange}>
            <SelectTrigger className={cn(glassSelectClass, !selectedState && "text-white/35")}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {nrcData.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-white/60">Township</Label>
          <Select
            value={selectedTownship}
            onValueChange={handleTownshipChange}
            disabled={!selectedState}
          >
            <SelectTrigger className={cn(glassSelectClass, !selectedTownship && "text-white/35")}>
              <SelectValue placeholder="Select township" />
            </SelectTrigger>
            <SelectContent>
              {townshipOptions.length > 0 ? (
                townshipOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label.en}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__none" disabled>
                  No townships available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-white/60">NRC Type</Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className={glassSelectClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NRC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/60">6-digit Number</Label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={nrcNumber}
          onChange={handleNumberChange}
          className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/35 focus-visible:ring-white/40"
        />
      </div>

      {generatedNRC && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white/80">
          <span className="font-mono font-semibold text-white">{generatedNRC}</span>
        </div>
      )}
    </div>
  );
}
