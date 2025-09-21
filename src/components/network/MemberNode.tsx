'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DirectionMode } from '@/components/dashboard/NetworkControlPanel';

interface MemberNodeData {
  label: string;
  party?: string | null;
  inDegree?: number;
  outDegree?: number;
  betweenness?: number;
  direction?: DirectionMode;
  onClick?: () => void;
}

const PARTY_COLORS = {
  '더불어민주당': '#1e40af', // Blue
  '민주당': '#1e40af', // Blue (더불어민주당 별칭)
  '국민의힘': '#dc2626', // Red
  '조국혁신당': '#16a34a', // Green
  '진보당': '#a21caf', // Purple
  '개혁신당': '#f59e0b', // Amber
  '기본소득당': '#ea580c', // Orange
  '사회민주당': '#0891b2', // Cyan
  '더불어시민당': '#3b82f6', // Light Blue
  '무소속': '#6b7280', // Gray
  '정당정보없음': '#9ca3af', // Light Gray
} as const;

function getPartyColor(party: string | null | undefined): string {
  if (!party) return PARTY_COLORS['무소속'];
  return PARTY_COLORS[party as keyof typeof PARTY_COLORS] || PARTY_COLORS['무소속'];
}

function getDisplayPartyName(party: string | null | undefined): string {
  if (!party) return '무소속';
  if (party === '더불어민주당') return '민주당';
  return party;
}

function getMemberSize(degree: number = 0): { width: number; height: number } {
  const baseSize = 45;
  // 더 명확한 크기 차이를 위해 스케일링 조정
  const scaleFactor = Math.min(degree * 1.5, 35);
  const size = baseSize + scaleFactor;
  return {
    width: size,
    height: size, // 원형 노드를 위해 width와 height 동일하게
  };
}

export const MemberNode = memo(({ data }: NodeProps<MemberNodeData>) => {
  const { label, party, inDegree = 0, outDegree = 0, betweenness = 0, direction = 'both', onClick } = data;
  const partyColor = getPartyColor(party);



  // direction에 따라 노드 크기 결정
  const sizeBasedOnDirection = direction === 'given' ? outDegree : inDegree;
  const { width, height } = getMemberSize(sizeBasedOnDirection);


  return (
    <div
      className="relative cursor-pointer transition-all duration-200 hover:scale-110"
      style={{ width, height }}
      onClick={onClick}
    >
      {/* Main Node Circle */}
      <div
        className="w-full h-full rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-medium"
        style={{
          backgroundColor: partyColor,
          boxShadow: `0 4px 12px ${partyColor}40`,
        }}
      >
        <span className="text-center leading-tight px-1">
          {label.length > 4 ? `${label.slice(0, 3)}..` : label}
        </span>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-gray-400 border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-gray-400 border-white"
      />

      {/* Metrics Badge - 항상 표시 */}
      <div className="absolute -top-3 -right-3 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg z-50"
           style={{
             backgroundColor: direction === 'both' ? '#2563eb' : direction === 'received' ? '#16a34a' : '#ea580c'
           }}>
        {direction === 'given' ? outDegree : inDegree}
      </div>

      {/* Party Label */}
      {/* {party && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 bg-white px-1 rounded whitespace-nowrap">
          {getDisplayPartyName(party)}
        </div>
      )} */}

      {/* Tooltip on Hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden hover:block bg-gray-800 text-white text-xs rounded p-2 whitespace-nowrap z-10">
        <div className="font-semibold">{label}</div>
        {/* <div>정당: {getDisplayPartyName(party)}</div> */}
        {direction === 'both' && (
          <>
            <div>지원받음: {inDegree}</div>
            <div>지원함: {outDegree}</div>
          </>
        )}
        {direction === 'received' && <div>지원받음: {inDegree}</div>}
        {direction === 'given' && <div>지원함: {outDegree}</div>}
        {betweenness > 0 && <div>중심성: {betweenness.toFixed(3)}</div>}
      </div>
    </div>
  );
});

MemberNode.displayName = 'MemberNode';