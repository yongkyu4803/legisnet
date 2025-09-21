import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BillsResponse } from "@/lib/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const age = searchParams.get('age') ? parseInt(searchParams.get('age')!) : 22;
    const committee = searchParams.get('committee');
    const q = searchParams.get('q'); // search query
    const result = searchParams.get('result');

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = { age };

    if (committee) {
      where.committee = committee;
    }

    if (q) {
      where.name = {
        contains: q,
        mode: 'insensitive'
      };
    }

    if (result) {
      where.result = result;
    }

    // Get total count
    const total = await prisma.bill.count({ where });

    // Get bills with pagination
    const bills = await prisma.bill.findMany({
      where,
      include: {
        proposerRep: true,
        cosponsors: {
          include: {
            member: true
          }
        }
      },
      orderBy: {
        propose_date: 'desc'
      },
      skip,
      take: pageSize
    });

    const items = bills.map(bill => ({
      billId: bill.bill_id,
      billNo: bill.bill_no,
      billName: bill.name,
      committee: bill.committee,
      age: bill.age,
      proposeDate: bill.propose_date?.toISOString().split('T')[0] || null,
      result: bill.result,
      detailUrl: bill.detail_url,
      coactorUrl: bill.coactor_url,
      proposerRep: {
        id: bill.proposerRep.member_id,
        name: bill.proposerRep.name
      },
      coSponsors: bill.cosponsors.map(cs => ({
        id: cs.member.member_id,
        name: cs.member.name
      }))
    }));

    const response: BillsResponse['_output'] = {
      items,
      page,
      pageSize,
      total
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Bills API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}