'use client'

import type React from 'react'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { PetriNodeTransition } from '@/hooks/use-petri-net'

export type TransitionNodeProps = NodeProps<PetriNodeTransition> & {
  showLabels: boolean
  showNumbers: boolean
}

function TransitionNode({ data, id, selected, showLabels, showNumbers }: TransitionNodeProps) {
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
      // Create and dispatch a custom event
      const customEvent = new CustomEvent('transitionfire', {
        detail: { id },
        bubbles: true,
      })
      event.currentTarget.dispatchEvent(customEvent)
    }
  }

  // Calculate label position
  const getLabelStyle = () => {
    switch (labelPosition) {
      case 'top':
        return { top: '-25px', left: '50%', transform: 'translateX(-50%)' }
      case 'right':
        return { top: '50%', right: '-5px', transform: 'translate(100%, -50%)' }
      case 'bottom':
        return { bottom: '-25px', left: '50%', transform: 'translateX(-50%)' }
      case 'left':
        return { top: '50%', left: '-5px', transform: 'translate(-100%, -50%)' }
      default:
        return { top: '-25px', left: '50%', transform: 'translateX(-50%)' }
    }
  }

  // Determine background color based on state
  const getBackgroundColor = () => {
    if (isFiring) return 'bg-orange-300'
    if (isWaiting) return 'bg-yellow-300'
    if (canFire) return 'bg-green-300'
    return 'bg-white'
  }

  // Добавим визуальный индикатор доступности перехода
  return (
    <div className="relative">
      <div
        className={`relative w-16 h-16 flex items-center justify-center border-2 ${
          selected ? 'border-blue-500' : 'border-gray-400'
        } ${getBackgroundColor()} ${
          canFire && !isWaiting ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
        style={{ transition: 'background-color 0.15s ease' }}
        onClick={handleClick}
      >
        {/* Display delay if greater than 0 */}
        {delay > 0 && (
          <div className="absolute top-1 right-1 text-xs font-semibold bg-white/80 px-1 rounded">
            τ={delay}
          </div>
        )}

        {/* Индикатор состояния "метки забраны" */}
        {tokensRemoved && (
          <div className="absolute bottom-1 left-1 text-xs font-semibold bg-white/80 px-1 rounded">
            ⏳
          </div>
        )}
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
          style={{ bottom: '-25px', left: '50%', transform: 'translateX(-50%)' }}
        >
          t<sub>{number + 1}</sub>
        </div>
      )}

      {/* Connection handles on all four sides */}
      <Handle type="source" position={Position.Top} id="top" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-blue-500" />

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Right} id="right" className="w-3 h-3 bg-blue-500" />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 bg-blue-500"
      />

      <Handle type="source" position={Position.Left} id="left" className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-blue-500" />
    </div>
  )
}

export default memo(TransitionNode)
