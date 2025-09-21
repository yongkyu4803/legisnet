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
  memberId: string | null;
  onClose: () => void;
}

export function MemberDetailPanel({ memberId, onClose }: MemberDetailPanelProps) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) {
      setMember(null);
      return;
    }

    const fetchMemberDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/members/${memberId}`);
        if (!response.ok) {
          throw new Error('의원 정보를 불러올 수 없습니다');
        }

        const data = await response.json();
        setMember(data);
      } catch (err) {
        console.error('Failed to fetch member detail:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberDetail();
  }, [memberId]);

  if (!memberId) return null;

  return (
    <div className="fixed inset-0 lg:inset-y-0 lg:right-0 w-full lg:w-96 xl:w-[28rem] bg-white shadow-xl border-l z-50 overflow-hidden mobile-detail tablet-detail desktop-detail">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 lg:p-4 border-b bg-gray-50">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">의원 상세정보</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4">
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

          {member && (
            <>
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                    <User className="w-4 h-4 lg:w-5 lg:h-5" />
                    기본정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {member.party && (
                        <Badge variant="secondary" className="text-xs lg:text-sm">{member.party}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs lg:text-sm">{member.age}대 국회</Badge>
                    </div>
                  </div>

                  {member.committee && (
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                      <Building className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="break-words">{member.committee}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Network Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                    네트워크 지표
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 lg:gap-4">
                    <div className="text-center p-2 lg:p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg lg:text-2xl font-bold text-blue-600">{member.inDegree}</div>
                      <div className="text-xs text-blue-800">받은 지원</div>
                    </div>
                    <div className="text-center p-2 lg:p-3 bg-green-50 rounded-lg">
                      <div className="text-lg lg:text-2xl font-bold text-green-600">{member.outDegree}</div>
                      <div className="text-xs text-green-800">제공한 지원</div>
                    </div>
                  </div>

                  {member.betweenness && member.betweenness > 0 && (
                    <div className="text-center p-2 lg:p-3 bg-purple-50 rounded-lg">
                      <div className="text-base lg:text-lg font-bold text-purple-600">
                        {member.betweenness.toFixed(3)}
                      </div>
                      <div className="text-xs text-purple-800">중심성 점수</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Proposed Bills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                    <FileText className="w-4 h-4 lg:w-5 lg:h-5" />
                    대표발의 법안 ({member.billsProposed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {member.billsProposed.length > 0 ? (
                    <div className="space-y-2 max-h-32 lg:max-h-40 overflow-y-auto">
                      {member.billsProposed.slice(0, 5).map((bill) => (
                        <div key={bill.billId} className="p-2 border rounded text-xs">
                          <div className="font-medium text-gray-900 line-clamp-2 break-words">
                            {bill.name}
                          </div>
                          <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                            <span className="text-gray-500 text-xs">
                              공동발의자 {bill.coSponsorsCount}명
                            </span>
                            {bill.result && (
                              <Badge variant="outline" className="text-xs">
                                {bill.result}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {member.billsProposed.length > 5 && (
                        <div className="text-center text-xs text-gray-500 pt-2">
                          +{member.billsProposed.length - 5}개 더
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">대표발의 법안이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* Co-sponsored Bills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                    <GitBranch className="w-4 h-4 lg:w-5 lg:h-5" />
                    공동발의 법안 ({member.billsCosponsored.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {member.billsCosponsored.length > 0 ? (
                    <div className="space-y-2 max-h-32 lg:max-h-40 overflow-y-auto">
                      {member.billsCosponsored.slice(0, 5).map((bill) => (
                        <div key={bill.billId} className="p-2 border rounded text-xs">
                          <div className="font-medium text-gray-900 line-clamp-2 break-words">
                            {bill.name}
                          </div>
                          <div className="text-gray-500 mt-1 text-xs break-words">
                            대표발의: {bill.proposerName}
                          </div>
                        </div>
                      ))}
                      {member.billsCosponsored.length > 5 && (
                        <div className="text-center text-xs text-gray-500 pt-2">
                          +{member.billsCosponsored.length - 5}개 더
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">공동발의 법안이 없습니다.</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Collaborators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                    주요 협력 의원
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {member.topCollaborators.length > 0 ? (
                    <div className="space-y-2">
                      {member.topCollaborators.slice(0, 5).map((collaborator) => (
                        <div key={collaborator.memberId} className="p-2 border rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs lg:text-sm truncate">{collaborator.name}</div>
                              {collaborator.party && (
                                <div className="text-xs text-gray-500 truncate">{collaborator.party}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-green-600 font-medium">{collaborator.supportedToTarget}회</span>
                              <span className="text-gray-500">지원</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1">
                              <span className="text-blue-600 font-medium">{collaborator.supportedFromTarget}회</span>
                              <span className="text-gray-500">받음</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">협력 데이터가 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}