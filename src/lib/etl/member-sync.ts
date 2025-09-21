import { prisma } from '@/lib/prisma';
import { MemberApiClient, MemberInfo } from '@/lib/api/member-api';

export class MemberSyncService {
  private memberApi: MemberApiClient;

  constructor() {
    this.memberApi = new MemberApiClient();
  }

  /**
   * 의원 정당 정보 동기화
   */
  async syncMemberParties(): Promise<{
    total: number;
    matched: number;
    updated: number;
    errors: string[];
  }> {
    console.log('🚀 Starting member party synchronization...');

    try {
      // 1. API에서 의원 정보 가져오기
      const apiMembers = await this.memberApi.fetchMembers();
      console.log(`📡 Fetched ${apiMembers.length} members from API`);

      // 2. 데이터베이스에서 현재 의원 목록 가져오기
      const dbMembers = await prisma.member.findMany({
        where: { age: 22 },
        select: { member_id: true, name: true, party: true }
      });
      console.log(`💾 Found ${dbMembers.length} members in database`);

      // 3. 이름 매칭으로 정당 정보 업데이트
      const results = {
        total: dbMembers.length,
        matched: 0,
        updated: 0,
        errors: [] as string[]
      };

      for (const dbMember of dbMembers) {
        try {
          // API에서 동일한 이름의 의원 찾기
          const apiMember = apiMembers.find(api =>
            this.normalizedNameMatch(api.name, dbMember.name)
          );

          if (apiMember) {
            results.matched++;

            // 정당 정보 정제
            const cleanParty = this.memberApi.cleanPartyName(apiMember.party);

            // 정당 정보가 다르면 업데이트
            if (dbMember.party !== cleanParty) {
              await prisma.member.update({
                where: { member_id: dbMember.member_id },
                data: {
                  party: cleanParty,
                  updated_at: new Date()
                }
              });

              console.log(`✅ Updated ${dbMember.name}: ${dbMember.party || 'null'} → ${cleanParty}`);
              results.updated++;
            }
          } else {
            console.log(`⚠️ No match found for: ${dbMember.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to update ${dbMember.name}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      console.log('✅ Member party synchronization completed:', results);
      return results;

    } catch (error) {
      console.error('Member party sync failed:', error);
      throw error;
    }
  }

  /**
   * 정규화된 이름 매칭 (공백, 특수문자 제거)
   */
  private normalizedNameMatch(name1: string, name2: string): boolean {
    const normalize = (name: string) =>
      name.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '').toLowerCase();

    return normalize(name1) === normalize(name2);
  }

  /**
   * 정당 정보 통계 조회
   */
  async getPartyStats(): Promise<{ party: string; count: number }[]> {
    const stats = await prisma.member.groupBy({
      by: ['party'],
      _count: { party: true },
      where: {
        age: 22,
        party: { not: null }
      },
      orderBy: { _count: { party: 'desc' } }
    });

    return stats.map(stat => ({
      party: stat.party || '무소속',
      count: stat._count.party
    }));
  }

  /**
   * 정당 정보가 없는 의원 수 조회
   */
  async getMembersWithoutParty(): Promise<number> {
    return await prisma.member.count({
      where: {
        age: 22,
        party: null
      }
    });
  }
}