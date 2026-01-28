# A20 - Narrative Engine Spec

## Walker Logic
The walker uses a **weighted random walk** with **history penalization**.

### Algorithm
1. Identify current active node.
2. Filter outgoing links defined in `graph.links`.
3. Calculate weight for each candidate:
   - Base weight: 1
   - Penalty: `weight * (0.1 ^ recent_visits_in_last_20_steps)`
4. Select next node using weighted random distribution.

### State Management
Managed via **Zustand**.
- `activeNodeId`: Current focal point.
- `history`: Array of visited IDs.
- `story`: Array of accumulated text fragments.
