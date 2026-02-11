import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProblemHistory } from '../types/problem';

interface ProblemCardProps {
  problem: ProblemHistory;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 relative">
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm text-gray-800 line-clamp-4 flex-1 pr-10">
          {problem.question}
        </p>
        <Link 
          to={`/problem-result/${problem.id}`}
          className="absolute right-4 top-4 bg-blue-50 rounded-full w-8 h-8 flex items-center justify-center"
        >
          <ArrowRight className="text-blue-400" size={16} />
        </Link>
      </div>
      
      <p className="text-xs text-gray-500 mb-3 line-clamp-1">
        答案: {problem.answerSummary}
      </p>
      
    <div className="mb-3">
      {problem.tags.filter(tag => tag.type === 'knowledge').length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500 mr-1">知识点:</span>
          {problem.tags.filter(tag => tag.type === 'knowledge').map((tag, index) => (
            <span 
              key={index} 
              className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-500"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      
      {problem.tags.filter(tag => tag.type === 'context').length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">语义情境:</span>
          {problem.tags.filter(tag => tag.type === 'context').map((tag, index) => (
            <span 
              key={index} 
              className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-500"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
      
      <p className="text-xs text-gray-400">
        {problem.timestamp}
      </p>
    </div>
  );
}