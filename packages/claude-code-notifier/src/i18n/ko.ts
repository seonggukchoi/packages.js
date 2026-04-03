import type { Messages } from '../types.js';

export const ko: Messages = {
  sessionStarted: '작업을 시작했습니다.',
  sessionCompleted: '작업이 완료되었습니다.',
  sessionError: '오류가 발생했습니다.',
  sessionCompacted: '세션이 압축되었습니다.',
  permissionRequested: '권한 승인이 필요합니다.',
  decisionRequired: '결정이 필요합니다.',
  decisionNeeded: (question: string) => `결정 필요: ${question}`,
  subagentStarted: (description: string) => `서브에이전트 시작: ${description}`,
  subagentCompleted: '서브에이전트 작업 완료.',
  toolExecuting: (toolName: string) => `${toolName} 실행 중...`,
  toolCompleted: (toolName: string) => `${toolName} 실행 완료.`,
};
