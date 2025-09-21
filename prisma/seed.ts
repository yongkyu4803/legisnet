import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample members
  const member1 = await prisma.member.create({
    data: {
      name: '이자스민',
      age: 21,
      party: '정의당',
      committee_primary: '문화체육관광위원회'
    }
  })

  const member2 = await prisma.member.create({
    data: {
      name: '배진교',
      age: 21,
      party: '국민의힘',
      committee_primary: '교육위원회'
    }
  })

  const member3 = await prisma.member.create({
    data: {
      name: '양경규',
      age: 21,
      party: '더불어민주당',
      committee_primary: '환경노동위원회'
    }
  })

  const member4 = await prisma.member.create({
    data: {
      name: '장혜영',
      age: 21,
      party: '정의당',
      committee_primary: '여성가족위원회'
    }
  })

  // Create sample bill
  const bill1 = await prisma.bill.create({
    data: {
      bill_id: 'PRC_K2S4R0S4Q3P0L0K9J0J9I5Q7P2Q4O6',
      bill_no: '2126707',
      name: '문화다양성의 보호와 증진에 관한 법률 일부개정법률안',
      committee: '문화체육관광위원회',
      age: 21,
      propose_date: new Date('2024-05-29'),
      result: '임기만료폐기',
      proposer_rep_id: member1.member_id,
      detail_url: 'http://likms.assembly.go.kr/bill/billDetail.do?billId=PRC_K2S4R0S4Q3P0L0K9J0J9I5Q7P2Q4O6',
      coactor_url: 'http://likms.assembly.go.kr/bill/coactorListPopup.do?billId=PRC_K2S4R0S4Q3P0L0K9J0J9I5Q7P2Q4O6'
    }
  })

  // Create co-sponsors
  await prisma.billCosponsor.createMany({
    data: [
      { bill_id: bill1.bill_id, member_id: member2.member_id },
      { bill_id: bill1.bill_id, member_id: member3.member_id },
      { bill_id: bill1.bill_id, member_id: member4.member_id }
    ]
  })

  // Create support edges (co-sponsor -> proposer)
  await prisma.edgeSupport.createMany({
    data: [
      {
        src_member_id: member2.member_id,
        dst_member_id: member1.member_id,
        age: 21,
        weight: 1,
        first_date: new Date('2024-05-29'),
        last_date: new Date('2024-05-29')
      },
      {
        src_member_id: member3.member_id,
        dst_member_id: member1.member_id,
        age: 21,
        weight: 1,
        first_date: new Date('2024-05-29'),
        last_date: new Date('2024-05-29')
      },
      {
        src_member_id: member4.member_id,
        dst_member_id: member1.member_id,
        age: 21,
        weight: 1,
        first_date: new Date('2024-05-29'),
        last_date: new Date('2024-05-29')
      }
    ]
  })

  // Create member metrics
  await prisma.metricsMemberTotal.createMany({
    data: [
      {
        member_id: member1.member_id,
        age: 21,
        in_degree_w: 3,
        out_degree_w: 0,
        betweenness: 0.0,
        clustering: 0.0
      },
      {
        member_id: member2.member_id,
        age: 21,
        in_degree_w: 0,
        out_degree_w: 1,
        betweenness: 0.0,
        clustering: 0.0
      },
      {
        member_id: member3.member_id,
        age: 21,
        in_degree_w: 0,
        out_degree_w: 1,
        betweenness: 0.0,
        clustering: 0.0
      },
      {
        member_id: member4.member_id,
        age: 21,
        in_degree_w: 0,
        out_degree_w: 1,
        betweenness: 0.0,
        clustering: 0.0
      }
    ]
  })

  console.log('✅ Seeding completed!')
  console.log(`Created:`)
  console.log(`- 4 members`)
  console.log(`- 1 bill`)
  console.log(`- 3 co-sponsor relationships`)
  console.log(`- 3 support edges`)
  console.log(`- 4 member metrics`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })