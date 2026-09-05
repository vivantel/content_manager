import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import { ContentPiece, PaginatedResponse } from '@vivascribe/shared/types';

export function Dashboard() {
  const { data, isLoading } = useQuery<PaginatedResponse<ContentPiece>>({
    queryKey: ['content'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/v1/content');
      return response.data.data!;
    },
  });

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

  const contentTypeLabels: Record<string, string> = {
    release_notes: 'Release Notes',
    technical_article: 'Technical Article',
    product_announcement: 'Product Announcement',
    tutorial: 'Tutorial',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Dashboard</h1>
        <NavLink to="/content/new" className="btn-primary">
          New Content
        </NavLink>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Channels</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Updated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No content yet. Create your first piece!
                </td>
              </tr>
            ) : (
              data?.items.map((piece) => (
                <tr key={piece.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <NavLink to={`/content/${piece.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                      {piece.title}
                    </NavLink>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {contentTypeLabels[piece.contentType] || piece.contentType}
                  </td>
                  <td className="px-6 py-4">
                    <span className={statusBadges[piece.status] || 'badge-draft'}>
                      {piece.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {piece.targetChannels.join(', ') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(piece.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <NavLink to={`/content/${piece.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400">
                      View
                    </NavLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {data.page} of {data.totalPages} — {data.total} total
              </div>
              <div className="flex space-x-2">
                <button className="btn-secondary" disabled={data.page === 1}>
                  Previous
                </button>
                <button className="btn-secondary" disabled={data.page === data.totalPages}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}