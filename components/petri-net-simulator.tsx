'use client'

import type React from 'react'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
  Panel,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import {
  CircleIcon,
  SquareIcon,
  RefreshCwIcon,
  SaveIcon,
  RotateCcwIcon,
  SettingsIcon,
  DownloadIcon,
  UploadIcon,
  ClockIcon,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import PositionNode from './nodes/position-node'
import TransitionNode from './nodes/transition-node'
import PetriEdge from './edges/petri-edge'
import NodeEditContent from './node-edit-content'
import EdgeEditContent from './edge-edit-content'
import { DisplaySettingsProvider } from './display-settings'
import { usePetriNet } from '@/hooks/use-petri-net'
import { reportError } from '@/lib/monitoring'
import type { PetriEdge as PetriEdgeType, PetriNode } from '@/lib/petri-net'

type EditMenu =
  | { type: 'node'; node: PetriNode; x: number; y: number }
  | { type: 'edge'; edge: PetriEdgeType; x: number; y: number }

// Stable type maps: React Flow compares component identity on every render
const nodeTypes: NodeTypes = {
  position: PositionNode,
  transition: TransitionNode,
}

const edgeTypes: EdgeTypes = {
  petri: PetriEdge,
}

export default function PetriNetSimulator() {
  // Reference to the ReactFlow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    PetriNode,
    PetriEdgeType
  > | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Используем наш хук для работы с сетью Петри
  const petriNet = usePetriNet()

  // Settings state
  const [showLabels, setShowLabels] = useState(true)
  const [showNumbers, setShowNumbers] = useState(true)
  const displaySettings = useMemo(
    () => ({ showLabels, showNumbers }),
    [showLabels, showNumbers],
  )

  // Edit popover state
  const [editMenu, setEditMenu] = useState<EditMenu | null>(null)

  // Handle drag over for drag and drop from toolbar
  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  // Handle drop for drag and drop from toolbar
  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()

    if (!reactFlowInstance) return

    const type = event.dataTransfer.getData('application/reactflow')

    // Check if the dropped element is valid
    if (type !== 'position' && type !== 'transition') return

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    // Создаем новый узел через хук
    petriNet.createNode(type, position)
  }

  // Handle node right click to open edit popover
  function onNodeContextMenu(event: React.MouseEvent, node: PetriNode) {
    event.preventDefault()
    setEditMenu({ type: 'node', node, x: event.clientX, y: event.clientY })
  }

  // Handle edge right click to open edit popover
  function onEdgeContextMenu(event: React.MouseEvent, edge: PetriEdgeType) {
    event.preventDefault()
    setEditMenu({ type: 'edge', edge, x: event.clientX, y: event.clientY })
  }

  // Handle keyboard events for deleting selected elements
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Delete') return

    // Find selected nodes
    const selectedNodes = petriNet.nodes.filter(node => node.selected)
    if (selectedNodes.length > 0) {
      selectedNodes.forEach(node => petriNet.deleteNode(node.id))
      return
    }

    // Find selected edges
    const selectedEdges = petriNet.edges.filter(edge => edge.selected)
    if (selectedEdges.length > 0) {
      selectedEdges.forEach(edge => petriNet.deleteEdge(edge.id))
    }
  }

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [petriNet.nodes, petriNet.edges])

  // Add event listener for transition firing
  useEffect(() => {
    const handleTransitionFire = (event: CustomEvent<{ id: string }>) => {
      const { id } = event.detail
      petriNet.startTransition(id)
    }

    document.addEventListener('transitionfire', handleTransitionFire as EventListener)
    return () => {
      document.removeEventListener('transitionfire', handleTransitionFire as EventListener)
    }
  }, [petriNet])

  // Handle drag start for toolbar items
  function onDragStart(event: React.DragEvent<HTMLButtonElement>, nodeType: string) {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  // Export model to file
  function handleExport() {
    try {
      const modelJson = petriNet.exportModel()
      const blob = new Blob([modelJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = 'petri-net-model.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Model exported', {
        description: 'Your Petri net model has been exported as JSON.',
      })
    } catch (error) {
      reportError(error, { action: 'export-model' })
      toast.error('Export failed', {
        description: 'There was an error exporting your model.',
      })
    }
  }

  // Import model from file
  function handleImport() {
    fileInputRef.current?.click()
  }

  // Handle file selection
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const content = e.target?.result as string
        const success = petriNet.importModel(content)

        if (success) {
          toast.success('Model imported', {
            description: 'Your Petri net model has been successfully imported.',
          })
        } else {
          toast.error('Import failed', {
            description: 'The selected file is not a valid Petri net model.',
          })
        }
      } catch (error) {
        reportError(error, { action: 'import-model' })
        toast.error('Import failed', {
          description: 'The selected file is not a valid Petri net model.',
        })
      }
    }
    reader.readAsText(file)

    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  // Handle save initial state
  function handleSaveInitialState() {
    petriNet.saveInitialState()
    toast.success('Initial state saved', {
      description: 'You can now restore to this state at any time.',
    })
  }

  // Handle reset to initial state
  function handleResetToInitialState() {
    if (!petriNet.resetToInitialState()) return

    toast.success('Initial state restored', {
      description: 'The model has been reset to the saved state.',
    })
  }

  // Handle reset canvas
  function handleResetCanvas() {
    petriNet.resetCanvas()
    toast.success('Canvas reset', {
      description: 'All elements have been removed.',
    })
  }

  return (
    <div className="h-screen w-full">
      <ReactFlowProvider>
        <DisplaySettingsProvider value={displaySettings}>
          <div className="h-full w-full">
            <ReactFlow
              nodes={petriNet.nodes}
              edges={petriNet.edges}
              onNodesChange={petriNet.onNodesChange}
              onEdgesChange={petriNet.onEdgesChange}
              onConnect={petriNet.onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              onPaneClick={() => setEditMenu(null)}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              connectionLineStyle={{ stroke: '#000', strokeWidth: 2 }}
              defaultEdgeOptions={{
                type: 'petri',
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls />
              <Panel position="top-left" className="rounded-md bg-background p-2 shadow-md">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    draggable
                    onDragStart={event => onDragStart(event, 'position')}
                  >
                    <CircleIcon />
                    Position
                  </Button>
                  <Button
                    variant="outline"
                    draggable
                    onDragStart={event => onDragStart(event, 'transition')}
                  >
                    <SquareIcon />
                    Transition
                  </Button>
                  <Button variant="outline" onClick={handleResetCanvas}>
                    <RefreshCwIcon />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveInitialState}
                    disabled={petriNet.nodes.length === 0}
                  >
                    <SaveIcon />
                    Save State
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetToInitialState}
                    disabled={!petriNet.isInitialStateSaved}
                  >
                    <RotateCcwIcon />
                    Restore State
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={petriNet.nodes.length === 0}
                  >
                    <DownloadIcon />
                    Export
                  </Button>
                  <Button variant="outline" onClick={handleImport}>
                    <UploadIcon />
                    Import
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </Panel>

              {/* Timer Panel */}
              <Panel position="bottom-center" className="mb-2 rounded-md bg-background p-2 shadow-md">
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-4" />
                  <span className="font-mono text-lg">Time: {petriNet.time} u.t.</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={petriNet.incrementTime}>
                      +1
                    </Button>
                    <Button variant="outline" size="sm" onClick={petriNet.resetTimer}>
                      Reset
                    </Button>
                  </div>
                </div>
              </Panel>

              {/* Settings Panel */}
              <Panel position="top-right" className="mt-2 mr-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <SettingsIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60">
                    <div className="flex flex-col gap-4">
                      <h3 className="font-medium">Display Settings</h3>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-labels">Show Labels</Label>
                        <Switch
                          id="show-labels"
                          checked={showLabels}
                          onCheckedChange={setShowLabels}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-numbers">Show Numbers</Label>
                        <Switch
                          id="show-numbers"
                          checked={showNumbers}
                          onCheckedChange={setShowNumbers}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Panel>
            </ReactFlow>
          </div>
        </DisplaySettingsProvider>
      </ReactFlowProvider>

      {/* Edit Popover for the node or edge selected with the right mouse button */}
      {editMenu && (
        <div
          className="fixed z-50 min-w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg"
          style={{ left: `${editMenu.x}px`, top: `${editMenu.y}px` }}
        >
          {editMenu.type === 'node' ? (
            <NodeEditContent
              node={editMenu.node}
              onUpdate={petriNet.updateNodeData}
              onClose={() => setEditMenu(null)}
            />
          ) : (
            <EdgeEditContent
              edge={editMenu.edge}
              onUpdate={petriNet.updateEdgeData}
              onClose={() => setEditMenu(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
