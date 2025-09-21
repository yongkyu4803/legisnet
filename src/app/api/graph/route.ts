import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GraphResponse, GraphMode } from "@/lib/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'proposer';
    const age = searchParams.get('age') ? parseInt(searchParams.get('age')!) : 22; // MVP: 22대 기본값
    const focusMember = searchParams.get('focusMember'); // 특정 의원 중심 네트워크
    const direction = searchParams.get('direction') || 'both'; // 공동발의 방향 (both, received, given)

    // Validate mode
    const parsedMode = GraphMode.parse(mode);


    if (parsedMode === 'proposer') {
      // MVP: Proposer-centric network - 실시간 계산
      let billsQuery: any = { age };

      // focusMember가 있으면 해당 의원과 관련된 법안만 조회
      if (focusMember) {
        billsQuery = {
          age,
          OR: [
            { proposer_rep_id: focusMember }, // 대표발의자인 경우
            {
              cosponsors: {
                some: {
                  member_id: focusMember // 공동발의자인 경우
                }
              }
            }
          ]
        };
      }

      const bills = await prisma.bill.findMany({
        where: billsQuery,
        include: {
          proposerRep: true,
          cosponsors: {
            include: {
              member: true
            }
          }
        }
      });

      const nodeMap = new Map();
      const graphEdges = [];

      if (focusMember) {
        console.log(`[Graph API] Processing ${focusMember} - found ${bills.length} bills`);

        // focusMember와 직접적으로만 연결된 노드들만 생성

        // 1단계: focusMember 노드 먼저 추가
        const focusMemberData = bills.find(bill =>
          bill.proposer_rep_id === focusMember ||
          bill.cosponsors.some(cs => cs.member_id === focusMember)
        );

        if (focusMemberData) {
          // focusMember가 대표발의자인 경우 해당 정보 사용
          let focusNodeInfo = null;
          if (focusMemberData.proposer_rep_id === focusMember) {
            focusNodeInfo = focusMemberData.proposerRep;
          } else {
            // focusMember가 공동발의자인 경우 해당 정보 찾기
            const focusCosponsor = focusMemberData.cosponsors.find(cs => cs.member_id === focusMember);
            focusNodeInfo = focusCosponsor?.member;
          }

          if (focusNodeInfo) {
            nodeMap.set(focusMember, {
              id: focusMember,
              label: focusNodeInfo.name,
              out: 0,
              in: 0,
              meta: {
                age: focusNodeInfo.age,
                party: focusNodeInfo.party
              }
            });
          }
        }

        // 2단계: focusMember와 직접 관계가 있는 사람들만 추가
        let proposerBillCount = 0;
        let cosponsorBillCount = 0;

        for (const bill of bills) {
          const proposer = bill.proposerRep;

          // focusMember가 대표발의자인 경우 - 공동발의자들과 연결
          if (bill.proposer_rep_id === focusMember) {
            proposerBillCount++;
            for (const cosponsor of bill.cosponsors) {
              const member = cosponsor.member;

              // 공동발의자 노드 추가
              if (!nodeMap.has(member.member_id)) {
                nodeMap.set(member.member_id, {
                  id: member.member_id,
                  label: member.name,
                  out: 0,
                  in: 0,
                  meta: {
                    age: member.age,
                    party: member.party
                  }
                });
              }

              // 공동발의자 → focusMember(대표발의자) 연결
              const existingEdgeIndex = graphEdges.findIndex(
                edge => edge.source === member.member_id && edge.target === focusMember
              );

              if (existingEdgeIndex >= 0) {
                graphEdges[existingEdgeIndex].weight += 1;
              } else {
                graphEdges.push({
                  source: member.member_id,
                  target: focusMember,
                  weight: 1,
                  lastDate: bill.propose_date?.toISOString().split('T')[0]
                });
              }

              // degree 업데이트
              nodeMap.get(member.member_id).out += 1;
              nodeMap.get(focusMember).in += 1;
            }
          }

          // focusMember가 공동발의자인 경우 - 대표발의자와 연결
          if (bill.cosponsors.some(cs => cs.member_id === focusMember)) {
            cosponsorBillCount++;
            // 대표발의자 노드 추가
            if (!nodeMap.has(proposer.member_id)) {
              nodeMap.set(proposer.member_id, {
                id: proposer.member_id,
                label: proposer.name,
                out: 0,
                in: 0,
                meta: {
                  age: proposer.age,
                  party: proposer.party
                }
              });
            }

            // focusMember → 대표발의자 연결
            const existingEdgeIndex = graphEdges.findIndex(
              edge => edge.source === focusMember && edge.target === proposer.member_id
            );

            if (existingEdgeIndex >= 0) {
              graphEdges[existingEdgeIndex].weight += 1;
            } else {
              graphEdges.push({
                source: focusMember,
                target: proposer.member_id,
                weight: 1,
                lastDate: bill.propose_date?.toISOString().split('T')[0]
              });
            }

            // degree 업데이트
            nodeMap.get(focusMember).out += 1;
            nodeMap.get(proposer.member_id).in += 1;
          }
        }

        console.log(`[Graph API] ${focusMember} result - proposer: ${proposerBillCount}, cosponsor: ${cosponsorBillCount}, nodes: ${nodeMap.size}, edges: ${graphEdges.length}`);
      } else {
        // 전체 네트워크 (기존 로직)
        for (const bill of bills) {
          const proposer = bill.proposerRep;

          // 대표발의자 노드 추가
          if (!nodeMap.has(proposer.member_id)) {
            nodeMap.set(proposer.member_id, {
              id: proposer.member_id,
              label: proposer.name,
              out: 0,
              in: 0,
              meta: {
                age: proposer.age,
                party: proposer.party
              }
            });
          }

          // 각 공동발의자 → 대표발의자 연결
          for (const cosponsor of bill.cosponsors) {
            const member = cosponsor.member;

            // 공동발의자 노드 추가
            if (!nodeMap.has(member.member_id)) {
              nodeMap.set(member.member_id, {
                id: member.member_id,
                label: member.name,
                out: 0,
                in: 0,
                meta: {
                  age: member.age,
                  party: member.party
                }
              });
            }

            // 기존 엣지 찾기 또는 새로 생성
            const existingEdgeIndex = graphEdges.findIndex(
              edge => edge.source === member.member_id && edge.target === proposer.member_id
            );

            if (existingEdgeIndex >= 0) {
              graphEdges[existingEdgeIndex].weight += 1;
            } else {
              graphEdges.push({
                source: member.member_id,
                target: proposer.member_id,
                weight: 1,
                lastDate: bill.propose_date?.toISOString().split('T')[0]
              });
            }

            // 노드 degree 업데이트
            const srcNode = nodeMap.get(member.member_id);
            const dstNode = nodeMap.get(proposer.member_id);
            srcNode.out += 1;
            dstNode.in += 1;
          }
        }
      }

      // 모든 경우에 0값 노드 제거 (공통 로직)
      for (const [nodeId, node] of nodeMap) {
        if (focusMember) {
          // focusMember가 있는 경우: focusMember와 실제 관계가 없는 노드 제거
          if (nodeId !== focusMember && node.in === 0 && node.out === 0) {
            nodeMap.delete(nodeId);
          }
        } else {
          // 전체 네트워크의 경우: 아예 관계가 없는 노드 제거
          if (node.in === 0 && node.out === 0) {
            nodeMap.delete(nodeId);
          }
        }
      }

      // 연결되지 않은 엣지 제거 (공통 로직)
      const validNodeIds = new Set(nodeMap.keys());
      const finalValidEdges = graphEdges.filter(edge =>
        validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
      );

      graphEdges.length = 0;
      graphEdges.push(...finalValidEdges);

      const response: GraphResponse = {
        mode: parsedMode,
        nodes: Array.from(nodeMap.values()),
        edges: graphEdges,
        stats: {
          nodeCount: nodeMap.size,
          edgeCount: graphEdges.length,
          timeRange: {
            from: null,
            to: null
          }
        }
      };


      return NextResponse.json(response);
    } else {
      // MVP: Co-supporter network - 실시간 계산 (같은 대표발의자를 지원한 의원들 간 연결)
      const bills = await prisma.bill.findMany({
        where: { age },
        include: {
          proposerRep: true,
          cosponsors: {
            include: {
              member: true
            }
          }
        }
      });

      const nodeMap = new Map();
      const edgeMap = new Map();

      // 각 법안에서 공동발의자들 간 연결 생성
      for (const bill of bills) {
        const cosponsors = bill.cosponsors.map(cs => cs.member);

        // 모든 공동발의자 쌍에 대해 연결 생성
        for (let i = 0; i < cosponsors.length; i++) {
          for (let j = i + 1; j < cosponsors.length; j++) {
            const memberA = cosponsors[i];
            const memberB = cosponsors[j];

            // 노드 추가
            if (!nodeMap.has(memberA.member_id)) {
              nodeMap.set(memberA.member_id, {
                id: memberA.member_id,
                label: memberA.name,
                meta: {
                  age: memberA.age,
                  party: memberA.party
                }
              });
            }

            if (!nodeMap.has(memberB.member_id)) {
              nodeMap.set(memberB.member_id, {
                id: memberB.member_id,
                label: memberB.name,
                meta: {
                  age: memberB.age,
                  party: memberB.party
                }
              });
            }

            // 엣지 추가 (순서 정규화)
            const edgeKey = [memberA.member_id, memberB.member_id].sort().join('-');
            if (edgeMap.has(edgeKey)) {
              edgeMap.get(edgeKey).weight += 1;
            } else {
              edgeMap.set(edgeKey, {
                source: memberA.member_id,
                target: memberB.member_id,
                weight: 1
              });
            }
          }
        }
      }

      const response: GraphResponse = {
        mode: parsedMode,
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values()),
        stats: {
          nodeCount: nodeMap.size,
          edgeCount: edgeMap.size,
          timeRange: {
            from: null,
            to: null
          }
        }
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Graph API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}