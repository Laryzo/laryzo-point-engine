import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export default function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">{label}</div>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-10 h-9 rounded border shrink-0"
              style={{ background: value || "#ffffff" }}
            />
          </PopoverTrigger>
          <PopoverContent className="p-2 w-auto">
            <HexColorPicker color={value || "#ffffff"} onChange={onChange} />
          </PopoverContent>
        </Popover>
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#hex or gradient" />
      </div>
    </div>
  );
}
