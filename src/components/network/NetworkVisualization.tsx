'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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
import { Network } from 'lucide-react';
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

  // forceUpdateKey 제거 - 무한 루프 원인이었음

  // 전체 그래프 데이터 저장 (API에서 한 번만 로드)
  const [fullGraphData, setFullGraphData] = useState<(GraphResponse & { focusMemberId?: string }) | null>(null);

  const { fitView } = useReactFlow();

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // 클라이언트 사이드 direction 필터링 및 그래프 처리
  const processAndDisplayGraph = useCallback((data: GraphResponse) => {
    console.log(`[NetworkVisualization] processAndDisplayGraph called - direction: ${direction}, nodes: ${data.nodes.length}, edges: ${data.edges.length}, focusMemberId: ${focusMemberId}`);

    let finalNodes = [...data.nodes];
    let finalEdges = [...data.edges];

    // direction='both'일 때는 원본 데이터 그대로 사용
    if (direction === 'both') {
      console.log(`[NetworkVisualization] Using original data for 'both' direction`);
    } else {
      console.log(`[NetworkVisualization] Applying ${direction} filter - nodes: ${data.nodes.length}, edges: ${data.edges.length}`);

      // direction에 따른 클라이언트 사이드 필터링
      const nodeMap = new Map();
      const validEdges = [];

      // 모든 노드를 0으로 초기화하되 원본 데이터 보존
      finalNodes.forEach(node => {
        nodeMap.set(node.id, {
          ...node,
          in: 0,
          out: 0,
          originalIn: node.in || 0,
          originalOut: node.out || 0
        });
      });

      // direction에 따라 엣지 필터링 및 degree 재계산
      finalEdges.forEach((edge, index) => {
        let includeEdge = false;

        if (direction === 'received') {
          // focusMember가 받은 관계만 표시 (다른 의원이 focusMember에게 공동발의 지원)
          // 즉, focusMember가 대표발의자이고 다른 의원이 공동발의자인 경우
          if (edge.target === focusMemberId) {
            includeEdge = true;
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (sourceNode) sourceNode.out += edge.weight || 1;
            if (targetNode) targetNode.in += edge.weight || 1;
          }
        } else if (direction === 'given') {
          // focusMember가 준 관계만 표시 (focusMember가 다른 의원에게 공동발의 지원)
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

      if (direction !== 'both') {
        console.log(`[NetworkVisualization] ${direction} filter result: ${validEdges.length}/${data.edges.length} edges`);
      }

      // 필터링된 엣지에 연결된 노드만 유지
      const connectedNodeIds = new Set();
      validEdges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      // focusMember는 항상 포함
      connectedNodeIds.add(focusMemberId);

      finalNodes = Array.from(nodeMap.values()).filter(node =>
        connectedNodeIds.has(node.id)
      );
      finalEdges = validEdges;
    }

    // 빈 결과 처리
    if (direction !== 'both' && finalEdges.length === 0) {
      setNodes([]);
      setEdges([]);
      setStats({
        nodeCount: 0,
        edgeCount: 0,
        timeRange: data.stats?.timeRange || null
      });
      return;
    }

    // 필터링된 degree 값으로 노드 생성 (레이아웃은 별도로 적용)
    const reactFlowNodes = finalNodes.map(node => ({
      id: node.id,
      type: 'member',
      position: { x: 0, y: 0 }, // 임시 위치, 나중에 layoutNodes에서 재설정
      data: {
        label: node.label,
        party: node.meta?.party,
        inDegree: node.in ?? 0,
        outDegree: node.out ?? 0,
        direction, // 중요: direction을 명시적으로 전달
        onClick: () => onNodeClick?.(node.id)
      }
    }));

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


    console.log(`[NetworkVisualization] Setting React Flow - nodes: ${reactFlowNodes.length}, edges: ${reactFlowEdges.length}, direction: ${direction}`);

    // 레이아웃 적용
    console.log(`[NetworkVisualization] Calling layoutNodes with ${reactFlowNodes.length} nodes, direction: ${direction}, focusMemberId: ${focusMemberId}`);
    const layoutedNodes = layoutNodes(reactFlowNodes);
    console.log(`[NetworkVisualization] Layout applied to ${layoutedNodes.length} nodes`);

    // 상태 업데이트
    setNodes(layoutedNodes);
    setEdges(reactFlowEdges);

    // 뷰 자동 조정
    setTimeout(() => {
      fitView({ duration: 800 });
    }, 100);

    // 필터링된 통계 정보 업데이트
    const filteredStats = {
      ...data.stats,
      nodeCount: reactFlowNodes.length,
      edgeCount: reactFlowEdges.length,
      direction: direction
    };
    setStats(filteredStats);
  }, [direction, focusMemberId, fitView, onNodeClick]);

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

  // 원형 레이아웃
  const layoutNodes = useCallback((nodes: any[]) => {
        if (nodes.length === 0) return [];

        console.log(`[layoutNodes] First node sample:`, nodes[0]);

        const layoutedNodes = [];
        const centerX = 400;
        const centerY = 300;

        // direction에 따라 정렬 기준 변경
        const sortField = direction === 'given' ? 'out' : 'in';
        const sortedNodes = [...nodes].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));

        // focusMember 찾기
        const focusNode = sortedNodes.find(n => n.id === focusMemberId);
        const otherNodes = sortedNodes.filter(n => n.id !== focusMemberId);

        // 1. focusMember를 중앙에 배치
        if (focusNode) {
          console.log(`[layoutNodes] Focus node ${focusNode.id} positioned at center (${centerX}, ${centerY})`);
          layoutedNodes.push({
            ...focusNode,
            position: { x: centerX, y: centerY }
          });
        }

        // 2. 나머지 노드들을 degree에 따라 동심원으로 배치
        if (otherNodes.length > 0) {
          // direction에 따라 degree 값 가져오기 함수
          const getDegree = (node: any) => {
            if (direction === 'given') {
              return node.data?.outDegree ?? node.out ?? 0;
            } else {
              return node.data?.inDegree ?? node.in ?? 0;
            }
          };

          // degree에 따라 정렬
          const sortedOtherNodes = [...otherNodes].sort((a, b) => getDegree(b) - getDegree(a));

          // 개선된 동심원 레이아웃: degree에 따른 10개 동심원
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
            const degree = getDegree(node);
            const radius = getRadiusForDegree(degree);

            console.log(`[layoutNodes] Node ${node.id} - degree: ${degree}, radius: ${radius}`);

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

                  console.log(`[layoutNodes] Node ${node.id} positioned at ring ${Math.floor(radius/50)}, radius ${adjustedRadius.toFixed(0)}, degree ${getDegree(node)}, position (${x.toFixed(0)}, ${y.toFixed(0)})`);

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

                console.log(`[layoutNodes] Node ${node.id} positioned at ring ${Math.floor(radius/50)}, radius ${radius.toFixed(0)}, degree ${getDegree(node)}, position (${x.toFixed(0)}, ${y.toFixed(0)})`);

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
            label: node.data?.label || node.label,
            party: node.data?.party || node.meta?.party || '정당정보없음',
            inDegree: node.data?.inDegree ?? node.in ?? 0,
            outDegree: node.data?.outDegree ?? node.out ?? 0,
            betweenness: 0,
            direction: node.data?.direction || direction,
            onClick: node.data?.onClick || (() => onNodeClick?.(node.id)),
          },
        }));
  }, [direction, onNodeClick]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // direction 변경 시 클라이언트 사이드 필터링 적용
  useEffect(() => {
    console.log(`[NetworkVisualization] Direction useEffect triggered - direction: ${direction}, fullGraphData: ${!!fullGraphData}, loading: ${loading}`);
    if (fullGraphData && !loading) {
      console.log(`[NetworkVisualization] Triggering processAndDisplayGraph for direction: ${direction}`);
      // processAndDisplayGraph 호출로 통일
      processAndDisplayGraph(fullGraphData);
      return;
    }
  }, [direction, focusMemberId, processAndDisplayGraph]);


  // Auto-fit view 제거 - 우리 레이아웃 유지

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

  // 빈 네트워크 결과 처리
  if (nodes.length === 0 && !loading && focusMemberId) {
    const directionText = direction === 'received' ? '지원받은' : direction === 'given' ? '지원한' : '';
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
              <Network className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">관계 데이터 없음</h3>
            <p className="text-gray-600">
              선택한 의원이 {directionText} 공동발의 관계가 없습니다.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow border">
            <p className="text-sm text-gray-600 mb-2">다른 필터 옵션을 시도해보세요:</p>
            <div className="flex flex-col gap-2 text-sm">
              <span className="text-blue-600">• 전체: 모든 관계 보기</span>
              <span className="text-green-600">• 받은 것: 타 의원이 지원한 관계</span>
              <span className="text-orange-600">• 준 것: 타 의원을 지원한 관계</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <ReactFlow
        key={`${direction}-${focusMemberId}-${nodes.length}-${edges.length}`}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
            <div className="flex items-center gap-2">
              <span>필터:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {direction === 'both' ? '전체' : direction === 'received' ? '받은 것' : '준 것'}
              </span>
            </div>
            <div>노드: {stats.nodeCount}개</div>
            <div>엣지: {stats.edgeCount}개</div>
            {stats.timeRange?.from && (
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