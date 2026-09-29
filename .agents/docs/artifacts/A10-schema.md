# A10 - Data Schema

## Graph Data Model
```typescript
interface GraphData {
  meta: {
    version: number;
    seed: number;
  };
  nodes: Node[];
  links: Link[];
}

interface Node {
  id: string; // e.g. "n001"
  type: 'subject' | 'action' | 'space' | 'time' | 'state' | 'object' | 'connector';
  text: string;
}

interface Link {
  source: string;
  target: string;
  weight: number;
  rel?: string;
}
```
