'use client'

import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

interface NodeEditDialogProps {
  node: Node<PositionData | TransitionData>
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (nodeId: string, data: Partial<PositionData | TransitionData>) => void
  onDelete: (nodeId: string) => void
  showLabels?: boolean
}

export default function NodeEditDialog({
  node,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  showLabels = true,
}: NodeEditDialogProps) {
  const [tokens, setTokens] = useState<number>(0)
  const [label, setLabel] = useState<string>('')
  const [labelPosition, setLabelPosition] = useState<'top' | 'right' | 'bottom' | 'left'>('top')

  useEffect(() => {
    if (node) {
      if (node.type === 'position') {
        setTokens((node.data as PositionData).tokens || 0)
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
    }

    onUpdate(node.id, updatedData)
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(node.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {node.type === 'position' ? 'Position' : 'Transition'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
              onValueChange={value =>
                setLabelPosition(value as 'top' | 'right' | 'bottom' | 'left')
              }
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
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
