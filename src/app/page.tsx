'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GraphMode } from '@/lib/types/api';
import { NetworkVisualization } from '@/components/network/NetworkVisualization';
import { NetworkControlPanel, DirectionMode } from '@/components/dashboard/NetworkControlPanel';
import { MemberDetailPanel } from '@/components/dashboard/MemberDetailPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberSearch } from '@/components/search/MemberSearch';
import {
  Network,
  BarChart3,
  Users,
  Activity,
  Github,
  ExternalLink
} from 'lucide-react';

export default function HomePage() {
  const [networkMode, setNetworkMode] = useState<GraphMode>('proposer');
  const [assemblyAge, setAssemblyAge] = useState(22);
  const [direction, setDirection] = useState<DirectionMode>('both');

  // direction 변경 핸들러에 로깅 추가
  const handleDirectionChange = (newDirection: DirectionMode) => {
    console.log(`[HomePage] Direction changing from ${direction} to ${newDirection}`);
    setDirection(newDirection);
    setNetworkKey(prev => prev + 1); // 네트워크 새로고침
    console.log(`[HomePage] NetworkKey incremented to force refresh`);
  };
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [networkKey, setNetworkKey] = useState(0);
  const [stats, setStats] = useState({ members: 0, bills: 0, cosponsorships: 0 });

  const handleRefreshNetwork = useCallback(() => {
    setNetworkKey(prev => prev + 1);
  }, []);

  const handleMemberClick = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const handleMemberSelect = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setNetworkKey(prev => prev + 1); // 네트워크 새로고침
  }, []);

  const handleCloseMemberDetail = useCallback(() => {
    // Keep the member selected for network but close the detail panel
    // The detail panel controls its own visibility
  }, []);

  // Load stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load stats only
        const statsResponse = await fetch('/api/etl/sync');
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, [assemblyAge]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b mobile-header">
        <div className="max-w-full mx-auto px-6 py-4 sm:px-6 md:px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">LegisNet</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">국회 공동발의 네트워크 분석 시스템</p>
              </div>
            </div>

            {/* Center - Search */}
            <div className="flex-1 max-w-md lg:mx-8 w-full lg:w-auto">
              <MemberSearch
                onMemberSelect={handleMemberSelect}
                className="w-full"
              />
            </div>

            {/* Right side - Badges and GitHub */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {assemblyAge}대 국회
              </Badge>
              <Badge
                variant={networkMode === 'proposer' ? 'default' : 'outline'}
                className="text-xs sm:text-sm"
              >
                {networkMode === 'proposer' ? '제안자 중심' : '공동지지자'}
              </Badge>
              <a
                href="https://github.com/your-username/legisnet"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors hidden sm:block"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] mobile-layout tablet-layout desktop-layout">
        {/* Left Sidebar - Control Panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-white border-r border-b lg:border-b-0 overflow-y-auto mobile-sidebar tablet-sidebar desktop-sidebar">
          <div className="p-3 lg:p-4 space-y-3 lg:space-y-4 mobile-controls">
            <NetworkControlPanel
              mode={networkMode}
              age={assemblyAge}
              direction={direction}
              onModeChange={setNetworkMode}
              onAgeChange={setAssemblyAge}
              onDirectionChange={handleDirectionChange}
              onRefresh={handleRefreshNetwork}
            />

            {/* Quick Stats - Desktop/Tablet only */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                  <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5" />
                  빠른 통계
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 mobile-stats">
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  <div className="text-center p-2 lg:p-3 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-base lg:text-lg font-bold text-blue-600">{stats.members}</div>
                    <div className="text-xs text-blue-800">의원 수</div>
                  </div>
                  <div className="text-center p-2 lg:p-3 bg-green-50 rounded-lg">
                    <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 mx-auto mb-1" />
                    <div className="text-base lg:text-lg font-bold text-green-600">{stats.cosponsorships}</div>
                    <div className="text-xs text-green-800">연결 수</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-2 border-t">
                  마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}
                </div>
              </CardContent>
            </Card>

            {/* Compact Stats for Mobile */}
            <div className="md:hidden bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">의원 {stats.members}명</span>
                <span className="text-gray-600">연결 {stats.cosponsorships}건</span>
              </div>
            </div>

            {/* Usage Guide - Hidden on mobile */}
            <Card className="hidden lg:block">
              <CardHeader>
                <CardTitle className="text-sm">사용법</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                  <div>
                    <strong>노드 클릭:</strong> 의원 상세정보 확인
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  </div>
                  <div>
                    <strong>마우스 휠:</strong> 네트워크 확대/축소
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  </div>
                  <div>
                    <strong>드래그:</strong> 네트워크 이동 및 노드 배치
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Center - Network Visualization */}
        <div className="flex-1 relative mobile-main tablet-main desktop-main">
          {selectedMemberId ? (
            <>
              <NetworkVisualization
                key={`${networkMode}-${assemblyAge}-${direction}-${selectedMemberId}-${networkKey}`}
                mode={networkMode}
                age={assemblyAge}
                direction={direction}
                onNodeClick={handleMemberClick}
                focusMemberId={selectedMemberId}
              />

              {/* Network Mode Indicator */}
              <div className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 lg:p-3 shadow-lg border">
                <div className="flex items-center gap-1 lg:gap-2">
                  {networkMode === 'proposer' ? (
                    <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                  ) : (
                    <Users className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                  )}
                  <span className="text-xs lg:text-sm font-medium">
                    {networkMode === 'proposer' ? '제안자 중심' : '공동지지자'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 hidden lg:block">
                  선택한 의원을 중심으로 한 네트워크 분석
                </div>
              </div>
            </>
          ) : (
            /* Initial Welcome Message */
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <Network className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">LegisNet</h2>
                  <p className="text-gray-600 mb-6">국회 공동발의 네트워크 분석 시스템</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">시작하기</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 font-bold text-xs">1</span>
                      </div>
                      <div className="text-left">
                        <strong>상단 검색창</strong>에서 분석하고 싶은 국회의원을 검색하세요
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 font-bold text-xs">2</span>
                      </div>
                      <div className="text-left">
                        선택한 의원을 중심으로 한 <strong>공동발의 네트워크</strong>를 확인할 수 있습니다
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 font-bold text-xs">3</span>
                      </div>
                      <div className="text-left">
                        네트워크의 노드를 클릭하여 <strong>상세 정보</strong>를 확인하세요
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-xs text-gray-500">
                  22대 국회 데이터 기반 (2024.05~진행중) • {stats.members}명 의원 • {stats.cosponsorships}건 공동발의
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Member Detail */}
        {selectedMemberId && (
          <div className="lg:relative">
            <MemberDetailPanel
              memberId={selectedMemberId}
              onClose={handleCloseMemberDetail}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t px-4 sm:px-6 py-2 sm:py-3 mobile-footer">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
            <span>© 2024 LegisNet</span>
            <a
              href="https://open.assembly.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-700"
            >
              국회 오픈API
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-center sm:text-left">22대 국회 데이터 기반 네트워크 분석 (2024.05~진행중)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
