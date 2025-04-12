"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import type { PositionData } from "@/lib/petri-net"

type PositionNodeProps = NodeProps<PositionData> & {
  showLabels: boolean
  showNumbers: boolean
}

function PositionNode({ data, id, selected, showLabels, showNumbers }: PositionNodeProps) {
  const tokens = data.tokens || 0
  const label = data.label || ""
  const labelPosition = data.labelPosition || "top"
  const number = data.number !== undefined ? data.number : 0

  // Calculate label position
  const getLabelStyle = () => {
    switch (labelPosition) {
      case "top":
        return { top: "-25px", left: "50%", transform: "translateX(-50%)" }
      case "right":
        return { top: "50%", right: "-5px", transform: "translate(100%, -50%)" }
      case "bottom":
        return { bottom: "-25px", left: "50%", transform: "translateX(-50%)" }
      case "left":
        return { top: "50%", left: "-5px", transform: "translate(-100%, -50%)" }
      default:
        return { top: "-25px", left: "50%", transform: "translateX(-50%)" }
    }
  }

  return (
    <div className="relative">
      <div
        className={`relative w-16 h-16 rounded-full flex items-center justify-center bg-white border-2 ${
          selected ? "border-blue-500" : "border-gray-400"
        }`}
      >
        {/* Display token count only if greater than 0 */}
        {tokens > 0 && <div className="text-lg font-bold">{tokens}</div>}
      </div>

      {/* Display label if enabled */}
      {showLabels && label && (
        <div
          className="absolute whitespace-nowrap px-1 text-xs bg-white/80 rounded border border-gray-200"
          style={getLabelStyle()}
        >
          {label}
        </div>
      )}

      {/* Display number if enabled */}
      {showNumbers && (
        <div
          className="absolute whitespace-nowrap px-1 text-xs bg-white/80 rounded border border-gray-200"
          style={{ bottom: "-25px", left: "50%", transform: "translateX(-50%)" }}
        >
          p<sub>{number + 1}</sub>
        </div>
      )}

      {/* Connection handles on all four sides */}
      <Handle type="source" position={Position.Top} id="top" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-blue-500" />

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Right} id="right" className="w-3 h-3 bg-blue-500" />

      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-blue-500" />

      <Handle type="source" position={Position.Left} id="left" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-blue-500" />
    </div>
  )
}

export default memo(PositionNode)
