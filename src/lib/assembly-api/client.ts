import xml2js from 'xml2js';

// MVP: 핵심 4개 필드에 집중
export interface AssemblyBillData {
  BILL_ID: string;           // 법안 ID
  BILL_NO?: string;          // 의안번호
  BILL_NAME: string;         // 법안명
  AGE: number;               // 국회 대수 (22대 고정)
  PROPOSE_DT?: string;       // 제안일
  RST_PROPOSER: string;      // 대표발의자
  PUBL_PROPOSER?: string;    // 공동발의자들 (쉼표 구분)
}

export interface AssemblyApiResponse {
  nzmimeepazxkubdpn: {
    head: Array<{
      list_total_count: number;
    }>;
    row?: AssemblyBillData[];
  };
}

export class AssemblyApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.ASSEMBLY_API_BASE_URL || 'http://open.assembly.go.kr/portal/openapi';
    this.apiKey = process.env.ASSEMBLY_API_KEY || '';
  }

  /**
   * 의안 목록 조회
   */
  async getBills(params: {
    age?: number;
    pSize?: number;
    pIndex?: number;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
  } = {}) {
    const {
      age = 22, // MVP: 22대 국회 기본값
      pSize = 100,
      pIndex = 1,
      startDate,
      endDate
    } = params;

    const queryParams = new URLSearchParams({
      Key: this.apiKey,
      Type: 'xml',
      pIndex: pIndex.toString(),
      pSize: pSize.toString(),
      AGE: age.toString(),
    });

    if (startDate) {
      queryParams.append('PROPOSE_DT_START', startDate);
    }
    if (endDate) {
      queryParams.append('PROPOSE_DT_END', endDate);
    }

    const url = `${this.baseUrl}/nzmimeepazxkubdpn?${queryParams}`;

    try {
      console.log(`📡 Fetching from Assembly API: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LegisNet/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      return await this.parseXmlResponse(xmlText);
    } catch (error) {
      console.error('Assembly API request failed:', error);
      throw error;
    }
  }

  /**
   * XML 응답 파싱
   */
  private async parseXmlResponse(xmlText: string): Promise<AssemblyApiResponse> {
    const parser = new xml2js.Parser({
      explicitArray: true,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });

    try {
      const result = await parser.parseStringPromise(xmlText);

      // Assembly API의 실제 응답 구조에 맞게 조정
      if (result.nzmimeepazxkubdpn) {
        return result;
      } else {
        // 에러 응답 처리
        console.warn('Unexpected XML structure:', result);
        return {
          nzmimeepazxkubdpn: {
            head: [{ list_total_count: 0 }],
            row: []
          }
        };
      }
    } catch (error) {
      console.error('XML parsing failed:', error);
      throw new Error('Failed to parse XML response');
    }
  }

  /**
   * 공동발의자 문자열 파싱
   * "배진교,양경규,장혜영,강은미,도종환,심상정,황보승희,정청래,김민석" → ["배진교", "양경규", ...]
   */
  parseCoSponsors(publProposer?: string): string[] {
    if (!publProposer) return [];

    return publProposer
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  // MVP: 처리결과 매핑 제거 (핵심 기능에 불필요)

  /**
   * 날짜 파싱 (YYYY-MM-DD 형태로 변환)
   */
  parseDate(dateStr?: string): string | null {
    if (!dateStr) return null;

    // 다양한 날짜 형식 처리
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  }

  /**
   * 페이지네이션을 통한 전체 데이터 수집 (MVP: 22대 국회)
   */
  async getAllBills(params: {
    age?: number;
    startDate?: string;
    endDate?: string;
    maxPages?: number;
  } = {}): Promise<AssemblyBillData[]> {
    const {
      age = 22, // MVP: 22대 국회 기본값
      maxPages = 200, // 전체 데이터 수집을 위해 증가
      ...otherParams
    } = params;
    const allBills: AssemblyBillData[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await this.getBills({
        age, // MVP: 22대 명시적 전달
        ...otherParams,
        pIndex: currentPage,
        pSize: 100
      });

      const { head, row } = response.nzmimeepazxkubdpn;
      const totalCount = head[0]?.list_total_count || 0;
      totalPages = Math.ceil(totalCount / 100);

      if (row && row.length > 0) {
        allBills.push(...row);
      }

      console.log(`📄 Page ${currentPage}/${Math.min(totalPages, maxPages)}: ${row?.length || 0} bills fetched`);

      currentPage++;

      // API 호출 간격 (rate limiting 고려)
      if (currentPage <= Math.min(totalPages, maxPages)) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }

    } while (currentPage <= Math.min(totalPages, maxPages) && currentPage <= totalPages);

    console.log(`✅ Total bills fetched: ${allBills.length}`);
    return allBills;
  }
}