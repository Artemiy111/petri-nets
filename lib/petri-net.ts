import { PetriEdge, PetriNode } from '@/hooks/use-petri-net'
import type { Node, Edge } from "@xyflow/react"


export type PositionData = {
  tokens: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
  number?: number
}

export type TransitionData = {
  firing: boolean
  canFire: boolean
  waiting: boolean
  delay: number
  activationTime?: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
  number: number
  // Поле для отслеживания состояния "метки забраны, но еще не добавлены"
  tokensRemoved: boolean
}

export type ArcData = {
  weight: number
  label?: string
  labelPosition?: "top" | "right" | "bottom" | "left"
}

export type PetriNetModel = {
  nodes: PetriNode[]
  edges: PetriEdge[]
}

// Проверка, может ли переход сработать
export function canTransitionFire(
  transitionId: string,
  nodes: PetriNode[],
  edges: PetriEdge[],
): boolean {
  // Найдём переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return false

  // Найдём входящие дуги (от позиций к этому переходу)
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

// Обновление состояния переходов: какие могут сработать
export function updateTransitionStates(
  nodes: PetriNode[],
  edges: PetriEdge[],
): PetriNode[] {
  // Создаём новый массив для отслеживания переходов, которые нужно обновить
  const updatedNodes = nodes.map((someNode) => {
    if (someNode.type !== "transition") return someNode as Node<PositionData>
    const node = someNode as Node<TransitionData>
    // Если переход уже в состоянии ожидания и метки уже забраны, не меняем его состояние
    if (node.data.waiting && node.data.tokensRemoved) return node

    // Найдём входящие дуги (от позиций к этому переходу)
    const inputEdges = edges.filter((edge) => edge.target === node.id)

    // Проверим, может ли переход сработать (все входные позиции имеют достаточно токенов)
    const canFire = inputEdges.every((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      if (!sourceNode || sourceNode.type !== "position") return false

      const requiredTokens = edge.data?.weight || 1
      return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
    })

    // Обновим только если состояние canFire изменилось

    if ('canFire' in node.data && canFire !== node.data.canFire) {
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
  nodes: PetriNode[],
  edges: PetriEdge[],
): PetriNode[] {
  // Найдём переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Найдём входящие дуги (от позиций к этому переходу)
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
  nodes: PetriNode[],
  edges: PetriEdge[],
): PetriNode[] {
  // Найдём переход
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Найдём выходящие дуги (от этого перехода к позициям)
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

// Срабатывание перехода
// export function fireTransition(
//   transitionId: string,
//   nodes: PetriNode[],
//   edges: PetriEdge[],
// ): Node<PositionData | TransitionData>[] {
//   // Проверим, может ли переход сработать
//   if (!canTransitionFire(transitionId, nodes, edges)) {
//     return nodes
//   }

//   // Найдём переход
//   const transitionNode = nodes.find((node) => node.id === transitionId)
//   if (!transitionNode || transitionNode.type !== "transition") return nodes

//   // Найдём входящие дуги (от позиций к этому переходу)
//   const inputEdges = edges.filter(
//     (edge) => edge.target === transitionId && nodes.find((n) => n.id === edge.source)?.type === "position",
//   )

//   // Найдём выходящие дуги (от этого перехода к позициям)
//   const outputEdges = edges.filter(
//     (edge) => edge.source === transitionId && nodes.find((n) => n.id === edge.target)?.type === "position",
//   )

//   // Проверим, можно ли сработать (достаточно ли меток)
//   const canFire = canTransitionFire(transitionId, nodes, edges)
//   // const canFire = inputEdges.every((edge) => {
//   //   const sourceNode = nodes.find((node) => node.id === edge.source)
//   //   if (!sourceNode || sourceNode.type !== "position") return false

//   //   const requiredTokens = edge.data?.weight || 1
//   //   return ((sourceNode.data as PositionData).tokens || 0) >= requiredTokens
//   // })

//   if (!canFire) return nodes

//   // Переход срабатывает: удаляем метки из входных позиций
//   const updatedNodes = [...nodes]

//   inputEdges.forEach((edge) => {
//     const sourceNodeIndex = updatedNodes.findIndex((node) => node.id === edge.source)
//     if (sourceNodeIndex === -1) return

//     const weight = edge.data?.weight || 1
//     const nodeData = updatedNodes[sourceNodeIndex].data as PositionData
//     updatedNodes[sourceNodeIndex] = {
//       ...updatedNodes[sourceNodeIndex],
//       data: {
//         ...nodeData,
//         tokens: (nodeData.tokens || 0) - weight,
//       },
//     }
//   })

//   // Добавляем метки в выходные позиции
//   outputEdges.forEach((edge) => {
//     const targetNodeIndex = updatedNodes.findIndex((node) => node.id === edge.target)
//     if (targetNodeIndex === -1) return

//     const weight = edge.data?.weight || 1
//     const nodeData = updatedNodes[targetNodeIndex].data as PositionData
//     updatedNodes[targetNodeIndex] = {
//       ...updatedNodes[targetNodeIndex],
//       data: {
//         ...nodeData,
//         tokens: (nodeData.tokens || 0) + weight,
//       },
//     }
//   })

//   // Подсветим переход, чтобы показать, что он сработал
//   const nodeIndex = updatedNodes.findIndex((node) => node.id === transitionId)
//   if (nodeIndex !== -1) {
//     updatedNodes[nodeIndex] = {
//       ...updatedNodes[nodeIndex],
//       data: {
//         ...updatedNodes[nodeIndex].data,
//         firing: true,
//       },
//     }
//   }

//   return updatedNodes
// }

// Экспорт модели в JSON
export function exportModel(nodes: Node<PositionData | TransitionData>[], edges: Edge<ArcData>[]): string {
  const model: PetriNetModel = {
    nodes,
    edges,
  }
  return JSON.stringify(model, null, 2)
}

// Импорт модели из JSON
export function importModel(json: string): PetriNetModel {
  try {
    const model = JSON.parse(json) as PetriNetModel
    return model
  } catch (error) {
    console.error("Не удалось разобрать JSON модели:", error)
    throw new Error("Некорректный файл модели")
  }
}
