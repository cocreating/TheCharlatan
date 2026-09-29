
import type { GraphData, Node } from './types';
import { CONNECTION_RULES } from './rules';

export function validateGraph(graph: GraphData): string[] {
    const errors: string[] = [];

    if (graph.nodes.length === 0) {
        errors.push("Graph is empty");
        return errors;
    }

    // Map for fast lookup
    const nodeMap = new Map<string, Node>(graph.nodes.map(n => [n.id, n]));

    graph.nodes.forEach(node => {
        const outgoing = graph.links.filter(l => {
            const srcId = typeof l.source === 'string' ? l.source : (l.source as Node).id;
            return srcId === node.id;
        });

        if (outgoing.length < 3) {
            errors.push(`Node ${node.id} (${node.text}) has only ${outgoing.length} outgoing links (min 3)`);
        }

        outgoing.forEach(link => {
            const targetId = typeof link.target === 'string' ? link.target : (link.target as Node).id;
            const target = nodeMap.get(targetId);

            if (target) {
                const allowed = CONNECTION_RULES[node.type];
                if (!allowed.includes(target.type)) {
                    errors.push(`Invalid sematic link: ${node.type} -> ${target.type} (Node ${node.id} to ${target.id})`);
                }
            } else {
                errors.push(`Link target ${targetId} not found`);
            }
        });
    });

    return errors;
}
