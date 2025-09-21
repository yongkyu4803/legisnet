import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RankingsResponse, RankingType } from "@/lib/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'top-supporters';
    const age = searchParams.get('age') ? parseInt(searchParams.get('age')!) : 21;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate type
    const parsedType = RankingType.parse(type);

    let items: any[] = [];

    switch (parsedType) {
      case 'top-supporters':
        // Members with highest out-degree (most supporting activity)
        const topSupporters = await prisma.metricsMemberTotal.findMany({
          where: { age },
          include: {
            member: true
          },
          orderBy: {
            out_degree_w: 'desc'
          },
          take: limit
        });

        items = topSupporters.map((metric, index) => ({
          rank: index + 1,
          memberId: metric.member.member_id,
          name: metric.member.name,
          score: metric.out_degree_w
        }));
        break;

      case 'top-beneficiaries':
        // Members with highest in-degree (most supported)
        const topBeneficiaries = await prisma.metricsMemberTotal.findMany({
          where: { age },
          include: {
            member: true
          },
          orderBy: {
            in_degree_w: 'desc'
          },
          take: limit
        });

        items = topBeneficiaries.map((metric, index) => ({
          rank: index + 1,
          memberId: metric.member.member_id,
          name: metric.member.name,
          score: metric.in_degree_w
        }));
        break;

      case 'most-central':
        // Members with highest betweenness centrality
        const mostCentral = await prisma.metricsMemberTotal.findMany({
          where: {
            age,
            betweenness: {
              not: null
            }
          },
          include: {
            member: true
          },
          orderBy: {
            betweenness: 'desc'
          },
          take: limit
        });

        items = mostCentral.map((metric, index) => ({
          rank: index + 1,
          memberId: metric.member.member_id,
          name: metric.member.name,
          score: metric.betweenness || 0
        }));
        break;
    }

    const response: RankingsResponse['_output'] = {
      type: parsedType,
      items
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}