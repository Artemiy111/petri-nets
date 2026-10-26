'use client'

import { useState } from 'react'
import type { Edge } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LabelPositionSelect from '@/components/label-position-select'
import type { ArcData, LabelPosition } from '@/lib/petri-net'

interface EdgeEditContentProps {
  edge: Edge<ArcData>
  onUpdate: (edgeId: string, data: Partial<ArcData>) => void
  onClose: () => void
}

export default function EdgeEditContent({ edge, onUpdate, onClose }: EdgeEditContentProps) {
  // Попап монтируется заново при каждом открытии, поэтому начальные значения берём из ребра
  const [weight, setWeight] = useState(edge.data?.weight ?? 1)
  const [label, setLabel] = useState(edge.data?.label ?? '')
  const [labelPosition, setLabelPosition] = useState<LabelPosition>(
    edge.data?.labelPosition ?? 'top',
  )

  const handleSave = () => {
    onUpdate(edge.id, { weight, label, labelPosition })
    onClose()
  }

  return (
    <div className="grid gap-4 py-2">
      <h3 className="font-medium">Edit Edge</h3>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="weight" className="text-right">
          Weight
        </Label>
        <Input
          id="weight"
          type="number"
          min="1"
          value={weight}
          onChange={e => setWeight(Number.parseInt(e.target.value) || 1)}
          className="col-span-3"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="label" className="text-right">
          Label
        </Label>
        <Input
          id="label"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="col-span-3"
          placeholder="Enter label"
        />
      </div>

      <LabelPositionSelect value={labelPosition} onChange={setLabelPosition} />

      <div className="flex justify-end mt-2">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}
