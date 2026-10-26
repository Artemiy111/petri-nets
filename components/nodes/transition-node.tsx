'use client'

import type React from 'react'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { PetriNodeTransition } from '@/lib/petri-net'
import { useDisplaySettings } from '@/components/display-settings'
import { NodeHandles, NodeLabel, NodeNumber } from './node-chrome'

function TransitionNode({ data, id, selected }: NodeProps<PetriNodeTransition>) {
  const { showLabels, showNumbers } = useDisplaySettings()
  const isFiring = data.firing || false
  const canFire = data.canFire || false
  const isWaiting = data.waiting || false
  const tokensRemoved = data.tokensRemoved || false
  const delay = data.delay || 0
  const label = data.label || ''
  const labelPosition = data.labelPosition || 'top'
  const number = data.number !== undefined ? data.number : 0

  const handleClick = (event: React.MouseEvent) => {
    // Только если переход может сработать, отправляем событие
    if (canFire && !isWaiting) {
      event.currentTarget.dispatchEvent(
        new CustomEvent('transitionfire', {
          detail: { id },
          bubbles: true,
        }),
      )
    }
  }

  // Determine background color based on state
  const getBackgroundColor = () => {
    if (isFiring) return 'bg-orange-300'
    if (isWaiting) return 'bg-yellow-300'
    if (canFire) return 'bg-green-300'
    return 'bg-white'
  }

  return (
    <div className="relative">
      <div
        className={`relative flex size-16 items-center justify-center border-2 transition-colors ${
          selected ? 'border-blue-500' : 'border-gray-400'
        } ${getBackgroundColor()} ${canFire && !isWaiting ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={handleClick}
      >
        {/* Display delay if greater than 0 */}
        {delay > 0 && (
          <div className="absolute top-1 right-1 rounded bg-white/80 px-1 text-xs font-semibold">
            τ={delay}
          </div>
        )}

        {/* Индикатор состояния "метки забраны" */}
        {tokensRemoved && (
          <div className="absolute bottom-1 left-1 rounded bg-white/80 px-1 text-xs font-semibold">
            ⏳
          </div>
        )}
      </div>

      {showLabels && label && <NodeLabel label={label} labelPosition={labelPosition} />}

      {showNumbers && <NodeNumber prefix="t" number={number} />}

      <NodeHandles />
    </div>
  )
}

export default memo(TransitionNode)
