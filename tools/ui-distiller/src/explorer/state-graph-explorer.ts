import { buildActionFrontier, type FrontierItem } from './interactive-frontier.js';
import type { SemanticAction, UIState, UITransition } from '../types.js';

export interface StateGraph {
  states: Map<string, UIState>;
  transitions: Map<string, UITransition>;
  frontier: FrontierItem[];
}

export function createStateGraph(): StateGraph {
  return { states: new Map(), transitions: new Map(), frontier: [] };
}

export function addState(graph: StateGraph, state: UIState, actions: SemanticAction[] = []): void {
  graph.states.set(state.id, state);
  graph.frontier.push(...buildActionFrontier(state.id, actions));
}

export function addTransition(graph: StateGraph, transition: UITransition): void {
  graph.transitions.set(transition.id, transition);
  graph.frontier = graph.frontier.map((item) => item.id === `${transition.sourceStateId}:${transition.semanticAction.name}:0`
    ? { ...item, explored: true }
    : item);
}

export function graphToJson(graph: StateGraph) {
  return {
    states: [...graph.states.values()],
    transitions: [...graph.transitions.values()],
    frontier: graph.frontier,
  };
}
