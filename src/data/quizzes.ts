import type { QuizQuestion } from '@/src/types/algorithm';

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1-bubble-pass',
    topic: 'Bubble Sort Pass',
    language: 'C',
    prompt:
      'After completing ONLY the first outer pass (i = 0) of Bubble Sort on {29, 10, 14, 37, 13}, what is the array state?',
    code: `int arr[] = {29, 10, 14, 37, 13};
for (int j = 0; j < 4; j++) {
  if (arr[j] > arr[j + 1]) {
    int temp = arr[j];
    arr[j] = arr[j + 1];
    arr[j + 1] = temp;
  }
}`,
    options: [
      '[10, 14, 29, 13, 37]',
      '[10, 13, 14, 29, 37]',
      '[10, 29, 14, 37, 13]',
      '[29, 10, 14, 13, 37]',
    ],
    correctIndex: 0,
    explanation:
      'During i = 0: 29 swaps past 10 and 14 -> [10, 14, 29, 37, 13]. Then 29 < 37 (no swap), and 37 swaps past 13 -> [10, 14, 29, 13, 37]. The largest element (37) settles at the end.',
  },
  {
    id: 'q2-binary-mid',
    topic: 'Binary Search Midpoint',
    language: 'Python',
    prompt:
      'What is the value of mid on the SECOND iteration when searching for target = 72 in [11, 22, 34, 47, 58, 72, 89]?',
    code: `arr = [11, 22, 34, 47, 58, 72, 89]
target = 72
low, high = 0, 6
while low <= high:
  mid = (low + high) // 2
  if arr[mid] == target:
    print(mid)
    break
  elif arr[mid] < target:
    low = mid + 1
  else:
    high = mid - 1`,
    options: ['4', '5', '6', '3'],
    correctIndex: 1,
    explanation:
      'In iteration 1, mid = (0 + 6) // 2 = 3. Since 47 < 72, low updates to mid + 1 = 4 while high stays 6. In iteration 2, mid = (4 + 6) // 2 = 5, where arr[5] == 72.',
  },
  {
    id: 'q3-c-pointer-offset',
    topic: 'C Pointer Arithmetic',
    language: 'C',
    prompt: 'What value does printf print after the pointer swap executes?',
    code: `int main() {
  int arr[] = {10, 20, 30, 40};
  int *p = arr;
  int t = *(p + 1);
  *(p + 1) = *(p + 3);
  *(p + 3) = t;
  printf("%d %d", arr[1], arr[3]);
  return 0;
}`,
    options: ['20 40', '40 20', '30 10', '40 10'],
    correctIndex: 1,
    explanation:
      '*(p + 1) accesses arr[1] (20) and *(p + 3) accesses arr[3] (40). Swapping them leaves arr[1] = 40 and arr[3] = 20.',
  },
  {
    id: 'q4-selection-swaps',
    topic: 'Selection Sort Mechanics',
    language: 'C',
    prompt:
      'In Selection Sort on an array of 5 elements, how many total comparisons does the inner loop execute across all passes?',
    code: `int comparisons = 0;
for (int i = 0; i < 4; i++) {
  for (int j = i + 1; j < 5; j++) {
    comparisons++;
  }
}
printf("%d", comparisons);`,
    options: ['5', '10', '16', '20'],
    correctIndex: 1,
    explanation:
      'For n = 5, inner iterations are 4 + 3 + 2 + 1 = n(n - 1)/2 = 10 comparisons.',
  },
  {
    id: 'q5-fibonacci-trace',
    topic: 'Iterative Fibonacci Trace',
    language: 'Python',
    prompt:
      'What are the final values of (a, b) after the loop completes 4 iterations starting from a = 0, b = 1?',
    code: `a, b = 0, 1
for i in range(4):
  nxt = a + b
  a, b = b, nxt
print(a, b)`,
    options: ['(2, 3)', '(3, 5)', '(5, 8)', '(1, 2)'],
    correctIndex: 1,
    explanation:
      'i=0: (1, 1); i=1: (1, 2); i=2: (2, 3); i=3: (3, 5). After 4 iterations, a = 3 and b = 5.',
  },
  {
    id: 'q6-frequency-dict',
    topic: 'Frequency Map Aggregation',
    language: 'Python',
    prompt: 'What is printed at the end of this frequency counting loop?',
    code: `data = [5, 2, 5, 8, 2, 5]
freq = {}
for val in data:
  freq[val] = freq.get(val, 0) + 1
print(freq[5], len(freq))`,
    options: ['3 3', '2 3', '3 6', '5 3'],
    correctIndex: 0,
    explanation:
      'Value 5 appears 3 times so freq[5] = 3. The unique keys are {5, 2, 8}, so len(freq) = 3.',
  },
  {
    id: 'q7-binary-not-found',
    topic: 'Binary Search Termination',
    language: 'Python',
    prompt:
      'When target is smaller than every element in a sorted array of length 8, how many loop checks execute before returning -1?',
    code: `arr = [10, 20, 30, 40, 50, 60, 70, 80]
target = 5
low, high = 0, 7
checks = 0
while low <= high:
  checks += 1
  mid = (low + high) // 2
  if arr[mid] < target:
    low = mid + 1
  else:
    high = mid - 1
print(checks)`,
    options: ['2', '3', '4', '8'],
    correctIndex: 1,
    explanation:
      '1st: low=0,high=7 -> mid=3 (high=2). 2nd: low=0,high=2 -> mid=1 (high=0). 3rd: low=0,high=0 -> mid=0 (high=-1). Loop ends after 3 checks.',
  },
  {
    id: 'q8-two-pointer-stop',
    topic: 'Array Reversal Stop Condition',
    language: 'C',
    prompt: 'For an array with n = 7 elements, how many swaps occur inside while (left < right)?',
    code: `int left = 0, right = 6;
int swaps = 0;
while (left < right) {
  swaps++;
  left++;
  right--;
}
printf("%d", swaps);`,
    options: ['3', '4', '6', '7'],
    correctIndex: 0,
    explanation:
      'Pairs swapped: (0,6), (1,5), (2,4). Next, left=3 and right=3, so left < right is false and the middle element stays untouched. Total swaps = 3.',
  },
];
