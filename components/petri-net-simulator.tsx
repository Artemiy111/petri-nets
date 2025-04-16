'use client'

import type React from 'react'

import { useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type OnInit,
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
import { useToast } from '@/hooks/use-toast'
import PositionNode from './nodes/position-node'
import TransitionNode from './nodes/transition-node'
import PetriEdge from './edges/petri-edge'
import NodeEditContent from './node-edit-content'
import EdgeEditContent from './edge-edit-content'
import { usePetriNet } from '@/hooks/use-petri-net'

export default function PetriNetSimulator() {
  const { toast } = useToast()

  // Reference to the ReactFlow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Используем наш хук для работы с сетью Петри
  const petriNet = usePetriNet()

  // Settings state
  const [showLabels, setShowLabels] = useState(true)
  const [showNumbers, setShowNumbers] = useState(true)

  // Popover states
  const [nodePopoverOpen, setNodePopoverOpen] = useState(false)
  const [edgePopoverOpen, setEdgePopoverOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [selectedEdge, setSelectedEdge] = useState<any>(null)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })

  // Define node types with proper typing and pass showLabels and showNumbers
  const nodeTypes: NodeTypes = {
    position: props => (
      <PositionNode {...props} showLabels={showLabels} showNumbers={showNumbers} />
    ),
    transition: props => (
      <TransitionNode {...props} showLabels={showLabels} showNumbers={showNumbers} />
    ),
  }

  // Define edge types with proper typing and pass showLabels
  const edgeTypes: EdgeTypes = {
    petri: props => <PetriEdge {...props} showLabels={showLabels} />,
  }

  // Handle drag over for drag and drop from toolbar
  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  // Handle drop for drag and drop from toolbar
  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()

    if (!reactFlowWrapper.current || !reactFlowInstance) return

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
    const type = event.dataTransfer.getData('application/reactflow')

    // Check if the dropped element is valid
    if (!type || (type !== 'position' && type !== 'transition')) return

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    })

    // Создаем новый узел через хук
    petriNet.createNode(type as 'position' | 'transition', position)
  }

  // Handle node right click to open edit popover
  function onNodeContextMenu(event: React.MouseEvent, node: any) {
    event.preventDefault()
    setSelectedNode(node)
    setSelectedEdge(null)
    setEdgePopoverOpen(false)
    setPopoverPosition({ x: event.clientX, y: event.clientY })
    setNodePopoverOpen(true)
  }

  // Handle edge right click to open edit popover
  function onEdgeContextMenu(event: React.MouseEvent, edge: any) {
    event.preventDefault()
    setSelectedEdge(edge)
    setSelectedNode(null)
    setNodePopoverOpen(false)
    setPopoverPosition({ x: event.clientX, y: event.clientY })
    setEdgePopoverOpen(true)
  }

  // Handle keyboard events for deleting selected elements
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete') {
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

  // Handle ReactFlow initialization
  const onInit: OnInit = instance => {
    setReactFlowInstance(instance)
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

      toast({
        title: 'Model exported',
        description: 'Your Petri net model has been exported as JSON.',
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your model.',
        variant: 'destructive',
      })
    }
  }

  // Import model from file
  function handleImport() {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
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
          toast({
            title: 'Model imported',
            description: 'Your Petri net model has been successfully imported.',
          })
        } else {
          toast({
            title: 'Import failed',
            description: 'The selected file is not a valid Petri net model.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Import failed:', error)
        toast({
          title: 'Import failed',
          description: 'The selected file is not a valid Petri net model.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)

    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  // Handle save initial state
  function handleSaveInitialState() {
    const success = petriNet.saveInitialState()
    if (success) {
      toast({
        title: 'Initial state saved',
        description: 'You can now restore to this state at any time.',
      })
    }
  }

  // Handle reset to initial state
  function handleResetToInitialState() {
    const success = petriNet.resetToInitialState()
    if (success) {
      toast({
        title: 'Initial state restored',
        description: 'The model has been reset to the saved state.',
      })
    }
  }

  // Handle reset canvas
  function handleResetCanvas() {
    petriNet.resetCanvas()
    toast({
      title: 'Canvas reset',
      description: 'All elements have been removed.',
    })
  }

  // Close popovers when clicking outside
  function onPaneClick() {
    setNodePopoverOpen(false)
    setEdgePopoverOpen(false)
  }

  return (
    <div className="w-full h-screen">
      <ReactFlowProvider>
        <div className="w-full h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={petriNet.nodes}
            edges={petriNet.edges}
            onNodesChange={petriNet.onNodesChange}
            onEdgesChange={petriNet.onEdgesChange}
            onConnect={petriNet.onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneClick={onPaneClick}
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
            <Panel position="top-left" className="bg-white p-2 rounded-md shadow-md">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  draggable
                  onDragStart={event => onDragStart(event, 'position')}
                >
                  <CircleIcon className="h-4 w-4" />
                  Position
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  draggable
                  onDragStart={event => onDragStart(event, 'transition')}
                >
                  <SquareIcon className="h-4 w-4" />
                  Transition
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleResetCanvas}
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleSaveInitialState}
                  disabled={petriNet.nodes.length === 0}
                >
                  <SaveIcon className="h-4 w-4" />
                  Save State
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleResetToInitialState}
                  disabled={!petriNet.isInitialStateSaved}
                >
                  <RotateCcwIcon className="h-4 w-4" />
                  Restore State
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleExport}
                  disabled={petriNet.nodes.length === 0}
                >
                  <DownloadIcon className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleImport}
                >
                  <UploadIcon className="h-4 w-4" />
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
            <Panel position="bottom-center" className="bg-white p-2 rounded-md shadow-md mb-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
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
            <Panel position="top-right" className="mr-2 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SettingsIcon className="h-4 w-4" />
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
      </ReactFlowProvider>

      {/* Node Edit Popover */}
      {nodePopoverOpen && selectedNode && (
        <div
          className="fixed z-[9999] bg-white rounded-md shadow-lg p-4 border border-gray-200"
          style={{
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
          }}
        >
          <NodeEditContent
            node={selectedNode}
            onUpdate={petriNet.updateNodeData}
            onClose={() => setNodePopoverOpen(false)}
          />
        </div>
      )}

      {/* Edge Edit Popover */}
      {edgePopoverOpen && selectedEdge && (
        <div
          className="fixed z-[9999] bg-white rounded-md shadow-lg p-4 border border-gray-200"
          style={{
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
          }}
        >
          <EdgeEditContent
            edge={selectedEdge}
            onUpdate={petriNet.updateEdgeData}
            onClose={() => setEdgePopoverOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
