export type Level = {
  question: string;
  options: string[];
  correctAnswer: string;
  successMessage: string;
};

export const levels: Level[] = [
  {
    question: "What does not belong?",
    options: ["Lion", "Tiger", "Wolf", "Apple"],
    correctAnswer: "Apple",
    successMessage:
      "Correct! Apple is the odd one out because the others are animals.",
  },
  {
    question: "What does not belong?",
    options: ["Chair", "Table", "Sofa", "Banana"],
    correctAnswer: "Banana",
    successMessage:
      "Correct! Banana is the odd one out because the others are furniture.",
  },
  {
    question: "What does not belong?",
    options: ["BMW", "Audi", "Mercedes", "Potato"],
    correctAnswer: "Potato",
    successMessage:
      "Correct! Potato is the odd one out because the others are car brands.",
  },
];
