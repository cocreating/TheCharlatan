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

/** The types a scene holds; connectors are shared by every scene. */
export type SceneType = Exclude<NodeType, 'connector'>;
export const SCENE_TYPES: SceneType[] = ['subject', 'action', 'space', 'time', 'state', 'object'];

/** Scenes in a vocabulary: small worlds inside one theme. */
export const SCENE_COUNT = 4;
export const MIN_SCENES = 2;

/** Fragments per scene, by type. */
export const SCENE_COUNTS: Record<SceneType, number> = {
  subject: 5,
  action: 8,
  space: 6,
  time: 4,
  state: 6,
  object: 6,
};

export const CONNECTOR_COUNT = 10;
