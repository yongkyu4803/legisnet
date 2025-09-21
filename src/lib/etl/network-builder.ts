import { prisma } from '@/lib/prisma';

export class NetworkBuilder {
  /**
   * MVP: 22대 국회 네트워크 구축 (간소화된 버전)
   * 실시간 계산 방식으로 변경, 별도 네트워크 테이블 불필요
   */
  async buildSupportNetwork(age: number = 22): Promise<{
    edgesCreated: number;
    metricsUpdated: number;
  }> {
    console.log(`🕸️ MVP: Network data ready for age ${age} (real-time calculation)`);

    // MVP: 실시간 계산 방식이므로 별도 엣지/메트릭 테이블이 불필요
    // Graph API에서 Bills/BillCosponsors 데이터로 실시간 네트워크 생성

    const stats = await this.getNetworkStats(age);
    console.log(`✅ MVP: Network ready - ${stats.nodes} members, ${stats.relationships} relationships`);

    return {
      edgesCreated: stats.relationships,
      metricsUpdated: stats.nodes
    };
  }

  /**
   * MVP: 실시간 네트워크 통계 (Bill/BillCosponsor 기반)
   */
  async getNetworkStats(age: number = 22) {
    const [
      memberCount,
      billCount,
      cosponsorshipCount
    ] = await Promise.all([
      prisma.member.count({ where: { age } }),
      prisma.bill.count({ where: { age } }),
      prisma.billCosponsor.count({
        where: {
          bill: { age }
        }
      })
    ]);

    return {
      age,
      nodes: memberCount,
      bills: billCount,
      relationships: cosponsorshipCount,
      density: memberCount > 1 ? cosponsorshipCount / (memberCount * (memberCount - 1)) : 0
    };
  }
}