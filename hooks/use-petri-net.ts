"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { type Connection, type Edge, type Node, addEdge, useNodesState, useEdgesState, MarkerType } from "@xyflow/react"
import {
  type PositionData,
  type TransitionData,
  type ArcData,
  exportModel as exportModelUtil,
  importModel as importModelUtil,
  canTransitionFire,
  removeTokensFromInputs,
  addTokensToOutputs,
} from "@/lib/petri-net"

export function usePetriNet() {
  // Nodes and edges state with proper typing
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PositionData | TransitionData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArcData>>([])

  // Timer state
  const [time, setTime] = useState(0)

  // Initial state for reset functionality
  const [initialNodes, setInitialNodes] = useState<Node<PositionData | TransitionData>[]>([])
  const [initialEdges, setInitialEdges] = useState<Edge<ArcData>[]>([])
  const [isInitialStateSaved, setIsInitialStateSaved] = useState(false)

  // Node counter for unique IDs
  const nodeIdCounter = useRef(0)

  // Use a ref to track if we're in the middle of an update
  const isUpdatingRef = useRef(false)

  // Timer functions
  const incrementTime = useCallback(() => {
    setTime((prevTime) => prevTime + 1)
  }, [])

  const resetTimer = useCallback(() => {
    setTime(0)
  }, [])

  // Recalculate node numbers based on their type and position in the array
  const recalculateNodeNumbers = useCallback((nodeArray: Node<PositionData | TransitionData>[]) => {
    let positionIndex = 0
    let transitionIndex = 0

    return nodeArray.map((node) => {
      if (node.type === "position") {
        const newData = {
          ...node.data,
          number: positionIndex++,
        }
        return { ...node, data: newData }
      } else if (node.type === "transition") {
        const newData = {
          ...node.data,
          number: transitionIndex++,
        }
        return { ...node, data: newData }
      }
      return node
    })
  }, [])

  // Обновляем номера узлов при изменении массива узлов
  useEffect(() => {
    if (nodes.length > 0) {
      const updatedNodes = recalculateNodeNumbers([...nodes])
      // Проверяем, изменились ли номера
      const hasChanges = updatedNodes.some((newNode, index) => {
        if (index >= nodes.length) return false
        return newNode.data.number !== nodes[index].data.number
      })

      if (hasChanges) {
        setNodes(updatedNodes)
      }
    }
  }, [nodes, recalculateNodeNumbers, setNodes])

  // Save initial state
  const saveInitialState = useCallback(() => {
    // Deep clone nodes and edges to avoid reference issues
    const clonedNodes = JSON.parse(JSON.stringify(nodes))
    const clonedEdges = JSON.parse(JSON.stringify(edges))

    setInitialNodes(clonedNodes)
    setInitialEdges(clonedEdges)
    setIsInitialStateSaved(true)

    return true // Возвращаем true для подтверждения успешного сохранения
  }, [nodes, edges])

  // Reset to initial state
  const resetToInitialState = useCallback(() => {
    if (isInitialStateSaved) {
      // Deep clone to avoid reference issues
      const clonedNodes = JSON.parse(JSON.stringify(initialNodes))
      const clonedEdges = JSON.parse(JSON.stringify(initialEdges))

      // Пересчитываем номера узлов
      const updatedNodes = recalculateNodeNumbers(clonedNodes)

      setNodes(updatedNodes)
      setEdges(clonedEdges)
      resetTimer()

      return true // Возвращаем true для подтверждения успешного восстановления
    }
    return false
  }, [isInitialStateSaved, initialNodes, initialEdges, recalculateNodeNumbers, setNodes, setEdges, resetTimer])

  // Update transition states when tokens or edges change
  useEffect(() => {
    // Prevent infinite loops by checking if we're already updating
    if (!isUpdatingRef.current) {
      isUpdatingRef.current = true

      // Use setTimeout to break the synchronous update cycle
      setTimeout(() => {
        // Create a new array to track which transitions need updates
        const updatedNodes = nodes.map((node) => {
          if (node.type !== "transition") return node

          // Если переход уже в состоянии ожидания и метки уже забраны, не меняем его состояние
          if (node.data.waiting && node.data.tokensRemoved) return node

          // Find input edges (from positions to this transition)
          const inputEdges = edges.filter(
            (edge) => edge.target === node.id && nodes.find((n) => n.id === edge.source)?.type === "position",
          )

          // Check if transition can fire (all input positions have enough tokens)
          const canFire = inputEdges.every((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            if (!sourceNode || sourceNode.type !== "position") return false

            const requiredTokens = edge.data?.weight || 1
            return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
          })

          // Handle transition activation and waiting state
          const currentData = node.data as TransitionData

          // If transition just became enabled
          if (canFire && !currentData.canFire) {
            return {
              ...node,
              data: {
                ...currentData,
                canFire: true,
              },
            }
          }

          // If transition is no longer enabled and not in waiting state
          if (!canFire && currentData.canFire && !currentData.waiting) {
            return {
              ...node,
              data: {
                ...currentData,
                canFire: false,
              },
            }
          }

          // If transition is no longer enabled but in waiting state with tokens removed
          // This shouldn't happen in normal operation, but handle it just in case
          if (!canFire && currentData.waiting && currentData.tokensRemoved) {
            // Transition stays in waiting state until it completes
            return node
          }

          return node
        })

        // Only update state if there were actual changes
        const hasChanges = updatedNodes.some((newNode, index) => {
          if (index >= nodes.length) return false
          const oldData = nodes[index].data
          const newData = newNode.data
          return (
            newData.canFire !== oldData.canFire ||
            newData.waiting !== oldData.waiting ||
            newData.activationTime !== oldData.activationTime ||
            newData.tokensRemoved !== oldData.tokensRemoved
          )
        })

        if (hasChanges) {
          setNodes(updatedNodes)
        }

        isUpdatingRef.current = false
      }, 0)
    }
  }, [nodes, edges, time, setNodes])

  // Check for transitions that should fire based on their delay
  useEffect(() => {
    // Find transitions that are waiting and check if they should fire
    const transitionsToComplete: string[] = []

    nodes.forEach((node) => {
      if (node.type === "transition") {
        const data = node.data as TransitionData
        if (data.waiting && data.tokensRemoved && data.activationTime !== undefined) {
          const delay = data.delay || 0
          if (time >= data.activationTime + delay) {
            transitionsToComplete.push(node.id)
          }
        }
      }
    })

    // Complete transitions that have waited long enough
    if (transitionsToComplete.length > 0) {
      transitionsToComplete.forEach((id) => {
        completeTransition(id)
      })
    }
  }, [time, nodes])

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      // Check if connection is valid (position to transition or transition to position)
      const sourceNode = nodes.find((node) => node.id === params.source)
      const targetNode = nodes.find((node) => node.id === params.target)

      if (!sourceNode || !targetNode) return

      // Ensure correct direction: position -> transition or transition -> position
      const isValid =
        (sourceNode.type === "position" && targetNode.type === "transition") ||
        (sourceNode.type === "transition" && targetNode.type === "position")

      if (!isValid) return

      // Add edge with default weight of 1
      // The edge should always point in the direction of the flow
      setEdges((eds) =>
        addEdge<Edge<ArcData>>(
          {
            ...params,
            type: "petri",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
              weight: 1,
              label: "",
              labelPosition: "top",
            },
          },
          eds,
        ),
      )
    },
    [nodes, setEdges],
  )

  // Create a new node
  const createNode = useCallback(
    (type: "position" | "transition", position: { x: number; y: number }) => {
      // Create the appropriate node based on type
      let newNode: Node<PositionData | TransitionData>
      if (type === "position") {
        newNode = {
          id: `${type}-${nodeIdCounter.current++}`,
          type,
          position,
          data: {
            tokens: 0,
            label: "",
            labelPosition: "top",
          },
        }
      } else {
        newNode = {
          id: `${type}-${nodeIdCounter.current++}`,
          type,
          position,
          data: {
            firing: false,
            canFire: false,
            waiting: false,
            delay: 0,
            label: "",
            labelPosition: "top",
            tokensRemoved: false,
            number: 0, // Будет пересчитано
          },
        }
      }

      // Добавляем новый узел и пересчитываем номера
      const updatedNodes = recalculateNodeNumbers([...nodes, newNode])
      setNodes(updatedNodes)
      return newNode
    },
    [nodes, recalculateNodeNumbers, setNodes],
  )

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<PositionData | TransitionData>) => {
      setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)))
    },
    [setNodes],
  )

  // Update edge data
  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<ArcData>) => {
      setEdges((eds) => eds.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge)))
    },
    [setEdges],
  )

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const filteredNodes = nds.filter((node) => node.id !== nodeId)
        // Пересчитываем номера узлов
        return recalculateNodeNumbers(filteredNodes)
      })

      // Also delete connected edges
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      return true
    },
    [recalculateNodeNumbers, setNodes, setEdges],
  )

  // Delete edge
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
      return true
    },
    [setEdges],
  )

  // Reset the canvas
  const resetCanvas = useCallback(() => {
    setNodes([])
    setEdges([])
    nodeIdCounter.current = 0
    setIsInitialStateSaved(false)
    resetTimer()
    return true
  }, [setNodes, setEdges, resetTimer])

  // Начало активации перехода - забираем метки из входных позиций
  const startTransition = useCallback(
    (transitionId: string) => {
      // Проверим, может ли переход сработать
      if (!canTransitionFire(transitionId, nodes, edges)) {
        return false
      }

      // Find the transition node
      const transitionNode = nodes.find((node) => node.id === transitionId)
      if (!transitionNode || transitionNode.type !== "transition") return false

      const transitionData = transitionNode.data as TransitionData
      const delay = transitionData.delay || 0

      // Сразу забираем метки из входных позиций
      const updatedNodes = removeTokensFromInputs(transitionId, nodes, edges)

      // Если есть задержка, устанавливаем состояние ожидания
      if (delay > 0) {
        setNodes(
          updatedNodes.map((node) => {
            if (node.id === transitionId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  waiting: true,
                  activationTime: time,
                  tokensRemoved: true,
                },
              }
            }
            return node
          }),
        )
      } else {
        // Если задержки нет, сразу завершаем переход
        completeTransition(transitionId, updatedNodes)
      }

      return true
    },
    [nodes, edges, time, setNodes],
  )

  // Завершение активации перехода - добавляем метки в выходные позиции
  const completeTransition = useCallback(
    (transitionId: string, currentNodes = nodes) => {
      // Добавляем метки в выходные позиции
      const updatedNodes = addTokensToOutputs(transitionId, currentNodes, edges)

      // Обновляем состояние перехода
      setNodes(
        updatedNodes.map((node) => {
          if (node.id === transitionId) {
            return {
              ...node,
              data: {
                ...node.data,
                firing: true,
                waiting: false,
                activationTime: undefined,
                tokensRemoved: false,
              },
            }
          }
          return node
        }),
      )

      // Убираем подсветку после анимации
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((node) => (node.id === transitionId ? { ...node, data: { ...node.data, firing: false } } : node)),
        )
      }, 150)

      return true
    },
    [nodes, edges, setNodes],
  )

  // Export model to JSON
  const exportModel = useCallback(() => {
    return exportModelUtil(nodes, edges)
  }, [nodes, edges])

  // Import model from JSON
  const importModel = useCallback(
    (json: string) => {
      try {
        const { nodes: importedNodes, edges: importedEdges } = importModelUtil(json)

        // Добавим поле tokensRemoved, если его нет (для обратной совместимости)
        const updatedNodes = importedNodes.map((node) => {
          if (node.type === "transition" && !("tokensRemoved" in node.data)) {
            return {
              ...node,
              data: {
                ...node.data,
                tokensRemoved: false,
              },
            }
          }
          return node
        })

        // Find the highest node ID to update the counter
        const highestId = updatedNodes.reduce((max, node) => {
          const idNum = Number.parseInt(node.id.split("-")[1] || "0")
          return Math.max(max, idNum)
        }, -1)

        nodeIdCounter.current = highestId + 1

        // Пересчитываем номера узлов
        const nodesWithNumbers = recalculateNodeNumbers(updatedNodes)
        setNodes(nodesWithNumbers)
        setEdges(importedEdges)

        return true
      } catch (error) {
        console.error("Import failed:", error)
        return false
      }
    },
    [recalculateNodeNumbers, setNodes, setEdges],
  )

  return {
    // State
    nodes,
    edges,
    time,
    isInitialStateSaved,

    // Event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Node and edge operations
    createNode,
    updateNodeData,
    updateEdgeData,
    deleteNode,
    deleteEdge,

    // Transition operations
    startTransition,
    completeTransition,

    // Timer operations
    incrementTime,
    resetTimer,

    // Model operations
    saveInitialState,
    resetToInitialState,
    resetCanvas,
    exportModel,
    importModel,
  }
}
