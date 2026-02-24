import Idea, { IIdea } from '../models/Idea';
import ImportSession, { IImportSession } from '../models/ImportSession';
import { ensureIdeaImagePaths } from './imageStorageService';

export type RealtimeSource = 'ideas' | 'imports';

export interface RealtimeQueryParams {
  from?: Date;
  to?: Date;
  since?: Date;
  limit: number;
  status?: string;
  department?: string;
  source: RealtimeSource;
  /** Base URL for image URLs, e.g. https://server-cong-ty */
  baseUrl: string;
  /** Include base64 beforeImage/afterImage in response (default false) */
  includeBase64?: boolean;
}

export interface RealtimeResult {
  data: any[];
  cursor?: string;
}

export const fetchRealtimeData = async (
  params: RealtimeQueryParams
): Promise<RealtimeResult> => {
  if (params.source === 'imports') {
    return fetchImportSessions(params);
  }

  return fetchIdeas(params);
};

const fetchIdeas = async (params: RealtimeQueryParams): Promise<RealtimeResult> => {
  const { from, to, since, limit, status, department } = params;

  const timeFilter: any = {};
  const cursorDate = since || from;

  if (cursorDate) {
    timeFilter.$gte = cursorDate;
  }
  if (to) {
    timeFilter.$lte = to;
  }

  const query: any = {};
  if (Object.keys(timeFilter).length > 0) {
    query.submissionDate = timeFilter;
  }

  if (status) {
    query.status = status;
  }

  if (department) {
    query.department = department;
  }

  const ideas: IIdea[] = await Idea.find(query)
    .sort({ submissionDate: 1 })
    .limit(limit)
    .lean();

  const cursor =
    ideas.length > 0 ? new Date(ideas[ideas.length - 1].submissionDate).toISOString() : undefined;

  const includeBase64 = params.includeBase64 === true;
  const baseUrl = (params.baseUrl || '').replace(/\/$/, '');

  const data = await Promise.all(
    ideas.map(async (raw) => {
      const paths = await ensureIdeaImagePaths(raw as any);
      const beforeImagePath = paths.beforeImagePath ?? (raw as any).beforeImagePath;
      const afterImagePath = paths.afterImagePath ?? (raw as any).afterImagePath;

      const item: Record<string, any> = { ...raw };
      item.beforeImageUrl = beforeImagePath ? `${baseUrl}${beforeImagePath}` : null;
      item.afterImageUrl = afterImagePath ? `${baseUrl}${afterImagePath}` : null;
      if (!includeBase64) {
        delete item.beforeImage;
        delete item.afterImage;
      }
      return item;
    })
  );

  return {
    data,
    cursor,
  };
};

const fetchImportSessions = async (
  params: RealtimeQueryParams
): Promise<RealtimeResult> => {
  const { from, to, since, limit } = params;

  const timeFilter: any = {};
  const cursorDate = since || from;

  if (cursorDate) {
    timeFilter.$gte = cursorDate;
  }
  if (to) {
    timeFilter.$lte = to;
  }

  const query: any = {};
  if (Object.keys(timeFilter).length > 0) {
    query.createdAt = timeFilter;
  }

  const sessions: IImportSession[] = await ImportSession.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  const cursor =
    sessions.length > 0
      ? new Date(sessions[sessions.length - 1].createdAt).toISOString()
      : undefined;

  return {
    data: sessions,
    cursor,
  };
};

