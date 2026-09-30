import type { GraphData, Node } from './types';
import { CONNECTION_RULES, ROLES } from './rules';

const MIN_LINKS_PER_ROLE = 3;

export function validateGraph(graph: GraphData): string[] {
    const errors: string[] = [];

    if (graph.nodes.length === 0) {
        errors.push("Graph is empty");
        return errors;
    }

    // Map for fast lookup
    const nodeMap = new Map<string, Node>(graph.nodes.map(n => [n.id, n]));
    const endId = (end: string | Node) => (typeof end === 'string' ? end : end.id);

    graph.nodes.forEach(node => {
        const targets = graph.links
            .filter(l => endId(l.source) === node.id)
            .map(l => ({ id: endId(l.target), node: nodeMap.get(endId(l.target)) }));
        const roles = ROLES[node.type];

        // Enough ways on for every role the node can play (an object also as a subject)
        for (const role of roles) {
            const fitting = targets.filter(t => t.node && CONNECTION_RULES[role].includes(t.node.type)).length;
            if (fitting < MIN_LINKS_PER_ROLE) {
                errors.push(`Node ${node.id} (${node.text}) has only ${fitting} outgoing links as ${role} (min ${MIN_LINKS_PER_ROLE})`);
            }
        }

        for (const { id, node: target } of targets) {
            if (!target) {
                errors.push(`Link target ${id} not found`);
            } else if (!roles.some(role => CONNECTION_RULES[role].includes(target.type))) {
                errors.push(`Invalid semantic link: ${node.type} -> ${target.type} (Node ${node.id} to ${id})`);
            }
        }
    });

    return errors;
}
