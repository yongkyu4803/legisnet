import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    // MVP: 의원 기본 정보 조회 - 간소화된 스키마
    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      include: {
        bills_proposed: {
          include: {
            cosponsors: {
              include: {
                member: true
              }
            },
          },
          orderBy: {
            propose_date: 'desc'
          },
          take: 10
        },
        bills_cosponsor: {
          include: {
            bill: {
              include: {
                proposerRep: true
              }
            }
          },
          orderBy: {
            bill: {
              propose_date: 'desc'
            }
          },
          take: 10
        }
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: "의원을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // MVP: 실시간 네트워크 메트릭 계산
    const proposedBillsCount = member.bills_proposed.length;
    const cosponsoredBillsCount = member.bills_cosponsor.length;

    // 네트워크 중심성 계산 (전체 네트워크에서의 위치)
    const inDegree = await prisma.billCosponsor.count({
      where: {
        bill: {
          proposer_rep_id: memberId
        }
      }
    });

    const outDegree = await prisma.billCosponsor.count({
      where: {
        member_id: memberId
      }
    });

    // 방향별 협력 통계 계산
    const collaborationStats = await prisma.$queryRaw`
      SELECT
        m.member_id,
        m.name,
        -- 해당 의원이 현재 의원(memberId)에게 지원한 횟수
        COALESCE(support_to_target.count, 0) as supported_to_target,
        -- 현재 의원(memberId)이 해당 의원에게 지원한 횟수
        COALESCE(support_from_target.count, 0) as supported_from_target
      FROM members m
      LEFT JOIN (
        -- 해당 의원이 현재 의원의 법안을 공동발의한 횟수
        SELECT bc.member_id, COUNT(*) as count
        FROM bill_cosponsors bc
        INNER JOIN bills b ON bc.bill_id = b.bill_id
        WHERE b.proposer_rep_id = ${memberId}
        GROUP BY bc.member_id
      ) support_to_target ON m.member_id = support_to_target.member_id
      LEFT JOIN (
        -- 현재 의원이 해당 의원의 법안을 공동발의한 횟수
        SELECT b.proposer_rep_id as member_id, COUNT(*) as count
        FROM bill_cosponsors bc
        INNER JOIN bills b ON bc.bill_id = b.bill_id
        WHERE bc.member_id = ${memberId}
        GROUP BY b.proposer_rep_id
      ) support_from_target ON m.member_id = support_from_target.member_id
      WHERE m.member_id != ${memberId}
        AND m.age = ${member.age}
        AND (COALESCE(support_to_target.count, 0) > 0 OR COALESCE(support_from_target.count, 0) > 0)
      ORDER BY (COALESCE(support_to_target.count, 0) + COALESCE(support_from_target.count, 0)) DESC
      LIMIT 10
    ` as Array<{
      member_id: string;
      name: string;
      supported_to_target: number;
      supported_from_target: number;
    }>;

    // MVP: 응답 데이터 구성 - 간소화된 스키마
    const response = {
      memberId: member.member_id,
      name: member.name,
      age: member.age,
      // 네트워크 중심성 메트릭
      inDegree,
      outDegree,
      betweenness: 0, // MVP에서는 미계산
      // MVP: 실시간 계산된 메트릭
      proposedBillsCount,
      cosponsoredBillsCount,
      totalBillsCount: proposedBillsCount + cosponsoredBillsCount,
      billsProposed: member.bills_proposed.map(bill => ({
        billId: bill.bill_id,
        name: bill.bill_name,
        proposeDate: bill.propose_date?.toISOString().split('T')[0],
        coSponsorsCount: bill.cosponsors.length
      })),
      billsCosponsored: member.bills_cosponsor.map(cosponsor => ({
        billId: cosponsor.bill.bill_id,
        name: cosponsor.bill.bill_name,
        proposerName: cosponsor.bill.proposerRep.name,
        proposeDate: cosponsor.bill.propose_date?.toISOString().split('T')[0]
      })),
      topCollaborators: collaborationStats.map(collab => ({
        memberId: collab.member_id,
        name: collab.name,
        supportedToTarget: Number(collab.supported_to_target),
        supportedFromTarget: Number(collab.supported_from_target),
        totalCollaboration: Number(collab.supported_to_target) + Number(collab.supported_from_target)
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch member details:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}