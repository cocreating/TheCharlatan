import type { NodeType } from './types';

export const CONNECTION_RULES: Record<NodeType, NodeType[]> = {
  subject: ['action', 'state'],
  action: ['space', 'object', 'time', 'state'],
  space: ['action', 'state', 'time'],
  state: ['action', 'space'],
  // Inferred rules to ensure connectivity
  object: ['connector', 'subject'],
  time: ['subject', 'action', 'connector'],
  connector: ['subject', 'action', 'space', 'time', 'state', 'object']
};

export const NODE_COUNTS: Record<NodeType, number> = {
  subject: 20,
  action: 35,
  space: 25,
  time: 15,
  state: 25,
  object: 25,
  connector: 10
};
