import type { StateMachineDefinition, UITransition } from '../types.js';

export function compileStateMachine(transitions: UITransition[], initial?: string): StateMachineDefinition {
  const first = transitions[0];
  const states: StateMachineDefinition['states'] = {};
  for (const transition of transitions) {
    states[transition.sourceStateId] ??= { on: {} };
    states[transition.targetStateId] ??= { on: {} };
    const source = states[transition.sourceStateId];
    if (source) source.on[transition.semanticAction.name] = transition.targetStateId;
  }
  return {
    id: `machine-${first?.feature ?? 'feature'}`,
    initial: initial ?? first?.sourceStateId ?? 'unknown',
    states,
  };
}

export function toXStateConfig(machine: StateMachineDefinition) {
  return {
    id: machine.id,
    initial: machine.initial,
    states: machine.states,
  } as const;
}
