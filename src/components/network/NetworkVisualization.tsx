'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphResponse, GraphMode } from '@/lib/types/api';
import { MemberNode } from './MemberNode';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DirectionMode } from '@/components/dashboard/NetworkControlPanel';

interface NetworkVisualizationProps {
  mode: GraphMode;
  age: number;
  direction: DirectionMode;
  onNodeClick?: (nodeId: string) => void;
  focusMemberId: string; // 필수 속성으로 변경
}

function NetworkFlow({ mode, age, direction, onNodeClick, focusMemberId }: NetworkVisualizationProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    member: MemberNode,
  }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GraphResponse['stats']>(null);

  // 전체 그래프 데이터 저장 (API에서 한 번만 로드)
  const [fullGraphData, setFullGraphData] = useState<(GraphResponse & { focusMemberId?: string }) | null>(null);

  const { fitView } = useReactFlow();

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // 클라이언트 사이드 direction 필터링 및 그래프 처리
  const processAndDisplayGraph = useCallback((data: GraphResponse) => {
    let finalNodes = [...data.nodes];
    let finalEdges = [...data.edges];

    // direction에 따른 클라이언트 사이드 필터링
    if (direction !== 'both') {
      const nodeMap = new Map();
      const validEdges = [];

      // 모든 노드를 0으로 초기화
      finalNodes.forEach(node => {
        nodeMap.set(node.id, {
          ...node,
          in: 0,
          out: 0
        });
      });

      // direction에 따라 엣지 필터링 및 degree 재계산
      finalEdges.forEach(edge => {
        let includeEdge = false;

        if (direction === 'received') {
          // focusMember가 받은 관계만 표시
          if (edge.target === focusMemberId) {
            includeEdge = true;
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode) sourceNode.out += edge.weight || 1;
            if (targetNode) targetNode.in += edge.weight || 1;
          }
        } else if (direction === 'given') {
          // focusMember가 준 관계만 표시
          if (edge.source === focusMemberId) {
            includeEdge = true;
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode) sourceNode.out += edge.weight || 1;
            if (targetNode) targetNode.in += edge.weight || 1;
          }
        }

        if (includeEdge) {
          validEdges.push(edge);
        }
      });

      // 관계가 없는 노드 제거 (focusMember 제외)
      finalNodes = Array.from(nodeMap.values()).filter(node =>
        node.id === focusMemberId || node.in > 0 || node.out > 0
      );
      finalEdges = validEdges;
    }

    // focusMember와 직접 관계가 있는 노드만 필터링 (0값 제거)
    const filteredFinalNodes = finalNodes.filter(node => {
      if (node.id === focusMemberId) return true; // focusMember는 항상 유지

      if (direction === 'both') {
        return (node.in ?? 0) > 0 || (node.out ?? 0) > 0;
      } else if (direction === 'received') {
        return (node.in ?? 0) > 0;
      } else if (direction === 'given') {
        return (node.out ?? 0) > 0;
      }
      return false;
    });

    // 레이아웃 적용 시 필터링된 degree 값 보존
    const reactFlowNodes = layoutNodes(filteredFinalNodes).map(layoutNode => {
      // 원본 노드에서 필터링된 degree 값 찾기
      const originalNode = filteredFinalNodes.find(n => n.id === layoutNode.id);
      if (!originalNode) return null; // 안전 체크

      return {
        ...layoutNode,
        data: {
          ...layoutNode.data,
          inDegree: originalNode.in ?? 0,
          outDegree: originalNode.out ?? 0,
          direction, // 중요: direction을 명시적으로 전달
        }
      };
    }).filter(Boolean); // null 제거

    const reactFlowEdges = finalEdges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      style: {
        strokeWidth: Math.max(1, (edge.weight || 1) * 0.5),
        opacity: 0.6,
      },
      animated: (edge.weight || 0) > 5,
    }));

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
    setStats(data.stats);
  }, [direction, focusMemberId, onNodeClick]);

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // focusMemberId가 반드시 있어야 함 - 전체 네트워크 표시 안함
      if (!focusMemberId) {
        setError('의원을 선택해주세요');
        setLoading(false);
        return;
      }

      // 전체 그래프 데이터가 없거나 focusMember가 변경된 경우에만 API 호출
      if (!fullGraphData || fullGraphData.focusMemberId !== focusMemberId) {
        const url = `/api/graph?mode=${mode}&age=${age}&focusMember=${focusMemberId}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch network data: ${response.statusText}`);
        }

        const data: GraphResponse = await response.json();

        // 전체 그래프 데이터 저장 (focusMemberId 포함)
        setFullGraphData({
          ...data,
          focusMemberId
        });

        // 처음 로드 시에는 전체 데이터 표시
        processAndDisplayGraph(data);
      } else {
        // 이미 로드된 데이터를 direction에 따라 클라이언트 사이드에서 필터링
        processAndDisplayGraph(fullGraphData);
      }
    } catch (err) {
      console.error('Failed to fetch network data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [mode, age, focusMemberId, processAndDisplayGraph]);

  // focusMember 중심의 중심성 기반 레이아웃
  const layoutNodes = useCallback((nodes: any[]) => {
        if (nodes.length === 0) return [];

        const centerX = 400;
        const centerY = 300;

        // focusMember 찾기
        const focusNode = nodes.find(n => n.id === focusMemberId);
        const otherNodes = nodes.filter(n => n.id !== focusMemberId);


        const layoutedNodes = [];

        // 1. focusMember를 정확히 중심에 배치
        if (focusNode) {
          layoutedNodes.push({
            ...focusNode,
            position: { x: centerX, y: centerY }
          });
        }

        // 2. 나머지 노드들을 inDegree에 따라 중심에서 거리별로 배치
        if (otherNodes.length > 0) {
          // direction에 따라 정렬 기준 변경
          const sortField = direction === 'given' ? 'out' : 'in';
          const sortedOtherNodes = [...otherNodes].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));


          // 개선된 동심원 레이아웃: 더 넓은 간격과 동적 반지름
          const getRadiusForDegree = (degree: number) => {
            if (degree >= 50) return 80;      // 1원: 최고 중심성 (50+)
            if (degree >= 40) return 130;     // 2원: 매우 높은 중심성 (40-49)
            if (degree >= 30) return 180;     // 3원: 높은 중심성 (30-39)
            if (degree >= 20) return 230;     // 4원: 중상 중심성 (20-29)
            if (degree >= 15) return 280;     // 5원: 중간-높은 중심성 (15-19)
            if (degree >= 10) return 330;     // 6원: 중간 중심성 (10-14)
            if (degree >= 5) return 380;      // 7원: 중간-낮은 중심성 (5-9)
            if (degree >= 2) return 430;      // 8원: 낮은 중심성 (2-4)
            if (degree >= 1) return 480;      // 9원: 매우 낮은 중심성 (1)
            return 530;                        // 10원: 최소 중심성 (0)
          };

          // 각 거리별로 노드들을 그룹화
          const radiusGroups = new Map<number, any[]>();

          sortedOtherNodes.forEach(node => {
            const degree = node[sortField] || 0;
            const radius = getRadiusForDegree(degree);

            if (!radiusGroups.has(radius)) {
              radiusGroups.set(radius, []);
            }
            radiusGroups.get(radius)!.push(node);
          });


          // 각 그룹별로 원형 배치 (개선된 알고리즘)
          radiusGroups.forEach((nodesAtRadius, radius) => {
            const nodeCount = nodesAtRadius.length;

            // 노드 크기를 고려한 최소 각도 간격 계산
            const minNodeSize = 40; // 최소 노드 크기
            const minAngleSpacing = Math.max(
              (2 * Math.PI) / nodeCount, // 균등 분배
              (minNodeSize * 1.5) / radius // 최소 간격 보장
            );

            // 노드가 너무 많으면 반지름을 늘려서 다중 링으로 분산
            const maxNodesPerRing = Math.floor((2 * Math.PI * radius) / (minNodeSize * 1.5));

            if (nodeCount > maxNodesPerRing && nodeCount > 12) {
              // 큰 그룹을 여러 링으로 분산
              const ringsNeeded = Math.ceil(nodeCount / maxNodesPerRing);
              const nodesPerRing = Math.ceil(nodeCount / ringsNeeded);

              for (let ring = 0; ring < ringsNeeded; ring++) {
                const startIdx = ring * nodesPerRing;
                const endIdx = Math.min(startIdx + nodesPerRing, nodeCount);
                const ringNodes = nodesAtRadius.slice(startIdx, endIdx);
                const adjustedRadius = radius + (ring * 25); // 25px 간격으로 링 분산

                ringNodes.forEach((node, index) => {
                  const angleStep = (2 * Math.PI) / ringNodes.length;
                  const startAngle = (ring * Math.PI / 4); // 링마다 다른 시작 각도
                  const angle = startAngle + (index * angleStep);

                  const x = centerX + Math.cos(angle) * adjustedRadius;
                  const y = centerY + Math.sin(angle) * adjustedRadius;

                  layoutedNodes.push({
                    ...node,
                    position: { x, y }
                  });
                });
              }
            } else {
              // 일반적인 단일 링 배치
              nodesAtRadius.forEach((node, index) => {
                const angleStep = Math.max(minAngleSpacing, (2 * Math.PI) / nodeCount);
                const startAngle = (radius / 100) * 0.5; // 링마다 다른 시작 각도
                const angle = startAngle + (index * angleStep);

                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                layoutedNodes.push({
                  ...node,
                  position: { x, y }
                });
              });
            }
          });
        }

        return layoutedNodes.map(node => ({
          id: node.id,
          type: 'member',
          position: node.position,
          data: {
            label: node.label,
            party: node.meta?.party || '정당정보없음',
            inDegree: node.in ?? 0, // 안전한 fallback
            outDegree: node.out ?? 0, // 안전한 fallback
            betweenness: 0,
            direction: 'both', // layoutNodes에서는 기본값만 설정, 실제 direction은 processAndDisplayGraph에서 덮어씀
            onClick: () => onNodeClick?.(node.id),
          },
        }));
  }, [direction, onNodeClick]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // direction 변경 시 클라이언트 사이드 필터링 적용
  useEffect(() => {
    if (fullGraphData && !loading) {
      processAndDisplayGraph(fullGraphData);
    }
  }, [direction, fullGraphData, processAndDisplayGraph, loading]);

  // Auto-fit view after nodes are loaded
  useEffect(() => {
    if (nodes.length > 0 && !loading) {
      setTimeout(() => fitView({ duration: 800 }), 100);
    }
  }, [nodes.length, loading, fitView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
        <span className="ml-2 text-sm text-muted-foreground">
          네트워크 데이터를 불러오는 중...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">네트워크 데이터 로딩 실패</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={fetchNetworkData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          nodeStrokeColor="#374151"
          nodeColor="#6b7280"
          nodeBorderRadius={2}
        />
        <Background gap={12} size={1} />
      </ReactFlow>

      {/* Network Statistics Overlay */}
      {stats && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">네트워크 통계</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>노드: {stats.nodeCount}개</div>
            <div>엣지: {stats.edgeCount}개</div>
            {stats.timeRange.from && (
              <div>기간: {stats.timeRange.from} ~ {stats.timeRange.to}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NetworkVisualization(props: NetworkVisualizationProps) {
  return (
    <ReactFlowProvider>
      <NetworkFlow {...props} />
    </ReactFlowProvider>
  );
}