import { NodesStore } from "@/services/content/NodesStore.ts";

export class Leiden {
  gamma = 0.3;
  maxLocalMoves = 20;
  maxLevels = 50;
  randomSeed = 0xc0ffee;
  nodesStore: NodesStore;

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;
  }

  cluster = () => {
    const nodes = this.nodesStore.getNodes();

    const n = nodes.length;

    let { adj, degree, m2 } = this.buildGraph(this.nodesStore);
    if (m2 <= 0) {
      return {
        partition: Array.from({ length: n }, (_, i) => i),
        communities: Array.from({ length: n }, (_, i) => [i]),
        modularity: 0,
      };
    }

    let partition = Array.from({ length: n }, (_, i) => i);
    const rand = this.rng(this.randomSeed);

    for (let level = 0; level < this.maxLevels; level++) {
      let improved = false;
      for (let it = 0; it < this.maxLocalMoves; it++) {
        const moved = this.localMovingPhase(
          adj,
          degree,
          m2,
          partition,
          this.gamma,
          rand,
        );
        if (!moved) break;
        else improved = true;
      }

      const refined = this.refineCommunities(adj, partition);
      if (refined.some((x, i) => x !== partition[i])) partition = refined;

      if (!improved) break;
    }

    const modularity = this.computeModularity(
      adj,
      degree,
      m2,
      partition,
      this.gamma,
    );
    const communities = this.partitionToCommunities(partition);

    return { partition, communities, modularity };
  };

  /** Build adjacency lists and degrees. */
  private buildGraph = (nodesStore: NodesStore) => {
    const nodes = nodesStore.getNodes();

    const n = nodes.length;
    const nodeIndex = new Map<string, number>();
    nodes.forEach(({ node }, idx) => nodeIndex.set(node.id, idx));

    const adj: Map<number, number>[] = Array.from(
      { length: n },
      () => new Map(),
    );
    let m2 = 0;

    for (const { sourceId, targetId } of nodesStore.getEdges()) {
      const u = nodeIndex.get(sourceId)!;
      const v = nodeIndex.get(targetId)!;
      if (u === v) {
        adj[u].set(v, (adj[u].get(v) || 0) + 1);
        m2 += 2;
      } else {
        adj[u].set(v, (adj[u].get(v) || 0) + 1);
        adj[v].set(u, (adj[v].get(u) || 0) + 1);
        m2 += 2;
      }
    }

    const degree = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let d = 0;
      for (const w of adj[i].values()) d += w;
      degree[i] = d;
    }

    return { adj, degree, m2, nodeIndex };
  };

  private computeModularity = (
    adj: Map<number, number>[],
    degree: Float64Array,
    m2: number,
    partition: number[],
    gamma: number = 1.0,
  ): number => {
    const n = partition.length;
    const commIndex = new Map<number, number>();
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const c = partition[i];
      if (!commIndex.has(c)) commIndex.set(c, idx++);
    }
    const C = commIndex.size;
    const sumTot = new Float64Array(C);
    const sumIn = new Float64Array(C);

    for (let i = 0; i < n; i++) {
      const ci = commIndex.get(partition[i])!;
      sumTot[ci] += degree[i];
    }
    for (let i = 0; i < n; i++) {
      const ci = commIndex.get(partition[i])!;
      for (const [j, w] of adj[i]) {
        if (partition[j] === partition[i]) sumIn[ci] += w;
      }
    }

    let Q = 0;
    for (let c = 0; c < C; c++) {
      const e_in_2 = sumIn[c];
      const a_c = sumTot[c];
      Q += e_in_2 / m2 - gamma * (a_c / m2) * (a_c / m2);
    }
    return Q;
  };

  private rng = (seed: number = 0xdeadbeef) => {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s >>>= 0;
      s ^= s << 5;
      s >>>= 0;
      return (s >>> 0) / 0x100000000;
    };
  };

  private localMovingPhase = (
    adj: Map<number, number>[],
    degree: Float64Array,
    m2: number,
    partition: number[],
    gamma: number,
    rand: () => number,
  ): boolean => {
    const n = partition.length;
    const commSumTot = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const c = partition[i];
      commSumTot.set(c, (commSumTot.get(c) || 0) + degree[i]);
    }

    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    let moved = false;

    for (const i of order) {
      const ci = partition[i];
      const neighCommWeights = new Map<number, number>();
      for (const [j, w] of adj[i]) {
        const cj = partition[j];
        neighCommWeights.set(cj, (neighCommWeights.get(cj) || 0) + w);
      }

      const sumTot_ci_before = commSumTot.get(ci) || 0;
      commSumTot.set(ci, sumTot_ci_before - degree[i]);

      let bestC = ci;
      let bestGain = 0;

      for (const [cNbr, k_i_in] of neighCommWeights) {
        if (cNbr === ci) continue;
        const sumTot_cNbr = commSumTot.get(cNbr) || 0;
        const gain = k_i_in - (gamma * degree[i] * sumTot_cNbr) / m2;
        if (gain > bestGain + 1e-12) {
          bestGain = gain;
          bestC = cNbr;
        }
      }

      if (bestC !== ci) {
        partition[i] = bestC;
        moved = true;
        commSumTot.set(bestC, (commSumTot.get(bestC) || 0) + degree[i]);
      } else {
        commSumTot.set(ci, sumTot_ci_before);
      }
    }

    return moved;
  };

  private refineCommunities = (
    adj: Map<number, number>[],
    partition: number[],
  ): number[] => {
    const n = partition.length;
    const labelToNodes = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const c = partition[i];
      if (!labelToNodes.has(c)) labelToNodes.set(c, []);
      labelToNodes.get(c)!.push(i);
    }

    let nextLabel = 0;
    const newPartition: number[] = new Array(n);

    for (const nodes of labelToNodes.values()) {
      const inCommunity = new Set(nodes);
      const visited = new Set<number>();
      for (const s of nodes) {
        if (visited.has(s)) continue;
        const q = [s];
        visited.add(s);
        const comp: number[] = [];
        while (q.length) {
          const u = q.pop()!;
          comp.push(u);
          for (const [v] of adj[u]) {
            if (inCommunity.has(v) && !visited.has(v)) {
              visited.add(v);
              q.push(v);
            }
          }
        }
        for (const u of comp) newPartition[u] = nextLabel;
        nextLabel++;
      }
    }
    return newPartition;
  };

  private partitionToCommunities = (partition: number[]): number[][] => {
    const groups = new Map<number, number[]>();
    for (let i = 0; i < partition.length; i++) {
      const c = partition[i];
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c)!.push(i);
    }
    return Array.from(groups.values());
  };
}
