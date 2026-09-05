import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { ContentPiece } from '@vivascribe/shared/types';

export function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: content, isLoading } = useQuery<ContentPiece[]>({
    queryKey: ['content', 'all'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/v1/content', { params: { limit: 1000 } });
      return response.data.data?.items || [];
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const scheduledContent = content?.filter(c => 
    c.scheduledAt && c.status === 'scheduled'
  ) || [];

  const publishedContent = content?.filter(c => 
    c.publishedAt && c.status === 'published'
  ) || [];

  const getContentForDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return {
      scheduled: scheduledContent.filter(c => c.scheduledAt && format(new Date(c.scheduledAt), 'yyyy-MM-dd') === dayStr),
      published: publishedContent.filter(c => c.publishedAt && format(new Date(c.publishedAt), 'yyyy-MM-dd') === dayStr),
    };
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400">Scheduled and published content</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            Previous
          </button>
          <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            Next
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="btn-secondary"
          >
            Today
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const dayContent = getContentForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`relative min-h-[100px] border-r border-b border-gray-200 dark:border-gray-700 ${
                    !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                  } ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="p-2">
                    <span className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="px-1 space-y-1">
                    {dayContent.scheduled.slice(0, 3).map((piece) => (
                      <div
                        key={piece.id}
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded truncate"
                        title={piece.title}
                      >
                        📅 {piece.title}
                      </div>
                    ))}
                    {dayContent.published.slice(0, 3).map((piece) => (
                      <div
                        key={piece.id}
                        className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded truncate"
                        title={piece.title}
                      >
                        ✓ {piece.title}
                      </div>
                    ))}
                    {(dayContent.scheduled.length + dayContent.published.length > 3) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{dayContent.scheduled.length + dayContent.published.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ))}
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Scheduled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Published</span>
        </div>
      </div>
    </div>
  );
}