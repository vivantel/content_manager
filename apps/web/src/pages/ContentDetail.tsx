import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { ContentPiece, ContentReview } from '@vivascribe/shared/types';

export function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const { data: piece, isLoading, refetch } = useQuery<ContentPiece>({
    queryKey: ['content', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/v1/content/${id}`);
      return response.data.data!;
    },
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async (scheduleAt?: string) => {
      const response = await axiosInstance.post(`/api/v1/content/${id}/approve`, { scheduleAt });
      return response.data.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await axiosInstance.post(`/api/v1/content/${id}/request-changes`, { comment });
      return response.data.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await axiosInstance.post(`/api/v1/content/${id}/reject`, { reason });
      return response.data.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ContentPiece>) => {
      const response = await axiosInstance.patch(`/api/v1/content/${id}`, data);
      return response.data.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', id] });
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    },
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

  const handleApprove = async (scheduleAt?: string) => {
    try {
      await approveMutation.mutateAsync(scheduleAt);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleRequestChanges = async (comment: string) => {
    try {
      await requestChangesMutation.mutateAsync(comment);
    } catch (error) {
      console.error('Failed to request changes:', error);
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync(reason);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleSchedule = async (date: string) => {
    try {
      await updateMutation.mutateAsync({ scheduledAt: date, status: 'scheduled' });
    } catch (error) {
      console.error('Failed to schedule:', error);
    }
  };

  const handlePublishNow = async () => {
    try {
      await updateMutation.mutateAsync({ publishedAt: new Date().toISOString(), status: 'published' });
    } catch (error) {
      console.error('Failed to publish:', error);
    }
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
            {piece.repository && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {piece.repository.fullName}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {piece.status === 'draft' && (
            <button 
              className="btn-primary" 
              onClick={() => { void handleRequestChanges('Please review and submit for review'); }}
            >
              Submit for Review
            </button>
          )}
          {piece.status === 'in_review' && (
            <>
              <button 
                className="btn-success" 
                onClick={() => { void handleApprove(); }}
              >
                Approve
              </button>
              <button 
                className="btn-warning" 
                onClick={() => {
                  const comment = prompt('Enter changes requested:');
                  if (comment) void handleRequestChanges(comment);
                }}
              >
                Request Changes
              </button>
              <button 
                className="btn-danger" 
                onClick={() => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) void handleReject(reason);
                }}
              >
                Reject
              </button>
            </>
          )}
          {piece.status === 'approved' && (
            <>
              <button 
                className="btn-primary" 
                onClick={() => { void handlePublishNow(); }}
              >
                Publish Now
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  const date = prompt('Schedule for (ISO date):');
                  if (date) void handleSchedule(date);
                }}
              >
                Schedule
              </button>
            </>
          )}
          {piece.status === 'scheduled' && (
            <button 
              className="btn-primary" 
              onClick={() => { void handlePublishNow(); }}
            >
              Publish Now
            </button>
          )}
          {piece.status === 'changes_requested' && (
            <button 
              className="btn-primary" 
              onClick={() => { void updateMutation.mutateAsync({ status: 'draft' }); }}
            >
              Resubmit for Review
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: piece.contentHtml || piece.content }} />
            </div>
          </div>

{piece.versions && piece.versions.length > 0 && (
            <div className="mt-6 card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Version History</h3>
              <div className="space-y-3">
                {piece.versions.map((version: { id: string; createdAt: string; changeSummary?: string }) => (
                  <div key={version.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {version.changeSummary || 'Edit'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {piece.targetChannels.length > 0 && (
            <div className="card p-6">
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

          {piece.scheduledAt && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Scheduled For</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {new Date(piece.scheduledAt).toLocaleString()}
              </p>
            </div>
          )}

          {piece.publishedAt && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Published</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {new Date(piece.publishedAt).toLocaleString()}
              </p>
            </div>
          )}

          {piece.reviews && piece.reviews.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reviews</h3>
              <div className="space-y-4">
                {piece.reviews.map((review: ContentReview & { reviewer: { name?: string; email: string } }) => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={
                        review.action === 'approve' ? 'badge bg-green-100 text-green-800' :
                        review.action === 'request_changes' ? 'badge bg-yellow-100 text-yellow-800' :
                        'badge bg-red-100 text-red-800'
                      }>
                        {review.action.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {review.reviewer.name || review.reviewer.email}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 ml-6">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}