'use client'

import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PositionData, TransitionData } from '@/lib/petri-net'

interface NodeEditContentProps {
  node: Node<PositionData | TransitionData>
  onUpdate: (nodeId: string, data: Partial<PositionData | TransitionData>) => void
  onClose: () => void
}

export default function NodeEditContent({ node, onUpdate, onClose }: NodeEditContentProps) {
  const [tokens, setTokens] = useState<number>(0)
  const [delay, setDelay] = useState<number>(0)
  const [label, setLabel] = useState<string>('')
  const [labelPosition, setLabelPosition] = useState<'top' | 'right' | 'bottom' | 'left'>('top')

  // Initialize local state from node data
  useEffect(() => {
    if (node) {
      if (node.type === 'position') {
        setTokens((node.data as PositionData).tokens || 0)
      } else if (node.type === 'transition') {
        setDelay((node.data as TransitionData).delay || 0)
      }
      setLabel(node.data.label || '')
      setLabelPosition(node.data.labelPosition || 'top')
    }
  }, [node])

  const handleSave = () => {
    const updatedData: Partial<PositionData | TransitionData> = {
      label,
      labelPosition,
    }

    if (node.type === 'position') {
      updatedData.tokens = tokens
    } else if (node.type === 'transition') {
      updatedData.delay = delay
    }

    onUpdate(node.id, updatedData)
    onClose()
  }

  return (
    <div className="grid gap-4 py-2">
      <h3 className="font-medium">Edit {node.type === 'position' ? 'Position' : 'Transition'}</h3>

      {node.type === 'position' && (
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
      )}

      {node.type === 'transition' && (
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

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="labelPosition" className="text-right">
          Label Position
        </Label>
        <Select
          value={labelPosition}
          onValueChange={value => setLabelPosition(value as 'top' | 'right' | 'bottom' | 'left')}
        >
          <SelectTrigger id="labelPosition" className="col-span-3">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
            <SelectItem value="left">Left</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end mt-2">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  )
}
