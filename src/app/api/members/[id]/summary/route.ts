import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MemberSummary } from "@/lib/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;

    // Get member
    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      include: {
        metrics_total: true
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get top supporters (who support this member)
    const topSupporters = await prisma.edgeSupport.findMany({
      where: {
        dst_member_id: memberId,
        age: member.age
      },
      include: {
        src: true
      },
      orderBy: {
        weight: 'desc'
      },
      take: 50
    });

    // Get top beneficiaries (who this member supports)
    const topBeneficiaries = await prisma.edgeSupport.findMany({
      where: {
        src_member_id: memberId,
        age: member.age
      },
      include: {
        dst: true
      },
      orderBy: {
        weight: 'desc'
      },
      take: 50
    });

    // Get recent bills (both proposed and co-sponsored)
    const proposedBills = await prisma.bill.findMany({
      where: {
        proposer_rep_id: memberId,
        age: member.age
      },
      orderBy: {
        propose_date: 'desc'
      },
      take: 25
    });

    const cosponsoredBills = await prisma.bill.findMany({
      where: {
        cosponsors: {
          some: {
            member_id: memberId
          }
        },
        age: member.age
      },
      orderBy: {
        propose_date: 'desc'
      },
      take: 25
    });

    // Combine and sort recent bills
    const allBills = [...proposedBills, ...cosponsoredBills]
      .sort((a, b) => (b.propose_date?.getTime() || 0) - (a.propose_date?.getTime() || 0))
      .slice(0, 50);

    const response: MemberSummary['_output'] = {
      memberId: member.member_id,
      name: member.name,
      age: member.age,
      totals: {
        inDegreeW: member.metrics_total?.in_degree_w || 0,
        outDegreeW: member.metrics_total?.out_degree_w || 0,
        betweenness: member.metrics_total?.betweenness || null,
        clustering: member.metrics_total?.clustering || null
      },
      topSupporters: topSupporters.map(edge => ({
        memberId: edge.src.member_id,
        name: edge.src.name,
        weight: edge.weight
      })),
      topBeneficiaries: topBeneficiaries.map(edge => ({
        memberId: edge.dst.member_id,
        name: edge.dst.name,
        weight: edge.weight
      })),
      recentBills: allBills.map(bill => ({
        billId: bill.bill_id,
        name: bill.name,
        proposeDate: bill.propose_date?.toISOString().split('T')[0] || null
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Member summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}