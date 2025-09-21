const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function updateMemberParties() {
  try {
    console.log('📊 Reading member.xlsx file...');

    // Excel 파일 읽기
    const workbook = XLSX.readFile(path.join(__dirname, '../member.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON으로 변환
    const memberData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Found ${memberData.length} members in Excel file`);
    console.log('첫 번째 행 샘플:', memberData[0]);

    let updated = 0;
    let matched = 0;
    let errors = [];

    // 데이터베이스의 22대 국회의원 가져오기
    const dbMembers = await prisma.member.findMany({
      where: { age: 22 },
      select: { member_id: true, name: true, party: true }
    });

    console.log(`💾 Found ${dbMembers.length} members in database`);

    // 각 Excel 행에 대해 처리
    for (const excelMember of memberData) {
      try {
        // Excel 컬럼명 확인 (첫 번째 행에서 컬럼명 확인)
        const name = excelMember['이름'] || excelMember['성명'] || excelMember['의원명'] || excelMember['name'];
        const party = excelMember['정당'] || excelMember['소속정당'] || excelMember['party'];

        if (!name || !party) {
          console.log('❌ 이름 또는 정당 정보가 없음:', excelMember);
          continue;
        }

        // 이름 정규화 함수
        const normalizeName = (name) => {
          return name.replace(/\s+/g, '').replace(/[^가-힣a-zA-Z]/g, '');
        };

        // DB에서 해당 의원 찾기
        const dbMember = dbMembers.find(member =>
          normalizeName(member.name) === normalizeName(name)
        );

        if (dbMember) {
          matched++;

          // 정당 정보가 다르면 업데이트
          if (dbMember.party !== party) {
            await prisma.member.update({
              where: { member_id: dbMember.member_id },
              data: {
                party: party,
                updated_at: new Date()
              }
            });

            console.log(`✅ Updated ${name}: ${dbMember.party || 'null'} → ${party}`);
            updated++;
          }
        } else {
          console.log(`⚠️ No match found for: ${name}`);
        }

      } catch (error) {
        const errorMsg = `Failed to process ${excelMember.name || 'unknown'}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // 결과 출력
    const results = {
      total: memberData.length,
      matched,
      updated,
      errors: errors.length
    };

    console.log('\n🎯 업데이트 완료 결과:');
    console.log(`- 총 Excel 데이터: ${results.total}명`);
    console.log(`- 매칭된 의원: ${results.matched}명`);
    console.log(`- 업데이트된 의원: ${results.updated}명`);
    console.log(`- 오류: ${results.errors}개`);

    // 최종 정당별 통계
    const finalStats = await prisma.member.groupBy({
      by: ['party'],
      _count: { party: true },
      where: {
        age: 22,
        party: { not: null }
      },
      orderBy: { _count: { party: 'desc' } }
    });

    console.log('\n📊 최종 정당별 현황:');
    finalStats.forEach(stat => {
      console.log(`- ${stat.party}: ${stat._count.party}명`);
    });

    return results;

  } catch (error) {
    console.error('❌ 업데이트 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  updateMemberParties()
    .then(results => {
      console.log('\n✅ 스크립트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 스크립트 실패:', error);
      process.exit(1);
    });
}

module.exports = { updateMemberParties };