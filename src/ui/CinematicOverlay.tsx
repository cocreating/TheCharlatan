import { useStore } from '../engine/store';


export function CinematicOverlay() {
  const activeNodeId = useStore(state => state.activeNodeId);
  const graph = useStore(state => state.graph);

  const node = activeNodeId ? graph.nodes.find(n => n.id === activeNodeId) : null;

  if (!node) return null;

  return (
    <div className="overlay-container">
       <div key={node.id} className={`kinetic-text animate-${node.type}`}>
          {node.text}
       </div>
    </div>
  );
}
