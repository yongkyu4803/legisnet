import { NextRequest, NextResponse } from "next/server";
import { ETLProcessor } from "@/lib/etl/processor";
import { NetworkBuilder } from "@/lib/etl/network-builder";
import { MemberSyncService } from "@/lib/etl/member-sync";

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const age = parseInt(searchParams.get('age') || '22');
    const startDate = searchParams.get('from');
    const endDate = searchParams.get('to');
    const maxPages = parseInt(searchParams.get('maxPages') || '100'); // 전체 데이터 수집을 위해 증가
    const buildNetwork = searchParams.get('network') !== 'false';
    const reset = searchParams.get('reset') === 'true'; // 데이터베이스 리셋 옵션

    console.log(`🚀 Starting ETL sync for age ${age}...`);
    const startTime = Date.now();

    // 0. 데이터베이스 리셋 (요청 시)
    const processor = new ETLProcessor();
    if (reset) {
      console.log('🗑️ Resetting database...');
      await processor.resetDatabase();
    }

    // 1. ETL 처리
    const etlResults = await processor.processBillsFromAPI({
      age,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      maxPages
    });

    let networkResults = null;

    // 2. 네트워크 구축 (선택적)
    if (buildNetwork && etlResults.processed > 0) {
      console.log('🕸️ Building network...');
      const networkBuilder = new NetworkBuilder();
      networkResults = await networkBuilder.buildSupportNetwork(age);
    }

    // 3. 의원 정당 정보 동기화
    let memberSyncResults = null;
    if (etlResults.processed > 0) {
      console.log('🏛️ Syncing member party information...');
      const memberSync = new MemberSyncService();
      memberSyncResults = await memberSync.syncMemberParties();
      console.log(`✅ Member party sync completed: ${memberSyncResults.matched}/${memberSyncResults.total} matched, ${memberSyncResults.updated} updated`);
    }

    // 4. 통계 조회 및 검증
    const stats = await processor.getStats();

    // 의원 수 검증 (300명 초과시 경고)
    if (stats.members > 320) {
      console.warn(`⚠️ Warning: Member count (${stats.members}) exceeds expected range (300-320). Possible data contamination.`);
    }

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      duration: `${duration}ms`,
      etl: etlResults,
      network: networkResults,
      memberSync: memberSyncResults,
      stats,
      timestamp: new Date().toISOString()
    };

    console.log('✅ ETL sync completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('ETL sync failed:', error);
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
    const processor = new ETLProcessor();
    const stats = await processor.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get ETL stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}