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

export type PetriNode = Node<PositionData | TransitionData>
export type PetriNodePosition = Node<PositionData>
export type PetriNodeTransition = Node<TransitionData>

export function usePetriNet() {
  // Состояние узлов и рёбер с правильной типизацией
  const [nodes, setNodes, onNodesChange] = useNodesState<PetriNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ArcData>>([])

  // Состояние таймера
  const [time, setTime] = useState(0)

  // Начальное состояние для сброса
  const [initialNodes, setInitialNodes] = useState<Node<PositionData | TransitionData>[]>([])
  const [initialEdges, setInitialEdges] = useState<Edge<ArcData>[]>([])
  const [isInitialStateSaved, setIsInitialStateSaved] = useState(false)

  // Счётчик узлов для уникальных ID
  const nodeIdCounter = useRef(0)

  // Ref, отслеживающий, происходит ли сейчас обновление
  const isUpdatingRef = useRef(false)

  // Функции таймера
  const incrementTime = () => {
    setTime((prevTime) => prevTime + 1)
  }

  const resetTimer = () => {
    setTime(0)
  }

  // Пересчёт номеров узлов на основе их типа и позиции в массиве
  const recalculateNodeNumbers = (nodeArray: Node<PositionData | TransitionData>[]) => {
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
  }

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

  // Сохраняем начальное состояние
  const saveInitialState = useCallback(() => {
    // Глубокое клонирование узлов и рёбер для предотвращения проблем с ссылками
    const clonedNodes = JSON.parse(JSON.stringify(nodes))
    const clonedEdges = JSON.parse(JSON.stringify(edges))

    setInitialNodes(clonedNodes)
    setInitialEdges(clonedEdges)
    setIsInitialStateSaved(true)

    return true // Возвращаем true для подтверждения успешного сохранения
  }, [nodes, edges])

  // Сброс к начальному состоянию
  const resetToInitialState = () => {
    if (isInitialStateSaved) {
      // Глубокое клонирование для предотвращения проблем с ссылками
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
  }

  // Обновляем состояния переходов при изменении меток или рёбер
  useEffect(() => {
    // Предотвращаем бесконечные циклы обновления
    if (!isUpdatingRef.current) {
      isUpdatingRef.current = true

      // Используем setTimeout, чтобы разорвать синхронный цикл обновлений
      // Создаём новый массив для обновлённых узлов
      const updatedNodes = nodes.map((someNode) => {
        if (someNode.type !== "transition") return someNode
        const node = someNode as PetriNodeTransition
        // Если переход уже в состоянии ожидания и метки уже забраны, не меняем его состояние
        if (node.data.waiting && node.data.tokensRemoved) return node

        // Находим входящие рёбра (из позиций в этот переход)
        const inputEdges = edges.filter(
          (edge) => edge.target === node.id && nodes.find((n) => n.id === edge.source)?.type === "position",
        )

        // Проверяем, может ли переход сработать (все входные позиции содержат достаточно меток)
        const canFire = inputEdges.every((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source)
          if (!sourceNode || sourceNode.type !== "position") return false

          const requiredTokens = edge.data?.weight || 1
          return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
        })

        // Обрабатываем активацию перехода и состояние ожидания
        const currentData = node.data as TransitionData

        // Если переход только что стал активным
        if (canFire && !currentData.canFire) {
          return {
            ...node,
            data: {
              ...currentData,
              canFire: true,
            },
          }
        }

        // Если переход больше не активен и не находится в состоянии ожидания
        if (!canFire && currentData.canFire && !currentData.waiting) {
          return {
            ...node,
            data: {
              ...currentData,
              canFire: false,
            },
          }
        }

        // Если переход больше не активен, но находится в состоянии ожидания и метки уже забраны
        // Это не должно происходить в нормальной ситуации, но обработаем на всякий случай
        if (!canFire && currentData.waiting && currentData.tokensRemoved) {
          return node
        }

        return node
      })

      // Обновляем состояние, только если есть изменения
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
    }
  }, [nodes, edges, time, setNodes])

  // Проверка переходов, которые должны сработать с учётом задержки
  useEffect(() => {
    // Находим переходы, находящиеся в ожидании, и проверяем, пора ли им сработать
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

    // Завершаем переходы, которые достаточно подождали
    if (transitionsToComplete.length > 0) {
      transitionsToComplete.forEach((id) => {
        completeTransition(id)
      })
    }
  }, [time, nodes])

  // Обработка соединения между узлами
  const onConnect = useCallback(
    (params: Connection) => {
      // Проверяем допустимость соединения (позиция -> переход или наоборот)
      const sourceNode = nodes.find((node) => node.id === params.source)
      const targetNode = nodes.find((node) => node.id === params.target)

      if (!sourceNode || !targetNode) return

      // Убеждаемся, что направление соединения верное
      const isValid =
        (sourceNode.type === "position" && targetNode.type === "transition") ||
        (sourceNode.type === "transition" && targetNode.type === "position")

      if (!isValid) return

      // Добавляем ребро с весом по умолчанию = 1
      // Ребро всегда направлено по потоку
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
