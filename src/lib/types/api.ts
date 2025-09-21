import { z } from "zod";

/** 공통 타입 */
export const MemberId = z.string().uuid();
export const BillId = z.string(); // API BILL_ID 그대로
export const Age = z.number().int().min(1);

export const BillResult = z.enum([
  "가결", "부결", "임기만료폐기", "계류", "철회", "대안반영폐기", "수정가결", "기타"
]);

/** /api/graph (proposer | cosupport) */
export const GraphMode = z.enum(["proposer", "cosupport"]);

export const GraphNode = z.object({
  id: z.string(),            // "이름|21" 또는 member_id(uuid) 권장(프런트에서 label 분리)
  label: z.string(),         // 의원 이름
  in: z.number().optional(), // 가중 in-degree
  out: z.number().optional(),// 가중 out-degree
  community: z.string().optional(),
  meta: z.object({
    age: Age.optional(),
    party: z.string().nullable().optional(),
    committee: z.string().nullable().optional(),
  }).optional()
});

export const GraphEdge = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number().nonnegative(),
  lastDate: z.string().date().optional(), // ISO date
});

export const GraphResponse = z.object({
  mode: GraphMode,
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
  stats: z.object({
    nodeCount: z.number().int(),
    edgeCount: z.number().int(),
    timeRange: z.object({
      from: z.string().date().nullable(),
      to: z.string().date().nullable(),
    })
  }).optional()
});

/** /api/bills */
export const BillItem = z.object({
  billId: BillId,
  billNo: z.string().nullable(),
  billName: z.string(),
  committee: z.string().nullable(),
  age: Age,
  proposeDate: z.string().date().nullable(),
  result: BillResult.nullable(),
  detailUrl: z.string().url().nullable(),
  coactorUrl: z.string().url().nullable(),
  proposerRep: z.object({
    id: MemberId.optional(),
    name: z.string()
  }),
  coSponsors: z.array(z.object({
    id: MemberId.optional(),
    name: z.string()
  }))
});

export const BillsResponse = z.object({
  items: z.array(BillItem),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0)
});

/** /api/members/:id/summary */
export const MemberSummary = z.object({
  memberId: MemberId,
  name: z.string(),
  age: Age,
  totals: z.object({
    inDegreeW: z.number().nonnegative(),
    outDegreeW: z.number().nonnegative(),
    betweenness: z.number().nullable(),
    clustering: z.number().nullable()
  }),
  topSupporters: z.array(z.object({ // (공동발의자 → 나)
    memberId: MemberId.optional(),
    name: z.string(),
    weight: z.number().int().nonnegative()
  })).max(50),
  topBeneficiaries: z.array(z.object({ // (내가 → 대표발의자)
    memberId: MemberId.optional(),
    name: z.string(),
    weight: z.number().int().nonnegative()
  })).max(50),
  recentBills: z.array(z.object({
    billId: BillId, name: z.string(), proposeDate: z.string().date().nullable()
  })).max(50)
});

/** /api/rankings?type=top-supporters */
export const RankingType = z.enum(["top-supporters", "top-beneficiaries", "most-central"]);
export const RankingItem = z.object({
  rank: z.number().int().min(1),
  memberId: MemberId.optional(),
  name: z.string(),
  score: z.number() // 의미: weight/in-degree/betweenness 등 엔드포인트별 정의
});
export const RankingsResponse = z.object({
  type: RankingType,
  items: z.array(RankingItem)
});

// Type inference helpers
export type GraphMode = z.infer<typeof GraphMode>;
export type GraphNode = z.infer<typeof GraphNode>;
export type GraphEdge = z.infer<typeof GraphEdge>;
export type GraphResponse = z.infer<typeof GraphResponse>;
export type BillItem = z.infer<typeof BillItem>;
export type BillsResponse = z.infer<typeof BillsResponse>;
export type MemberSummary = z.infer<typeof MemberSummary>;
export type RankingType = z.infer<typeof RankingType>;
export type RankingItem = z.infer<typeof RankingItem>;
export type RankingsResponse = z.infer<typeof RankingsResponse>;
export type BillResult = z.infer<typeof BillResult>;