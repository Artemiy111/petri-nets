'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LabelPosition } from '@/lib/petri-net'

const POSITIONS: LabelPosition[] = ['top', 'right', 'bottom', 'left']

interface LabelPositionSelectProps {
  value: LabelPosition
  onChange: (value: LabelPosition) => void
}

export default function LabelPositionSelect({ value, onChange }: LabelPositionSelectProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="labelPosition" className="text-right">
        Label Position
      </Label>
      <Select value={value} onValueChange={position => onChange(position as LabelPosition)}>
        <SelectTrigger id="labelPosition" className="col-span-3 w-full">
          <SelectValue placeholder="Select position" />
        </SelectTrigger>
        <SelectContent>
          {POSITIONS.map(position => (
            <SelectItem key={position} value={position} className="capitalize">
              {position}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
