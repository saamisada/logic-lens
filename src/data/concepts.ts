import type { ConceptCard } from '@/src/types/algorithm';

export const CONCEPTS: ConceptCard[] = [
  {
    id: 'pointers-memory-c',
    title: 'Pointers & Memory in C',
    category: 'C Programming',
    readTime: '3 min read',
    summary:
      'How contiguous array addresses work with pointer arithmetic *(arr + i) for zero-copy in-place manipulation.',
    details: [
      'An array identifier arr decays to the memory address of its first element (&arr[0]).',
      'Adding an integer offset k advances by k * sizeof(element_type) bytes, not k raw bytes.',
      'Dereferencing *(arr + k) accesses the same memory slot as arr[k], enabling O(1) space in-place swaps.',
    ],
    snippetLanguage: 'C',
    snippet: `int main() {
  int arr[] = {10, 20, 30, 40};
  int left = 0, right = 3;
  while (left < right) {
    int temp = *(arr + left);
    *(arr + left) = *(arr + right);
    *(arr + right) = temp;
    left++;
    right--;
  }
  return 0;
}`,
    takeaway:
      'Remember: arr[i] is defined by the C standard as *(arr + i).',
  },
  {
    id: 'big-o-notation',
    title: 'Big-O Notation & Asymptotic Bounds',
    category: 'Complexity',
    readTime: '4 min read',
    summary:
      'Measuring how execution steps and auxiliary memory scale relative to input size n rather than raw wall-clock seconds.',
    details: [
      'Nested loops scanning n elements typically yield quadratic O(n^2) time, as seen in Bubble Sort and Selection Sort.',
      'Constants and lower-order terms are dropped so 3n^2 + 5n + 2 simplifies cleanly to O(n^2).',
      'Always evaluate both Time Complexity (operations) and Space Complexity (extra variables or call frames).',
    ],
    snippetLanguage: 'C',
    snippet: `int main() {
  int arr[] = {29, 10, 14, 37, 13};
  int n = 5;
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        int temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return 0;
}`,
    takeaway:
      'In-place algorithms use O(1) auxiliary space regardless of how large n grows.',
  },
  {
    id: 'binary-search-log',
    title: 'Binary Search O(log n)',
    category: 'Data Structures',
    readTime: '3 min read',
    summary:
      'Cutting a sorted search space in half each iteration turns 1,000,000 comparisons into at most 20 steps.',
    details: [
      'Prerequisite: the array must already be sorted in ascending (or descending) order.',
      'At each iteration, mid = (low + high) // 2 partitions the interval into two halves.',
      'If arr[mid] < target, low moves to mid + 1; if arr[mid] > target, high moves to mid - 1.',
    ],
    snippetLanguage: 'Python',
    snippet: `arr = [11, 22, 34, 47, 58, 72, 89]
target = 58
low, high = 0, len(arr) - 1
while low <= high:
  mid = (low + high) // 2
  if arr[mid] == target:
    print("Found at", mid)
    break
  elif arr[mid] < target:
    low = mid + 1
  else:
    high = mid - 1`,
    takeaway:
      'Always verify loop condition low <= high (inclusive) so single-element windows are checked.',
  },
  {
    id: 'python-lists-dicts',
    title: 'Python Lists & Frequency Maps',
    category: 'Data Science',
    readTime: '4 min read',
    summary:
      'Understanding dynamic Python lists and O(1) dictionary lookups for data aggregation pipelines.',
    details: [
      'A Python list stores an array of object references, enabling dynamic resizing via .append().',
      'Dictionary frequency counting in Python achieves O(n) single-pass aggregation over raw observations.',
      'Using hash maps avoids O(n^2) nested loops when counting duplicates or building histograms.',
    ],
    snippetLanguage: 'Python',
    snippet: `data = [4, 2, 4, 7, 2, 4, 9]
freq = {}
for i in range(len(data)):
  val = data[i]
  if val in freq:
    freq[val] = freq[val] + 1
  else:
    freq[val] = 1
print(freq)`,
    takeaway:
      'Use Python dicts for sparse discrete frequency counting in single-pass O(n) pipelines.',
  },
  {
    id: 'iterative-vs-recursion',
    title: 'Iterative Registers vs. Recursion',
    category: 'Data Structures',
    readTime: '4 min read',
    summary:
      'Why naive recursive Fibonacci explodes to O(2^n) calls while iterative register shifting runs in O(n) time and O(1) space.',
    details: [
      'Every recursive function call pushes a new stack frame containing parameters, local variables, and return address.',
      'Recursive fib(n - 1) + fib(n - 2) recomputes identical subproblems exponentially many times.',
      'Converting linear recurrence relations to iterative state registers (a, b = b, a + b) eliminates stack overflow risk.',
    ],
    snippetLanguage: 'Python',
    snippet: `n = 7
a, b = 0, 1
seq = []
for i in range(n):
  seq.append(a)
  nxt = a + b
  a, b = b, nxt
print(seq)`,
    takeaway:
      'Always trace call stack depth before choosing recursion over a simple iterative loop.',
  },
  {
    id: 'two-pointer-optimization',
    title: 'Two-Pointer & Selection Patterns',
    category: 'Complexity',
    readTime: '3 min read',
    summary:
      'Using coordinated index pairs to track boundaries and minimize redundant swaps in memory.',
    details: [
      'Opposite-direction pointers (left = 0, right = n - 1) meet in the middle for array reversal and palindrome checks.',
      'Same-direction boundary pointers partition arrays into sorted and unsorted regions.',
      'Selection Sort uses i as the boundary pointer and minIdx to minimize total write swaps to O(n).',
    ],
    snippetLanguage: 'C',
    snippet: `int main() {
  int arr[] = {64, 25, 12, 22, 11};
  int n = 5;
  for (int i = 0; i < n - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    int temp = arr[i];
    arr[i] = arr[minIdx];
    arr[minIdx] = temp;
  }
  return 0;
}`,
    takeaway:
      'Two-pointer invariants rely on monotonic movement across index boundaries.',
  },
];
