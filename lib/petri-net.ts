import type { Edge, Node } from "@xyflow/react"

export type LabelPosition = "top" | "right" | "bottom" | "left"

export type PositionData = {
  tokens: number
  label?: string
  labelPosition?: LabelPosition
  number?: number
}

export type TransitionData = {
  firing: boolean
  canFire: boolean
  waiting: boolean
  delay: number
  activationTime?: number
  label?: string
  labelPosition?: LabelPosition
  number: number
  // Поле для отслеживания состояния "метки забраны, но еще не добавлены"
  tokensRemoved: boolean
}

export type ArcData = {
  weight: number
  label?: string
  labelPosition?: LabelPosition
}

export type PetriNode = Node<PositionData | TransitionData>
export type PetriNodePosition = Node<PositionData>
export type PetriNodeTransition = Node<TransitionData>
export type PetriEdge = Edge<ArcData>

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

// Изменение меток в позициях, связанных с переходом (in — забираем, out — добавляем)
function adjustAdjacentPositions(
  transitionId: string,
  nodes: PetriNode[],
  edges: PetriEdge[],
  direction: "in" | "out",
): PetriNode[] {
  const transitionNode = nodes.find((node) => node.id === transitionId)
  if (!transitionNode || transitionNode.type !== "transition") return nodes

  // Суммируем веса всех дуг, ведущих в/из одной позиции
  const weightByPosition = new Map<string, number>()

  edges.forEach((edge) => {
    const [positionId, edgeTransitionId] =
      direction === "in" ? [edge.source, edge.target] : [edge.target, edge.source]

    if (edgeTransitionId !== transitionId) return
    if (nodes.find((node) => node.id === positionId)?.type !== "position") return

    weightByPosition.set(positionId, (weightByPosition.get(positionId) ?? 0) + (edge.data?.weight || 1))
  })

  const sign = direction === "in" ? -1 : 1

  return nodes.map((node) => {
    const weight = weightByPosition.get(node.id)
    if (!weight) return node

    return {
      ...node,
      data: {
        ...node.data,
        tokens: ((node.data as PositionData).tokens || 0) + sign * weight,
      },
    }
  })
}

// Функция для удаления меток из входных позиций
export function removeTokensFromInputs(
  transitionId: string,
  nodes: PetriNode[],
  edges: PetriEdge[],
): PetriNode[] {
  return adjustAdjacentPositions(transitionId, nodes, edges, "in").map((node) =>
    node.id === transitionId
      ? {
          ...node,
          data: {
            ...node.data,
            tokensRemoved: true,
          },
        }
      : node,
  )
}

// Функция для добавления меток в выходные позиции
export function addTokensToOutputs(
  transitionId: string,
  nodes: PetriNode[],
  edges: PetriEdge[],
): PetriNode[] {
  return adjustAdjacentPositions(transitionId, nodes, edges, "out")
}

// Экспорт модели в JSON
export function exportModel(nodes: PetriNode[], edges: PetriEdge[]): string {
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
