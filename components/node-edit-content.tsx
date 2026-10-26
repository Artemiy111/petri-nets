'use client'

import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LabelPositionSelect from '@/components/label-position-select'
import type { LabelPosition, PositionData, TransitionData } from '@/lib/petri-net'

interface NodeEditContentProps {
  node: Node<PositionData | TransitionData>
  onUpdate: (nodeId: string, data: Partial<PositionData | TransitionData>) => void
  onClose: () => void
}

export default function NodeEditContent({ node, onUpdate, onClose }: NodeEditContentProps) {
  const isPosition = node.type === 'position'

  // Попап монтируется заново при каждом открытии, поэтому начальные значения берём из узла
  const [tokens, setTokens] = useState(() =>
    isPosition ? ((node.data as PositionData).tokens ?? 0) : 0,
  )
  const [delay, setDelay] = useState(() =>
    isPosition ? 0 : ((node.data as TransitionData).delay ?? 0),
  )
  const [label, setLabel] = useState(node.data.label ?? '')
  const [labelPosition, setLabelPosition] = useState<LabelPosition>(
    node.data.labelPosition ?? 'top',
  )

  const handleSave = () => {
    onUpdate(
      node.id,
      isPosition ? { tokens, label, labelPosition } : { delay, label, labelPosition },
    )
    onClose()
  }

  return (
    <div className="grid gap-4 py-2">
      <h3 className="font-medium">Edit {isPosition ? 'Position' : 'Transition'}</h3>

      {isPosition ? (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tokens" className="text-right">
            Tokens
          </Label>
          <Input
            id="tokens"
            type="number"
            min="0"
            value={tokens}
            onChange={e => setTokens(Number.parseInt(e.target.value) || 0)}
            className="col-span-3"
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="delay" className="text-right">
            Delay
          </Label>
          <Input
            id="delay"
            type="number"
            min="0"
            step="1"
            value={delay}
            onChange={e => setDelay(Math.floor(Number.parseFloat(e.target.value)) || 0)}
            className="col-span-3"
          />
        </div>
      )}

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
