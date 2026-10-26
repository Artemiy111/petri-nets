'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { PetriNodePosition } from '@/lib/petri-net'
import { NodeHandles, NodeLabel, NodeNumber } from './node-chrome'

type PositionNodeProps = NodeProps<PetriNodePosition> & {
  showLabels: boolean
  showNumbers: boolean
}

function PositionNode({ data, selected, showLabels, showNumbers }: PositionNodeProps) {
  const tokens = data.tokens || 0
  const label = data.label || ''
  const labelPosition = data.labelPosition || 'top'
  const number = data.number !== undefined ? data.number : 0

  return (
    <div className="relative">
      <div
        className={`relative flex size-16 items-center justify-center rounded-full border-2 bg-white ${
          selected ? 'border-blue-500' : 'border-gray-400'
        }`}
      >
        {/* Display token count only if greater than 0 */}
        {tokens > 0 && <div className="text-lg font-bold">{tokens}</div>}
      </div>

      {showLabels && label && <NodeLabel label={label} labelPosition={labelPosition} />}

      {showNumbers && <NodeNumber prefix="p" number={number} />}

      <NodeHandles />
    </div>
  )
}

export default memo(PositionNode)
