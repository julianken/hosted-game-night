'use client';

import type { Question } from '@/types';

interface QuestionListProps {
  questions: Question[];
  selectedIndex: number;
  displayIndex: number | null;
  currentRound: number;
  totalRounds: number;
  onSelect: (index: number) => void;
  onSetDisplay: (index: number | null) => void;
}

export function QuestionList({
  questions,
  selectedIndex,
  displayIndex: _displayIndex, // Hidden until audience display is implemented
  currentRound,
  totalRounds,
  onSelect,
  onSetDisplay: _onSetDisplay, // Hidden until audience display is implemented
}: QuestionListProps) {
  // Group questions by round
  const questionsByRound: Question[][] = [];
  for (let i = 0; i < totalRounds; i++) {
    questionsByRound[i] = questions.filter(q => q.roundIndex === i);
  }

  // Get the overall index of a question
  const getQuestionIndex = (question: Question) => {
    return questions.findIndex(q => q.id === question.id);
  };

  return (
    <div className="space-y-3" role="region" aria-label="Question navigation">
      <div className="flex items-center justify-between">
        <h2 id="questions-heading" className="text-xl font-semibold">Questions</h2>
        <span className="text-base text-muted-foreground" aria-label={`${questions.length} total questions`}>
          {questions.length} total
        </span>
      </div>

      <nav aria-labelledby="questions-heading" className="space-y-4">
        {questionsByRound.map((roundQuestions, roundIndex) => {
          const isCurrentRound = roundIndex === currentRound;
          const isPastRound = roundIndex < currentRound;

          return (
            <div key={roundIndex} className="space-y-2" role="group" aria-label={`Round ${roundIndex + 1}${isPastRound ? ' (completed)' : ''}`}>
              {/* Round Header */}
              <div
                className={`
                  sticky top-0 z-10 flex items-center justify-between
                  px-3 py-2 rounded-lg font-medium text-base
                  ${isCurrentRound ? 'bg-blue-500/20 text-blue-600' : ''}
                  ${isPastRound ? 'bg-green-500/10 text-green-600' : ''}
                  ${!isCurrentRound && !isPastRound ? 'bg-muted/50 text-muted-foreground' : ''}
                `}
                aria-current={isCurrentRound ? 'true' : undefined}
              >
                <h3 className="text-base font-medium">Round {roundIndex + 1}</h3>
                <span className="text-base">
                  {roundQuestions.length} questions
                  {isPastRound && ' (completed)'}
                </span>
              </div>

              {/* Round Questions */}
              <ul className="space-y-2 pl-2" role="listbox" aria-label={`Questions for round ${roundIndex + 1}`}>
                {roundQuestions.map((question, qIndex) => {
                  const globalIndex = getQuestionIndex(question);
                  const isSelected = globalIndex === selectedIndex;
                  // const isDisplayed = globalIndex === displayIndex; // Hidden until audience display is implemented

                  return (
                    <li
                      key={question.id}
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`Question ${qIndex + 1}: ${question.text}. ${question.type === 'multiple_choice' ? 'Multiple choice' : 'True or false'}. Category: ${question.category}`}
                      tabIndex={0}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                        transition-colors duration-200
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border hover:border-muted-foreground/50'
                        }
                      `}
                      onClick={() => onSelect(globalIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(globalIndex);
                        }
                      }}
                    >
                      {/* Question number within round */}
                      <span
                        aria-hidden="true"
                        className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                          text-base font-bold
                          ${isSelected ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}
                        `}
                      >
                        {qIndex + 1}
                      </span>

                      {/* Question preview */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground truncate">
                          {question.text}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {question.type === 'multiple_choice' ? 'MC' : 'T/F'} • {question.category}
                        </p>
                      </div>

{/* Display toggle - hidden until audience display is implemented */}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

{/* Hide from display button - hidden until audience display is implemented */}
    </div>
  );
}
