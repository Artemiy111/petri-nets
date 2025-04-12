"use client"

import { useState, useEffect } from "react"
import type { Edge } from "@xyflow/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ArcData } from "@/lib/petri-net"

interface EdgeEditDialogProps {
  edge: Edge<ArcData>
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (edgeId: string, data: Partial<ArcData>) => void
  onDelete: (edgeId: string) => void
  showLabels?: boolean
}

export default function EdgeEditDialog({
  edge,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  showLabels = true,
}: EdgeEditDialogProps) {
  const [weight, setWeight] = useState<number>(1)
  const [label, setLabel] = useState<string>("")
  const [labelPosition, setLabelPosition] = useState<"top" | "right" | "bottom" | "left">("top")

  useEffect(() => {
    if (edge) {
      setWeight(edge.data?.weight || 1)
      setLabel(edge.data?.label || "")
      setLabelPosition(edge.data?.labelPosition || "top")
    }
  }, [edge])

  const handleSave = () => {
    onUpdate(edge.id, {
      weight,
      label,
      labelPosition,
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(edge.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Edge</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right">
              Weight
            </Label>
            <Input
              id="weight"
              type="number"
              min="1"
              value={weight}
              onChange={(e) => setWeight(Number.parseInt(e.target.value) || 1)}
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
              onChange={(e) => setLabel(e.target.value)}
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
              onValueChange={(value) => setLabelPosition(value as "top" | "right" | "bottom" | "left")}
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
