import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { ContentPiece } from '@vivascribe/shared/types';

export function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  
  const { data: piece, isLoading } = useQuery<ContentPiece>({
    queryKey: ['content', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/v1/content/${id}`);
      return response.data.data!;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Content not found</h2>
      </div>
    );
  }

  const statusBadges: Record<string, string> = {
    draft: 'badge-draft',
    in_review: 'badge-in_review',
    approved: 'badge-approved',
    changes_requested: 'badge-changes_requested',
    rejected: 'badge-rejected',
    scheduled: 'badge-scheduled',
    published: 'badge-published',
    failed: 'badge-failed',
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{piece.title}</h1>
          <div className="flex items-center space-x-4 mt-2">
            <span className={statusBadges[piece.status] || 'badge-draft'}>
              {piece.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {piece.contentType.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {piece.status === 'approved' && (
            <button className="btn-primary">Publish Now</button>
          )}
          {piece.status === 'draft' && (
            <button className="btn-primary">Submit for Review</button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="prose dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: piece.contentHtml || piece.content }} />
        </div>
      </div>

      {piece.targetChannels.length > 0 && (
        <div className="mt-6 card p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Target Channels</h3>
          <div className="flex flex-wrap gap-2">
            {piece.targetChannels.map((channel) => (
              <span key={channel} className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                {channel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}