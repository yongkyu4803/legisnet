'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Building,
  GitBranch,
  Users,
  TrendingUp,
  FileText,
  X,
  ExternalLink
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MemberDetail {
  memberId: string;
  name: string;
  party?: string;
  committee?: string;
  age: number;
  inDegree: number;
  outDegree: number;
  betweenness?: number;
  billsProposed: Array<{
    billId: string;
    name: string;
    committee?: string;
    proposeDate?: string;
    result?: string;
    coSponsorsCount: number;
  }>;
  billsCosponsored: Array<{
    billId: string;
    name: string;
    proposerName: string;
    proposeDate?: string;
  }>;
  topCollaborators: Array<{
    memberId: string;
    name: string;
    party?: string;
    supportedToTarget: number;
    supportedFromTarget: number;
    totalCollaboration: number;
  }>;
}

interface MemberDetailPanelProps {
  memberId: string;
  onClose: () => void;
}

export function MemberDetailPanel({ memberId, onClose }: MemberDetailPanelProps) {
  const [memberData, setMemberData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderContent = (member: MemberDetail) => (
    <>
      {/* Member Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <User className="w-4 h-4 lg:w-5 lg:h-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{member.name}</h3>
              {member.party && (
                <Badge variant="secondary" className="mt-1">
                  {member.party}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-600">{member.inDegree}</div>
              <div className="text-blue-800">받은 지원</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-600">{member.outDegree}</div>
              <div className="text-green-800">제공한 지원</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Proposed - 주석처리 */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <GitBranch className="w-4 h-4 lg:w-5 lg:h-5" />
            대표발의 법안 ({member.billsProposed.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.billsProposed.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {member.billsProposed.slice(0, 10).map((bill) => (
                <div key={bill.billId} className="p-2 border rounded text-xs lg:text-sm">
                  <div className="font-medium line-clamp-2">{bill.name}</div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>{bill.proposeDate}</span>
                    <span>{bill.coSponsorsCount}명 공동발의</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">대표발의 법안이 없습니다.</p>
          )}
        </CardContent>
      </Card> */}

      {/* Top Collaborators - 공동발의 지원을 많이 해준 의원 기준 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
            <Users className="w-4 h-4 lg:w-5 lg:h-5" />
            공동발의 지원 의원 (TOP 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.topCollaborators.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {member.topCollaborators
                .sort((a, b) => b.supportedToTarget - a.supportedToTarget) // 지원해준 횟수 기준 내림차순 정렬
                .slice(0, 10)
                .map((collaborator, index) => (
                <div key={collaborator.memberId} className="p-3 border rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{collaborator.name}</div>
                        {collaborator.party && (
                          <div className="text-xs text-gray-500 truncate">{collaborator.party}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600 font-bold text-lg">{collaborator.supportedToTarget}회</span>
                      <span className="text-gray-600">공동발의 지원</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">공동발의 지원 데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </>
  );

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!memberId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/members/${memberId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch member data: ${response.statusText}`);
        }

        const data: MemberDetail = await response.json();
        setMemberData(data);
      } catch (err) {
        console.error('Failed to fetch member data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [memberId]);

  if (!memberId) return null;

  return (
    <>
      {/* Mobile: Bottom slide-up modal */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 top-1/3 bg-white shadow-xl border-t rounded-t-lg z-50 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">의원 상세정보</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-gray-600">정보를 불러오는 중...</span>
              </div>
            )}
            {error && (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            )}
            {memberData && renderContent(memberData)}
          </div>
        </div>
      </div>

      {/* Desktop/Tablet: Right sidebar */}
      <div className="hidden lg:block fixed inset-y-0 right-0 w-96 xl:w-[28rem] bg-white shadow-xl border-l z-40 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Desktop Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">의원 상세정보</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-gray-600">정보를 불러오는 중...</span>
              </div>
            )}
            {error && (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            )}
            {memberData && renderContent(memberData)}
          </div>
        </div>
      </div>
    </>
  );
}