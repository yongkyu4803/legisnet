'use client';

import React, { useState } from 'react';
import { GraphMode } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Network,
  Users,
  GitBranch,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Filter,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

export type DirectionMode = 'both' | 'received' | 'given';

interface NetworkControlPanelProps {
  mode: GraphMode;
  age: number;
  direction: DirectionMode;
  onModeChange: (mode: GraphMode) => void;
  onAgeChange: (age: number) => void;
  onDirectionChange: (direction: DirectionMode) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function NetworkControlPanel({
  mode,
  age,
  direction,
  onModeChange,
  onAgeChange,
  onDirectionChange,
  onRefresh,
  loading = false,
}: NetworkControlPanelProps) {
  const [isETLRunning, setIsETLRunning] = useState(false);
  const [dataStats, setDataStats] = useState({
    members: 380,
    bills: 12082,
    cosponsorships: 146310,
    updatedAt: '2025-09-19',
    latestBillDate: '2025-09',
    partiesWithInfo: 0,
    partiesTotal: 0
  });

  // 컴포넌트 마운트 시 데이터 통계 로드
  React.useEffect(() => {
    const loadDataStats = async () => {
      try {
        const response = await fetch('/api/etl/sync');
        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setDataStats({
              members: data.stats.members,
              bills: data.stats.bills,
              cosponsorships: data.stats.cosponsorships,
              updatedAt: new Date(data.stats.updatedAt).toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1),
              latestBillDate: '2025.09', // TODO: 실제 최신 법안 날짜로 업데이트
              partiesWithInfo: data.stats.partiesWithInfo || 0,
              partiesTotal: data.stats.partiesTotal || 0
            });
          }
        }
      } catch (error) {
        console.error('Failed to load data stats:', error);
      }
    };

    loadDataStats();
  }, []);

  const handleETLSync = async () => {
    try {
      setIsETLRunning(true);
      const response = await fetch(`/api/etl/sync?age=${age}&maxPages=5&network=true`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('ETL Sync completed:', result);
        // Refresh network after ETL
        setTimeout(onRefresh, 1000);
      }
    } catch (error) {
      console.error('ETL sync failed:', error);
    } finally {
      setIsETLRunning(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch(`/api/graph?mode=${mode}&age=${age}&format=json`);
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `legisnet_${mode}_${age}대.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          네트워크 제어판
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Network Mode Selection */}
        {/* <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            네트워크 모드
          </label>
          <div className="flex gap-2">
            <Button
              variant={mode === 'proposer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('proposer')}
              className="flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              제안자 중심
            </Button>
            <Button
              variant={mode === 'cosupport' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('cosupport')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              공동발의자
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            {mode === 'proposer'
              ? '공동발의자 → 대표발의자 관계를 표시합니다'
              : '동일 대표발의자를 지원하는 의원들 간의 관계를 표시합니다'
            }
          </div>
        </div> */}

        {/* Assembly Age Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            국회 대수
          </label>
          <Select
            value={age.toString()}
            onValueChange={(value) => onAgeChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="국회 대수 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="22">22대 국회 (2024-2028)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Direction Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            공동발의 방향
          </label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={direction === 'both' ? 'default' : 'outline'}
              size="default"
              onClick={() => onDirectionChange('both')}
              className="flex items-center justify-start gap-3 h-12 px-4"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-medium">전체</span>
                <span className="text-xs opacity-75">받은 것 + 준 것</span>
              </div>
            </Button>
            <Button
              variant={direction === 'received' ? 'default' : 'outline'}
              size="default"
              onClick={() => onDirectionChange('received')}
              className="flex items-center justify-start gap-3 h-12 px-4"
            >
              <ArrowDown className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-medium">받은 것</span>
                <span className="text-xs opacity-75">공동발의 지원받은 관계</span>
              </div>
            </Button>
            <Button
              variant={direction === 'given' ? 'default' : 'outline'}
              size="default"
              onClick={() => onDirectionChange('given')}
              className="flex items-center justify-start gap-3 h-12 px-4"
            >
              <ArrowUp className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="font-medium">준 것</span>
                <span className="text-xs opacity-75">공동발의 지원한 관계</span>
              </div>
            </Button>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            {direction === 'both' && '💡 선택된 의원의 모든 공동발의 관계를 표시합니다'}
            {direction === 'received' && '📥 선택된 의원이 다른 의원들로부터 공동발의 지원을 받은 관계만 표시합니다'}
            {direction === 'given' && '📤 선택된 의원이 다른 의원들에게 공동발의 지원을 제공한 관계만 표시합니다'}
          </div>
        </div>

        {/* Mode Description */}
        {/* <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {mode === 'proposer' ? '제안자 중심 네트워크' : '공동지지자 네트워크'}
            </span>
          </div>
          <p className="text-xs text-blue-700">
            {mode === 'proposer'
              ? '각 노드는 국회의원을, 엣지는 공동발의 지원 관계를 나타냅니다. 노드 크기는 받은 지원 수에 비례합니다.'
              : '같은 대표발의자를 지원한 의원들 간의 협력 관계를 보여줍니다. 엣지 굵기는 협력 빈도를 나타냅니다.'
            }
          </p>
        </div> */}

        {/* Control Actions */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              내보내기
            </Button>
          </div>

          <Button
            onClick={handleETLSync}
            disabled={isETLRunning}
            variant="secondary"
            size="sm"
            className="w-full flex items-center gap-2"
          >
            <Activity className={`w-4 h-4 ${isETLRunning ? 'animate-pulse' : ''}`} />
            {isETLRunning ? 'ETL 처리 중...' : '데이터 동기화'}
          </Button>

          <div className="text-xs text-gray-500">
            최신 국회 데이터를 수집하여 네트워크를 업데이트합니다
          </div>
        </div>

        {/* Data Status */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">데이터 현황</span>
            <Badge variant="secondary" className="text-xs">
              {age}대 국회
            </Badge>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• 데이터 기준: 2024.05 ~ {dataStats.latestBillDate}</div>
            <div>• 의원 수: {dataStats.members.toLocaleString()}명</div>
            <div>• 법안 수: {dataStats.bills.toLocaleString()}건</div>
            {/* <div>• 공동발의 관계: {dataStats.cosponsorships.toLocaleString()}건</div> */}
            <div>• 정당 정보: {dataStats.partiesWithInfo}/{dataStats.partiesTotal}명 완료</div>
            <div>• 최종 업데이트: {dataStats.updatedAt}</div>
          </div>
          {/* <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            ✅ 데이터 정제: 복수 대표발의자 115건, 복수 이름 의원 76명 제외됨
          </div> */}
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
            💡 22대 국회는 계속 진행 중입니다. 정기적으로 데이터를 업데이트하세요.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}