import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q'); // 검색어
    const age = searchParams.get('age') ? parseInt(searchParams.get('age')!) : 22; // MVP: 22대 기본값
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = { age };

    if (q) {
      // SQLite doesn't support case insensitive mode, so use contains only
      where.name = {
        contains: q
      };
    }

    // Get total count
    const total = await prisma.member.count({ where });

    // Get members with pagination (MVP: 핵심 정보만)
    const members = await prisma.member.findMany({
      where,
      include: {
        bills_proposed: {
          select: {
            bill_id: true
          }
        },
        bills_cosponsor: {
          select: {
            bill_id: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ],
      skip,
      take: pageSize
    });

    const items = members.map(member => ({
      memberId: member.member_id,
      name: member.name,
      age: member.age,
      // MVP: 계산된 통계
      proposedCount: member.bills_proposed.length,
      cosponsorCount: member.bills_cosponsor.length,
      totalBills: member.bills_proposed.length + member.bills_cosponsor.length
    }));

    const response = {
      items,
      page,
      pageSize,
      total,
      hasMore: skip + pageSize < total
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Members search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}