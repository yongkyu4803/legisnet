import { NextRequest, NextResponse } from "next/server";
import { MemberSyncService } from "@/lib/etl/member-sync";

export async function POST(request: NextRequest) {
  try {
    console.log('🏛️ Starting member party synchronization...');
    const startTime = Date.now();

    const memberSync = new MemberSyncService();
    const results = await memberSync.syncMemberParties();

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      duration: `${duration}ms`,
      results,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Member party sync completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Member party sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const memberSync = new MemberSyncService();

    // Get party statistics
    const partyStats = await memberSync.getPartyStats();
    const membersWithoutParty = await memberSync.getMembersWithoutParty();

    return NextResponse.json({
      success: true,
      stats: {
        partyStats,
        membersWithoutParty,
        totalParties: partyStats.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get member party stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}