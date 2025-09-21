import { NextRequest, NextResponse } from "next/server";
import { NetworkBuilder } from "@/lib/etl/network-builder";

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const age = parseInt(searchParams.get('age') || '21');

    console.log(`🕸️ Building network for age ${age}...`);
    const startTime = Date.now();

    const networkBuilder = new NetworkBuilder();
    const results = await networkBuilder.buildSupportNetwork(age);

    // 네트워크 통계 조회
    const stats = await networkBuilder.getNetworkStats(age);

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      duration: `${duration}ms`,
      results,
      stats,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Network building completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Network building failed:', error);
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
    const searchParams = request.nextUrl.searchParams;
    const age = parseInt(searchParams.get('age') || '21');

    const networkBuilder = new NetworkBuilder();
    const stats = await networkBuilder.getNetworkStats(age);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get network stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}