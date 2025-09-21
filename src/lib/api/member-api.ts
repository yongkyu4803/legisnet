import xml2js from 'xml2js';

export interface MemberInfo {
  name: string;  // NAAS_NM
  party: string; // PLPT_NM
  code: string;  // NAAS_CD
  age: string;   // GTELT_ERACO
}

export class MemberApiClient {
  private readonly baseUrl = 'https://open.assembly.go.kr/portal/openapi';
  private readonly apiKey = process.env.ASSEMBLY_API_KEY || '7093b0f3d59643a89830a541530198d4';

  /**
   * 국회의원 정보 조회 (ALLNAMEMBER API)
   */
  async fetchMembers(): Promise<MemberInfo[]> {
    try {
      const url = `${this.baseUrl}/ALLNAMEMBER?Key=${this.apiKey}&Type=xml&pSize=1000`;

      console.log('🔗 Fetching member info from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlData = await response.text();
      const result = await xml2js.parseStringPromise(xmlData);

      if (!result.ALLNAMEMBER?.row) {
        throw new Error('Invalid API response structure');
      }

      const members: MemberInfo[] = result.ALLNAMEMBER.row
        .map((row: any) => ({
          name: this.extractValue(row.NAAS_NM),
          party: this.extractValue(row.PLPT_NM),
          code: this.extractValue(row.NAAS_CD),
          age: this.extractValue(row.GTELT_ERACO)
        }))
        .filter((member: MemberInfo) => {
          // 22대 국회 의원만 필터링
          return member.name &&
                 member.party &&
                 member.age &&
                 member.age.includes('제22대');
        });

      console.log(`📊 Fetched ${members.length} members from 22nd Assembly`);
      return members;

    } catch (error) {
      console.error('Failed to fetch member info:', error);
      throw error;
    }
  }

  /**
   * 22대 국회 의원만 필터링
   */
  filter22ndAssemblyMembers(members: MemberInfo[]): MemberInfo[] {
    return members.filter(member =>
      member.age && member.age.includes('제22대')
    );
  }

  /**
   * XML 값 추출 (배열일 수 있으므로 안전하게 처리)
   */
  private extractValue(value: any): string {
    if (Array.isArray(value)) {
      return value[0]?.toString()?.trim() || '';
    }
    return value?.toString()?.trim() || '';
  }

  /**
   * 정당명 정제 (여러 정당이 있을 경우 첫 번째만 사용)
   */
  cleanPartyName(party: string): string {
    if (!party) return '';

    // "/" 구분자로 나뉜 경우 첫 번째 정당만 사용
    const parties = party.split('/');
    return parties[0].trim();
  }
}