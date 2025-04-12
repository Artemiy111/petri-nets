"use client"

import { memo } from "react"
import { type EdgeProps, getBezierPath } from "@xyflow/react"
import type { ArcData } from "@/lib/petri-net"

type PetriEdgeProps = EdgeProps<ArcData> & {
  showLabels: boolean
}

function PetriEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
  showLabels,
}: PetriEdgeProps) {
  const weight = data?.weight || 1
  const label = data?.label || ""
  const labelPosition = data?.labelPosition || "top"
  const isWeightGreaterThanOne = weight > 1

  // Calculate the bezier path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Calculate label offset based on position
  const getLabelOffset = () => {
    switch (labelPosition) {
      case "top":
        return { x: 0, y: -10 }
      case "right":
        return { x: 10, y: 0 }
      case "bottom":
        return { x: 0, y: 10 }
      case "left":
        return { x: -10, y: 0 }
      default:
        return { x: 0, y: -10 }
    }
  }

  const labelOffset = getLabelOffset()

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: isWeightGreaterThanOne ? 3 : selected ? 2 : 1.5,
          stroke: selected ? "#3b82f6" : "#000",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Display the weight of the edge only if greater than 1 */}
      {isWeightGreaterThanOne && (
        <foreignObject width={40} height={40} x={labelX - 20} y={labelY - 20} className="overflow-visible">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white px-2 py-1 rounded-full text-xs border border-gray-300">{weight}</div>
          </div>
        </foreignObject>
      )}

      {/* Display label if enabled */}
      {showLabels && label && (
        <foreignObject
          width={200}
          height={40}
          x={labelX - 100 + labelOffset.x}
          y={labelY - 20 + labelOffset.y}
          className="overflow-visible"
        >
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 px-2 py-1 rounded text-xs border border-gray-200 whitespace-nowrap">
              {label}
            </div>
          </div>
        </foreignObject>
      )}
    </>
  )
}

export default memo(PetriEdge)
