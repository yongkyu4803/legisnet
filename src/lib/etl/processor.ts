import { prisma } from '@/lib/prisma';
import { AssemblyApiClient, AssemblyBillData } from '../assembly-api/client';

// MVP: 핵심 필드만 포함
export interface ProcessedBill {
  billId: string;
  billNo?: string;
  billName: string;
  age: number;
  proposeDate?: Date;
  proposerRep: string;
  coSponsors: string[];
}

export class ETLProcessor {
  private apiClient: AssemblyApiClient;

  constructor() {
    this.apiClient = new AssemblyApiClient();
  }

  /**
   * MVP: 22대 국회 법안 데이터 처리
   */
  async processBillsFromAPI(params: {
    age?: number;
    startDate?: string;
    endDate?: string;
    maxPages?: number;
  } = {}): Promise<{
    processed: number;
    skipped: number;
    errors: string[];
  }> {
    const { age = 22, ...otherParams } = params; // MVP: 22대 기본값
    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      console.log('🚀 Starting MVP ETL process for 22nd National Assembly...');

      // 1. API에서 데이터 수집
      const rawBills = await this.apiClient.getAllBills({ age, ...otherParams });

      if (rawBills.length === 0) {
        console.log('⚠️ No bills found from API');
        return results;
      }

      // 2. 데이터 처리 및 저장
      for (const rawBill of rawBills) {
        try {
          const processed = await this.processSingleBill(rawBill);
          if (processed) {
            results.processed++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error(`Error processing bill ${rawBill.BILL_ID}:`, error);
          results.errors.push(`${rawBill.BILL_ID}: ${error instanceof Error ? error.message : String(error)}`);
          results.skipped++;
        }
      }

      console.log('✅ ETL process completed:', results);
      return results;

    } catch (error) {
      console.error('ETL process failed:', error);
      results.errors.push(error instanceof Error ? error.message : String(error));
      return results;
    }
  }

  /**
   * 단일 법안 데이터 처리
   */
  private async processSingleBill(rawBill: AssemblyBillData): Promise<boolean> {
    // 1. 데이터 정제
    const cleaned = this.cleanBillData(rawBill);

    // 2. 필수 데이터 검증
    if (!cleaned.billId || !cleaned.billName || !cleaned.proposerRep) {
      console.warn(`Skipping bill due to missing required data:`, cleaned);
      return false;
    }

    // 3. 중복 체크
    const existing = await prisma.bill.findUnique({
      where: { bill_id: cleaned.billId }
    });

    if (existing) {
      console.log(`Bill ${cleaned.billId} already exists, skipping...`);
      return false;
    }

    // 4. 트랜잭션으로 데이터 저장
    try {
      await prisma.$transaction(async (tx) => {
        // 대표발의자 upsert
        const proposerRep = await this.upsertMember(tx, cleaned.proposerRep, cleaned.age);

        // 공동발의자들 upsert
        const coSponsorMembers = await Promise.all(
          cleaned.coSponsors.map(name => this.upsertMember(tx, name, cleaned.age))
        );

        // 법안 생성 (MVP: 핵심 필드만)
        await tx.bill.create({
          data: {
            bill_id: cleaned.billId,
            bill_no: cleaned.billNo || null,
            bill_name: cleaned.billName,
            age: cleaned.age,
            propose_date: cleaned.proposeDate || null,
            proposer_rep_id: proposerRep.member_id
          }
        });

        // 공동발의자 관계 생성
        if (coSponsorMembers.length > 0) {
          await tx.billCosponsor.createMany({
            data: coSponsorMembers.map(member => ({
              bill_id: cleaned.billId,
              member_id: member.member_id
            }))
          });
        }
      });

      console.log(`✅ Processed bill: ${cleaned.billName}`);
      return true;

    } catch (error) {
      console.error(`Failed to save bill ${cleaned.billId}:`, error);
      throw error;
    }
  }

  /**
   * MVP: 법안 데이터 정제 (핵심 필드만)
   */
  private cleanBillData(raw: AssemblyBillData): ProcessedBill {
    // XML 파싱 결과로 배열이 될 수 있으므로 안전하게 처리
    const safeString = (value: any): string => {
      if (Array.isArray(value)) return value[0]?.toString() || '';
      return value?.toString() || '';
    };

    // 대표발의자 이름 정제 (복수 이름 분리)
    const rawProposerRep = safeString(raw.RST_PROPOSER).trim();
    const proposerRep = this.splitNames(rawProposerRep)[0] || rawProposerRep; // 첫 번째 이름만 사용

    return {
      billId: safeString(raw.BILL_ID),
      billNo: safeString(raw.BILL_NO) || undefined,
      billName: safeString(raw.BILL_NAME).trim(),
      age: parseInt(safeString(raw.AGE)) || 22, // MVP: 22대 기본값
      proposeDate: raw.PROPOSE_DT ? this.parseDate(safeString(raw.PROPOSE_DT)) : undefined,
      proposerRep: proposerRep,
      coSponsors: this.apiClient.parseCoSponsors(safeString(raw.PUBL_PROPOSER))
    };
  }

  /**
   * 의원 데이터 upsert
   */
  private async upsertMember(tx: any, name: string, age: number) {
    return await tx.member.upsert({
      where: {
        uq_member_name_age: {
          name: name,
          age: age
        }
      },
      update: {
        updated_at: new Date()
      },
      create: {
        name: name,
        age: age
      }
    });
  }

  /**
   * 날짜 파싱
   */
  private parseDate(dateStr: string): Date | undefined {
    const parsed = this.apiClient.parseDate(dateStr);
    return parsed ? new Date(parsed) : undefined;
  }

  /**
   * 쉼표로 구분된 이름들을 배열로 분리
   */
  private splitNames(nameString: string): string[] {
    if (!nameString || !nameString.includes(',')) {
      return [nameString.trim()];
    }

    return nameString
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  // MVP: 법안 결과 매핑 제거 (핵심 기능에 불필요)

  /**
   * MVP: 간소화된 통계 조회
   */
  async getStats() {
    const [
      memberCount,
      billCount,
      billCosponsorCount
    ] = await Promise.all([
      prisma.member.count(),
      prisma.bill.count(),
      prisma.billCosponsor.count()
    ]);

    return {
      members: memberCount,
      bills: billCount,
      cosponsorships: billCosponsorCount,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * MVP: 데이터베이스 초기화 (간소화)
   */
  async resetDatabase() {
    console.log('🗑️ Resetting MVP database...');

    try {
      // 외래 키 제약 조건 때문에 순서 중요
      await prisma.billCosponsor.deleteMany();
      console.log('🗑️ Deleted all bill cosponsors');

      await prisma.bill.deleteMany();
      console.log('🗑️ Deleted all bills');

      await prisma.member.deleteMany();
      console.log('🗑️ Deleted all members');

      console.log('✅ MVP Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }
}