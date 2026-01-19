import type { Question } from '@/types';

export const SAMPLE_QUESTIONS: Question[] = [
  // =============================================================================
  // ROUND 1 - Classic Entertainment
  // =============================================================================

  // Q1: Music (1940s-80s) - Multiple Choice
  {
    id: 'r1-q1-music',
    text: 'Which artist recorded the famous song "Respect" in 1967?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: [
      'Diana Ross',
      'Tina Turner',
      'Aretha Franklin',
      'Gladys Knight',
    ],
    correctAnswers: ['C'],
    category: 'music',
    explanation: 'Aretha Franklin made this song an iconic anthem of the era.',
    roundIndex: 0,
  },

  // Q2: Classic Movies - Multiple Choice
  {
    id: 'r1-q2-movies',
    text: 'In "The Wizard of Oz" (1939), what color were Dorothy\'s famous slippers?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Silver', 'Ruby Red', 'Gold', 'Blue'],
    correctAnswers: ['B'],
    category: 'movies',
    explanation:
      'The slippers were changed from silver (in the book) to ruby red to showcase Technicolor.',
    roundIndex: 0,
  },

  // Q3: Classic TV - True/False
  {
    id: 'r1-q3-tv',
    text: '"I Love Lucy" was the first TV show to be filmed in front of a live studio audience.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'tv',
    explanation:
      'The show pioneered the three-camera setup and live audience format in 1951.',
    roundIndex: 0,
  },

  // Q4: U.S. History - Multiple Choice
  {
    id: 'r1-q4-history',
    text: 'Which president served the longest term in U.S. history?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: [
      'George Washington',
      'Abraham Lincoln',
      'Theodore Roosevelt',
      'Franklin D. Roosevelt',
    ],
    correctAnswers: ['D'],
    category: 'history',
    explanation:
      'FDR served 12 years (1933-1945), the only president elected to more than two terms.',
    roundIndex: 0,
  },

  // Q5: Mixed - True/False
  {
    id: 'r1-q5-music',
    text: 'Elvis Presley performed concerts in Europe during his career.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['False'],
    category: 'music',
    explanation:
      'Despite his global fame, Elvis never performed outside of North America.',
    roundIndex: 0,
  },

  // =============================================================================
  // ROUND 2 - Golden Age
  // =============================================================================

  // Q6: Movies - Multiple Choice
  {
    id: 'r2-q1-movies',
    text: 'Who played Scarlett O\'Hara in "Gone with the Wind" (1939)?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: [
      'Bette Davis',
      'Vivien Leigh',
      'Katharine Hepburn',
      'Joan Crawford',
    ],
    correctAnswers: ['B'],
    category: 'movies',
    explanation:
      'British actress Vivien Leigh beat out 1,400 candidates for the iconic role.',
    roundIndex: 1,
  },

  // Q7: Music - True/False
  {
    id: 'r2-q2-music',
    text: 'The Beatles made their first appearance on The Ed Sullivan Show in 1964.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'music',
    explanation:
      'On February 9, 1964, 73 million Americans watched the Beatles perform.',
    roundIndex: 1,
  },

  // Q8: TV - Multiple Choice
  {
    id: 'r2-q3-tv',
    text: 'Which western TV series featured a character named Matt Dillon?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Bonanza', 'Gunsmoke', 'The Rifleman', 'Rawhide'],
    correctAnswers: ['B'],
    category: 'tv',
    explanation:
      'Gunsmoke ran for 20 seasons (1955-1975), making it one of the longest-running series.',
    roundIndex: 1,
  },

  // Q9: History - Multiple Choice
  {
    id: 'r2-q4-history',
    text: 'In what year did man first walk on the moon?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['1967', '1968', '1969', '1970'],
    correctAnswers: ['C'],
    category: 'history',
    explanation:
      'Neil Armstrong took the first steps on July 20, 1969, during Apollo 11.',
    roundIndex: 1,
  },

  // Q10: Movies - True/False
  {
    id: 'r2-q5-movies',
    text: 'Marilyn Monroe starred in the original "Some Like It Hot" (1959).',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'movies',
    explanation:
      'Monroe starred alongside Tony Curtis and Jack Lemmon in this classic comedy.',
    roundIndex: 1,
  },

  // =============================================================================
  // ROUND 3 - Pop Culture & History
  // =============================================================================

  // Q11: Music - Multiple Choice
  {
    id: 'r3-q1-music',
    text: 'Which singer was known as "The King of Rock and Roll"?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['Chuck Berry', 'Elvis Presley', 'Little Richard', 'Jerry Lee Lewis'],
    correctAnswers: ['B'],
    category: 'music',
    explanation:
      'Elvis Presley earned the title through his groundbreaking music and cultural impact.',
    roundIndex: 2,
  },

  // Q12: TV - Multiple Choice
  {
    id: 'r3-q2-tv',
    text: 'What was the name of the space ship in the original "Star Trek" series?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: ['USS Discovery', 'USS Voyager', 'USS Enterprise', 'USS Reliant'],
    correctAnswers: ['C'],
    category: 'tv',
    explanation:
      'The USS Enterprise NCC-1701 was captained by James T. Kirk in the original series.',
    roundIndex: 2,
  },

  // Q13: History - True/False
  {
    id: 'r3-q3-history',
    text: 'The Berlin Wall fell in 1989.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'history',
    explanation:
      'The Berlin Wall fell on November 9, 1989, reuniting East and West Berlin.',
    roundIndex: 2,
  },

  // Q14: Movies - Multiple Choice
  {
    id: 'r3-q4-movies',
    text: 'Who directed the classic film "Casablanca" (1942)?',
    type: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    optionTexts: [
      'Alfred Hitchcock',
      'Michael Curtiz',
      'John Ford',
      'Billy Wilder',
    ],
    correctAnswers: ['B'],
    category: 'movies',
    explanation:
      'Hungarian-American director Michael Curtiz created this timeless classic.',
    roundIndex: 2,
  },

  // Q15: Music - True/False
  {
    id: 'r3-q5-music',
    text: 'Frank Sinatra won an Academy Award for acting.',
    type: 'true_false',
    options: ['True', 'False'],
    optionTexts: ['True', 'False'],
    correctAnswers: ['True'],
    category: 'music',
    explanation:
      'Sinatra won Best Supporting Actor for "From Here to Eternity" (1953).',
    roundIndex: 2,
  },
];
