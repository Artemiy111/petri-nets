import type { Node, Edge } from "@xyflow/react"

// Define proper types for the Petri net elements
export type PositionData = {
  tokens: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
  number?: number
}

// Обновим тип TransitionData, добавив поля для задержки и времени активации
export type TransitionData = {
  firing: boolean
  canFire: boolean
  waiting: boolean
  delay: number
  activationTime?: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
  number: number
  // Добавим новое поле для отслеживания состояния "метки забраны, но еще не добавлены"
  tokensRemoved: boolean
}

export type ArcData = {
  weight: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
}

export type PetriNetModel = {
  nodes: Node<PositionData | TransitionData>[]
  edges: Edge<ArcData>[]
}

// Проверка, может ли переход сработать
export function canTransitionFire(
  transitionId: string,
  nodes: Node<PositionData | TransitionData>[],
  edges: Edge<ArcData>[],
): boolean {
  // Найдем переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return false

  // Найдем входящие дуги (от позиций к этому переходу)
  const inputEdges = edges.filter(
    (edge) => edge.target === transitionId && nodes.find((n) => n.id === edge.source)?.type === "position",
  )

  // Проверим, может ли переход сработать (все входные позиции имеют достаточно токенов)
  return inputEdges.every((edge) => {
    const sourceNode = nodes.find((node) => node.id === edge.source)
    if (!sourceNode || sourceNode.type !== "position") return false

    const requiredTokens = edge.data?.weight || 1
    return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
  })
}

// Check which transitions can fire
export function updateTransitionStates(
  nodes: Node<PositionData | TransitionData>[],
  edges: Edge<ArcData>[],
): Node<PositionData | TransitionData>[] {
  // Create a new array to track which transitions need updates
  const updatedNodes = nodes.map((node) => {
    if (node.type !== "transition") return node

    // Если переход уже в состоянии ожидания и метки уже забраны, не меняем его состояние
    if (node.data.waiting && node.data.tokensRemoved) return node

    // Find input edges (from positions to this transition)
    const inputEdges = edges.filter((edge) => edge.target === node.id)

    // Check if transition can fire (all input positions have enough tokens)
    const canFire = inputEdges.every((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      if (!sourceNode || sourceNode.type !== "position") return false

      const requiredTokens = edge.data?.weight || 1
      return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
    })

    // Only update if the canFire state has changed
    if (canFire !== node.data.canFire) {
      return {
        ...node,
        data: {
          ...node.data,
          canFire,
          // Если переход больше не может сработать и не в состоянии ожидания, сбросим все флаги
          waiting: node.data.waiting && canFire ? node.data.waiting : false,
          activationTime: node.data.waiting && canFire ? node.data.activationTime : undefined,
          tokensRemoved: node.data.waiting && canFire ? node.data.tokensRemoved : false,
        },
      }
    }

    return node
  })

  return updatedNodes
}

// Функция для удаления меток из входных позиций
export function removeTokensFromInputs(
  transitionId: string,
  nodes: Node<PositionData | TransitionData>[],
  edges: Edge<ArcData>[],
): Node<PositionData | TransitionData>[] {
  // Найдем переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Найдем входящие дуги (от позиций к этому переходу)
  const inputEdges = edges.filter(
    (edge) => edge.target === transitionId && nodes.find((n) => n.id === edge.source)?.type === "position",
  )

  // Удалим метки из входных позиций
  const updatedNodes = [...nodes]

  inputEdges.forEach((edge) => {
    const sourceNodeIndex = updatedNodes.findIndex((node) => node.id === edge.source)
    if (sourceNodeIndex === -1) return

    const weight = edge.data?.weight || 1
    const nodeData = updatedNodes[sourceNodeIndex].data as PositionData
    updatedNodes[sourceNodeIndex] = {
      ...updatedNodes[sourceNodeIndex],
      data: {
        ...nodeData,
        tokens: (nodeData.tokens || 0) - weight,
      },
    }
  })

  // Отметим переход как "метки забраны"
  const nodeIndex = updatedNodes.findIndex((node) => node.id === transitionId)
  if (nodeIndex !== -1) {
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      data: {
        ...updatedNodes[nodeIndex].data,
        tokensRemoved: true,
      },
    }
  }

  return updatedNodes
}

// Функция для добавления меток в выходные позиции
export function addTokensToOutputs(
  transitionId: string,
  nodes: Node<PositionData | TransitionData>[],
  edges: Edge<ArcData>[],
): Node<PositionData | TransitionData>[] {
  // Найдем переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Найдем выходящие дуги (от этого перехода к позициям)
  const outputEdges = edges.filter(
    (edge) => edge.source === transitionId && nodes.find((n) => n.id === edge.target)?.type === "position",
  )

  // Добавим метки в выходные позиции
  const updatedNodes = [...nodes]

  outputEdges.forEach((edge) => {
    const targetNodeIndex = updatedNodes.findIndex((node) => node.id === edge.target)
    if (targetNodeIndex === -1) return

    const weight = edge.data?.weight || 1
    const nodeData = updatedNodes[targetNodeIndex].data as PositionData
    updatedNodes[targetNodeIndex] = {
      ...updatedNodes[targetNodeIndex],
      data: {
        ...nodeData,
        tokens: (nodeData.tokens || 0) + weight,
      },
    }
  })

  // Сбросим состояние перехода
  const nodeIndex = updatedNodes.findIndex((node) => node.id === transitionId)
  if (nodeIndex !== -1) {
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      data: {
        ...updatedNodes[nodeIndex].data,
        firing: true,
        waiting: false,
        activationTime: undefined,
        tokensRemoved: false,
      },
    }
  }

  return updatedNodes
}

// Fire a transition
export function fireTransition(
  transitionId: string,
  nodes: Node<PositionData | TransitionData>[],
  edges: Edge<ArcData>[],
): Node<PositionData | TransitionData>[] {
  // Проверим, может ли переход сработать
  if (!canTransitionFire(transitionId, nodes, edges)) {
    return nodes
  }

  // Find the transition node
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Find input edges (from positions to this transition)
  const inputEdges = edges.filter(
    (edge) => edge.target === transitionId && nodes.find((n) => n.id === edge.source)?.type === "position",
  )

  // Find output edges (from this transition to positions)
  const outputEdges = edges.filter(
    (edge) => edge.source === transitionId && nodes.find((n) => n.id === edge.target)?.type === "position",
  )

  // Check if transition can fire (all input positions have enough tokens)
  const canFire = inputEdges.every((edge) => {
    const sourceNode = nodes.find((node) => node.id === edge.source)
    if (!sourceNode || sourceNode.type !== "position") return false

    const requiredTokens = edge.data?.weight || 1
    return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
  })

  if (!canFire) return nodes

  // Fire the transition: remove tokens from input positions
  const updatedNodes = [...nodes]

  inputEdges.forEach((edge) => {
    const sourceNodeIndex = updatedNodes.findIndex((node) => node.id === edge.source)
    if (sourceNodeIndex === -1) return

    const weight = edge.data?.weight || 1
    const nodeData = updatedNodes[sourceNodeIndex].data as PositionData
    updatedNodes[sourceNodeIndex] = {
      ...updatedNodes[sourceNodeIndex],
      data: {
        ...nodeData,
        tokens: (nodeData.tokens || 0) - weight,
      },
    }
  })

  // Add tokens to output positions
  outputEdges.forEach((edge) => {
    const targetNodeIndex = updatedNodes.findIndex((node) => node.id === edge.target)
    if (targetNodeIndex === -1) return

    const weight = edge.data?.weight || 1
    const nodeData = updatedNodes[targetNodeIndex].data as PositionData
    updatedNodes[targetNodeIndex] = {
      ...updatedNodes[targetNodeIndex],
      data: {
        ...nodeData,
        tokens: (nodeData.tokens || 0) + weight,
      },
    }
  })

  // Highlight the transition to show it fired
  const nodeIndex = updatedNodes.findIndex((node) => node.id === transitionId)
  if (nodeIndex !== -1) {
    updatedNodes[nodeIndex] = {
      ...updatedNodes[nodeIndex],
      data: {
        ...updatedNodes[nodeIndex].data,
        firing: true,
      },
    }
  }

  return updatedNodes
}

// Export model to JSON
export function exportModel(nodes: Node<PositionData | TransitionData>[], edges: Edge<ArcData>[]): string {
  const model: PetriNetModel = {
    nodes,
    edges,
  }
  return JSON.stringify(model, null, 2)
}

// Import model from JSON
export function importModel(json: string): PetriNetModel {
  try {
    const model = JSON.parse(json) as PetriNetModel
    return model
  } catch (error) {
    console.error("Failed to parse model JSON:", error)
    throw new Error("Invalid model file")
  }
}
