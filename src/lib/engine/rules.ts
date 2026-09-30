import type { NodeType } from './types';

/**
 * What may follow a fragment, by the role it plays in its sentence. Every sentence has one shape:
 *
 *   [connector,] subject (action object | state) [space] [time].
 *
 * A subject or a connector after a complete predicate opens the next sentence.
 */
export const CONNECTION_RULES: Record<NodeType, NodeType[]> = {
  connector: ['subject'],
  subject: ['action', 'state'],
  action: ['object'],
  state: ['space', 'time', 'connector', 'subject'],
  object: ['space', 'time', 'connector', 'subject'],
  space: ['time', 'connector', 'subject'],
  time: ['connector', 'subject'],
};

/** The roles each type can play: an object can come back as the subject of a later sentence. */
export const ROLES: Record<NodeType, NodeType[]> = {
  subject: ['subject'],
  action: ['action'],
  space: ['space'],
  time: ['time'],
  state: ['state'],
  object: ['object', 'subject'],
  connector: ['connector'],
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
