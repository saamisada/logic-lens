import type {
  ConceptCard,
  LineExecutionStat,
  ProgramAnalysis,
  ProgramLanguage,
  QuizQuestion,
  TraceResult,
  VariableMutationStat,
} from '@/src/types/algorithm';

function buildUniqueOptions(
  correct: string,
  candidates: string[],
  fallbackNumericBase?: number
): { options: string[]; correctIndex: number } {
  const seen = new Set<string>([correct]);
  const distractors: string[] = [];

  for (const c of candidates) {
    if (c && !seen.has(c)) {
      seen.add(c);
      distractors.push(c);
      if (distractors.length === 3) break;
    }
  }

  let offset = 1;
  while (distractors.length < 3) {
    let candidate: string;
    if (typeof fallbackNumericBase === 'number' && Number.isFinite(fallbackNumericBase)) {
      candidate = String(fallbackNumericBase + (offset % 2 === 0 ? -offset : offset));
    } else if (/^-?\d+$/.test(correct)) {
      const n = Number(correct);
      candidate = String(n + (offset % 2 === 0 ? -offset : offset));
    } else {
      candidate = `State variant ${offset}`;
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      distractors.push(candidate);
    }
    offset++;
  }

  // Deterministic placement based on string hash so SSR/client always match
  let hash = 0;
  for (let i = 0; i < correct.length; i++) {
    hash = (hash * 31 + correct.charCodeAt(i)) >>> 0;
  }
  const correctIndex = hash % 4;
  const options = [...distractors.slice(0, 3)];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

function getSnippetWindow(
  lines: string[],
  centerLine: number,
  radius = 3
): string {
  const start = Math.max(0, centerLine - 1 - radius);
  const end = Math.min(lines.length, centerLine + radius);
  return lines
    .slice(start, end)
    .map((l, idx) => `${start + idx + 1}: ${l}`)
    .join('\n');
}

export function analyzePlaygroundProgram(
  language: ProgramLanguage,
  code: string,
  trace: TraceResult
): ProgramAnalysis {
  const lines = trace.codeLines;
  const steps = trace.steps;
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length;

  // 1. Per-line execution stats
  const lineHits = new Map<number, number>();
  for (const step of steps) {
    lineHits.set(step.lineNumber, (lineHits.get(step.lineNumber) || 0) + 1);
  }

  const lineStats: LineExecutionStat[] = lines
    .map((lineText, idx) => ({
      lineNumber: idx + 1,
      code: lineText,
      hits: lineHits.get(idx + 1) || 0,
    }))
    .filter((entry) => entry.code.trim().length > 0);

  let hottestLine = 1;
  let maxHits = -1;
  for (const stat of lineStats) {
    if (stat.hits > maxHits) {
      maxHits = stat.hits;
      hottestLine = stat.lineNumber;
    }
  }

  // 2. Per-variable mutation stats
  const varMutationCount = new Map<string, number>();
  const varTypeMap = new Map<string, string>();
  const varFinalVal = new Map<string, string>();
  const varHistory = new Map<string, string[]>();

  for (const step of steps) {
    for (const v of step.variables) {
      varTypeMap.set(v.name, v.type);
      varFinalVal.set(v.name, v.value);
      if (v.updated) {
        varMutationCount.set(v.name, (varMutationCount.get(v.name) || 0) + 1);
      }
      const hist = varHistory.get(v.name) || [];
      if (hist[hist.length - 1] !== v.value) {
        hist.push(v.value);
        varHistory.set(v.name, hist);
      }
    }
  }

  const variableStats: VariableMutationStat[] = Array.from(
    varFinalVal.entries()
  ).map(([name, finalValue]) => ({
    name,
    type: varTypeMap.get(name) || 'var',
    mutations: varMutationCount.get(name) || 0,
    finalValue,
  }));

  // 3. Dynamically generate Concept Library cards exclusively from THIS program
  const concepts: ConceptCard[] = [];
  const lastStep = steps[steps.length - 1];
  const firstLoopStepIdx = steps.findIndex((s) =>
    /loop|for|while/i.test(s.note)
  );
  const firstBranchStepIdx = steps.findIndex((s) =>
    /check|if|else/i.test(s.note)
  );
  const firstArrayStepIdx = steps.findIndex((s) => s.arrayState.length > 0);

  // Card 1: Complexity & Loop Structure of THIS program
  concepts.push({
    id: 'prog-complexity',
    title: `Time Complexity: ${trace.metrics.estimatedComplexity}`,
    category: 'Complexity',
    readTime: `${trace.metrics.totalSteps} steps`,
    summary: `Your ${language} program runs with loop nesting depth ${trace.metrics.maxLoopDepth}, executing ${trace.metrics.comparisons} comparison(s) and ${trace.metrics.writes} write(s).`,
    details: [
      `Entry point detected: ${trace.metrics.detectedEntry}.`,
      `Maximum active loop nesting depth observed in this run: ${trace.metrics.maxLoopDepth}.`,
      `Line ${hottestLine} was the most frequently executed instruction (${Math.max(0, maxHits)} hit${maxHits === 1 ? '' : 's'}).`,
    ],
    snippetLanguage: language,
    snippet: getSnippetWindow(lines, hottestLine, 3),
    takeaway:
      trace.metrics.maxLoopDepth >= 2
        ? 'Nested loops multiply inner iterations by outer iterations, scaling quadratically.'
        : trace.metrics.maxLoopDepth === 1
          ? 'Single-level loop traversal keeps execution linear or logarithmic.'
          : 'No loops executed, giving constant-time step behavior for this input.',
    targetStepIndex: Math.max(0, firstLoopStepIdx),
  });

  // Card 2: Arrays & Pointer Tracking (only if an array was detected in user code)
  if (firstArrayStepIdx !== -1 && lastStep && lastStep.arrayState.length > 0) {
    const firstArrStep = steps[firstArrayStepIdx];
    const pointerNames = Array.from(
      new Set(steps.flatMap((s) => s.pointers.map((p) => p.name)))
    );
    const sampleLine = firstArrStep.lineNumber;
    concepts.push({
      id: 'prog-array-memory',
      title: `Array Memory & Index Pointers (${firstArrStep.arrayLabel})`,
      category: 'Memory & Arrays',
      readTime: `${firstArrStep.arrayState.length} elements`,
      summary: `Your program allocates ${firstArrStep.arrayLabel} with ${firstArrStep.arrayState.length} elements${pointerNames.length > 0 ? ` tracked by index variable(s): ${pointerNames.join(', ')}` : ''}.`,
      details: [
        `Initial snapshot: [${firstArrStep.arrayState.join(', ')}].`,
        `Final snapshot: [${lastStep.arrayState.join(', ')}].`,
        pointerNames.length > 0
          ? `Variables ${pointerNames.join(', ')} automatically attach as live index pointers in the Memory Stage.`
          : 'Add index variables like i, j, low, mid, or high to attach live pointer badges beneath boxes.',
      ],
      snippetLanguage: language,
      snippet: getSnippetWindow(lines, sampleLine, 2),
      takeaway: `Array indexing reads or mutates elements in O(1) offset time relative to ${firstArrStep.arrayLabel}.`,
      targetStepIndex: firstArrayStepIdx,
    });
  }

  // Card 3: C Pointer Arithmetic (if user C code uses pointers * or &)
  if (language === 'C' && /(\*\s*\(|\*\s*[A-Za-z_]|&[A-Za-z_])/.test(code)) {
    const ptrStepIdx = Math.max(
      0,
      steps.findIndex((s) =>
        s.variables.some((v) => v.type.includes('*') || v.value.startsWith('&'))
      )
    );
    const ptrLine = steps[ptrStepIdx]?.lineNumber || 1;
    concepts.push({
      id: 'prog-c-pointers',
      title: 'C Pointer Dereferencing in Your Code',
      category: 'C Memory',
      readTime: 'Pointer trace',
      summary:
        'Your C program uses pointer syntax (* or &) to reference and mutate array cells directly in memory.',
      details: [
        'Base array names decay to the address of element index 0 (&arr[0]).',
        'Expressions such as *(arr + offset) compute the target address and dereference its stored integer.',
        'Pointer mutations update the underlying array in-place without duplicating memory.',
      ],
      snippetLanguage: 'C',
      snippet: getSnippetWindow(lines, ptrLine, 2),
      takeaway:
        'In C, *(p + k) is always equivalent to p[k] at runtime.',
      targetStepIndex: ptrStepIdx,
    });
  }

  // Card 4: Python Dictionary / Hash Map (if user Python code uses a dict)
  const dictStepIdx = steps.findIndex(
    (s) => s.auxiliaryPairs && s.auxiliaryPairs.length > 0
  );
  if (dictStepIdx !== -1) {
    const dictStep = steps[dictStepIdx];
    const dictLine = dictStep.lineNumber;
    concepts.push({
      id: 'prog-dict-map',
      title: `Dictionary State (${dictStep.auxiliaryLabel || 'dict'})`,
      category: 'Hash Maps',
      readTime: 'O(1) lookup',
      summary: `Your Python program builds key-value mappings inside ${dictStep.auxiliaryLabel || 'dict'}, tracking ${lastStep?.auxiliaryPairs?.length ?? 0} unique key(s).`,
      details: [
        'Dictionaries hash each key for constant-time average insertion and lookup.',
        'Every key update is highlighted in the Memory Stage Dictionary tracker.',
        `Final keys recorded: ${lastStep?.auxiliaryPairs?.map((p) => `${p.key}:${p.value}`).join(', ') || 'none'}.`,
      ],
      snippetLanguage: 'Python',
      snippet: getSnippetWindow(lines, dictLine, 2),
      takeaway:
        'Hash maps replace nested linear searches with O(1) key lookups.',
      targetStepIndex: dictStepIdx,
    });
  }

  // Card 5: Control Flow & Branching (if code has conditionals)
  if (firstBranchStepIdx !== -1) {
    const bStep = steps[firstBranchStepIdx];
    concepts.push({
      id: 'prog-branching',
      title: 'Conditional Branching in Your Code',
      category: 'Control Flow',
      readTime: `${trace.metrics.comparisons} checks`,
      summary: `Your program evaluates conditional guards (${bStep.note}) to steer execution flow.`,
      details: [
        `First branch evaluation occurs at Step ${bStep.stepNumber} (Line ${bStep.lineNumber}).`,
        `Total comparison operations evaluated during this trace: ${trace.metrics.comparisons}.`,
        'Step forward through the trace to watch how each branch decision affects downstream variables.',
      ],
      snippetLanguage: language,
      snippet: getSnippetWindow(lines, bStep.lineNumber, 2),
      takeaway:
        'Boundary conditions (< vs <=) determine whether edge iterations execute.',
      targetStepIndex: firstBranchStepIdx,
    });
  }

  // Card 6: Variables & State Mutations Summary (always included for this program)
  const topMutated = [...variableStats].sort(
    (a, b) => b.mutations - a.mutations
  )[0];
  concepts.push({
    id: 'prog-var-mutations',
    title: 'Variable Lifecycle & Stack State',
    category: `${language} Runtime`,
    readTime: `${variableStats.length} variables`,
    summary: topMutated
      ? `Your program tracks ${variableStats.length} active variable(s); "${topMutated.name}" mutated most frequently (${topMutated.mutations} time${topMutated.mutations === 1 ? '' : 's'}).`
      : `Your program tracks ${variableStats.length} variable(s) across ${trace.metrics.totalSteps} execution step(s).`,
    details: variableStats
      .slice(0, 4)
      .map(
        (v) =>
          `${v.name} (${v.type}): ${v.mutations} update(s), final value ${v.finalValue}`
      ),
    snippetLanguage: language,
    snippet: getSnippetWindow(lines, steps[0]?.lineNumber || 1, 2),
    takeaway:
      'Tracing variable mutations step-by-step prevents off-by-one and stale-state bugs.',
    targetStepIndex: Math.max(0, steps.length - 1),
  });

  // 4. Dynamically generate Dry-Run Quiz Questions exclusively from THIS program
  const quizzes: QuizQuestion[] = [];

  if (trace.ok && steps.length > 0 && lastStep) {
    // Q1: Final value of most-mutated scalar variable
    const scalarVars = variableStats.filter(
      (v) =>
        v.name !== 'return' &&
        !v.type.startsWith('list') &&
        !v.type.endsWith('[]') &&
        v.type !== 'dict'
    );
    const primaryVar =
      [...scalarVars].sort((a, b) => b.mutations - a.mutations)[0] ||
      scalarVars[0];

    if (primaryVar) {
      const history = varHistory.get(primaryVar.name) || [];
      const { options, correctIndex } = buildUniqueOptions(
        primaryVar.finalValue,
        history.slice(0, -1).reverse(),
        Number(primaryVar.finalValue)
      );
      quizzes.push({
        id: `quiz-final-${primaryVar.name}`,
        topic: `Final State: ${primaryVar.name}`,
        language,
        prompt: `After your ${language} program finishes executing, what is the final value of "${primaryVar.name}"?`,
        code: getSnippetWindow(lines, hottestLine, 4),
        options,
        correctIndex,
        explanation: `Across ${steps.length} execution steps, "${primaryVar.name}" updated ${primaryVar.mutations} time(s) and finished with value ${primaryVar.finalValue}.`,
        targetStepIndex: steps.length - 1,
      });
    }

    // Q2: Final array / list state if program has an array
    if (lastStep.arrayState.length > 0) {
      const finalArrStr = `[${lastStep.arrayState.join(', ')}]`;
      const prevArrStrs = Array.from(
        new Set(steps.map((s) => `[${s.arrayState.join(', ')}]`))
      ).filter((s) => s !== finalArrStr);

      const reversedAlt = `[${[...lastStep.arrayState].reverse().join(', ')}]`;
      const sortedAlt = `[${[...lastStep.arrayState].sort((a, b) => a - b).join(', ')}]`;

      const { options, correctIndex } = buildUniqueOptions(finalArrStr, [
        ...prevArrStrs,
        reversedAlt,
        sortedAlt,
      ]);

      quizzes.push({
        id: 'quiz-final-array',
        topic: `Array Output: ${lastStep.arrayLabel}`,
        language,
        prompt: `What is the final state of "${lastStep.arrayLabel}" when execution completes?`,
        code: getSnippetWindow(
          lines,
          steps[Math.max(0, firstArrayStepIdx)]?.lineNumber || 1,
          4
        ),
        options,
        correctIndex,
        explanation: `Tracing all array updates through Step ${steps.length} leaves ${lastStep.arrayLabel} as ${finalArrStr}.`,
        targetStepIndex: steps.length - 1,
      });
    }

    // Q3: Mid-execution variable state snapshot
    if (steps.length >= 4 && primaryVar) {
      const midIdx = Math.floor(steps.length / 2);
      const midStep = steps[midIdx];
      const midVar = midStep.variables.find((v) => v.name === primaryVar.name);
      if (midVar) {
        const history = varHistory.get(primaryVar.name) || [];
        const { options, correctIndex } = buildUniqueOptions(
          midVar.value,
          history.filter((v) => v !== midVar.value),
          Number(midVar.value)
        );
        quizzes.push({
          id: `quiz-mid-${midIdx}`,
          topic: `Mid-Trace Checkpoint (Step ${midStep.stepNumber})`,
          language,
          prompt: `During Step ${midStep.stepNumber} (Line ${midStep.lineNumber}: ${midStep.note}), what value does "${primaryVar.name}" hold?`,
          code: getSnippetWindow(lines, midStep.lineNumber, 3),
          options,
          correctIndex,
          explanation: `At Step ${midStep.stepNumber}, Line ${midStep.lineNumber} executes (${midStep.note}), leaving ${primaryVar.name} = ${midVar.value}.`,
          targetStepIndex: midIdx,
        });
      }
    }

    // Q4: Console output prediction if stdout was emitted
    if (lastStep.stdout.length > 0) {
      const finalOut = lastStep.stdout[lastStep.stdout.length - 1];
      const earlierOuts = lastStep.stdout
        .slice(0, -1)
        .filter((o) => o !== finalOut);
      const { options, correctIndex } = buildUniqueOptions(finalOut, [
        ...earlierOuts,
        '(no output)',
        '0',
        'Error',
      ]);
      quizzes.push({
        id: 'quiz-stdout-last',
        topic: 'Console Output (stdout)',
        language,
        prompt:
          lastStep.stdout.length === 1
            ? 'What line does your program print to stdout?'
            : 'What is the FINAL line printed to stdout by your program?',
        code: getSnippetWindow(lines, lines.length, 4),
        options,
        correctIndex,
        explanation: `Your program emitted ${lastStep.stdout.length} stdout line(s), ending with "${finalOut}".`,
        targetStepIndex: steps.length - 1,
      });
    }

    // Q5: Estimated Complexity of THIS program
    const complexityChoices = ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)', 'O(n^3)'];
    const { options: compOpts, correctIndex: compIdx } = buildUniqueOptions(
      trace.metrics.estimatedComplexity,
      complexityChoices
    );
    quizzes.push({
      id: 'quiz-complexity',
      topic: 'Asymptotic Complexity',
      language,
      prompt:
        'Based on the active loop nesting depth in your program, what is its estimated time complexity?',
      code: getSnippetWindow(lines, hottestLine, 4),
      options: compOpts,
      correctIndex: compIdx,
      explanation: `Your program reached a maximum loop nesting depth of ${trace.metrics.maxLoopDepth}, yielding an estimated ${trace.metrics.estimatedComplexity} scaling profile.`,
      targetStepIndex: Math.max(0, firstLoopStepIdx),
    });

    // Q6: Hottest Line Execution Count
    if (lineStats.length >= 2) {
      const correctLineLabel = `Line ${hottestLine} (${maxHits} hits)`;
      const otherLines = lineStats
        .filter((l) => l.lineNumber !== hottestLine)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 3)
        .map((l) => `Line ${l.lineNumber} (${l.hits} hits)`);

      const { options, correctIndex } = buildUniqueOptions(
        correctLineLabel,
        otherLines
      );

      quizzes.push({
        id: 'quiz-hot-line',
        topic: 'Execution Frequency',
        language,
        prompt:
          'Which line in your program executed the most times during this dry run?',
        code: getSnippetWindow(lines, hottestLine, 4),
        options,
        correctIndex,
        explanation: `Line ${hottestLine} ("${(lines[hottestLine - 1] || '').trim()}") executed ${maxHits} time(s), more than any other line.`,
        targetStepIndex: Math.max(
          0,
          steps.findIndex((s) => s.lineNumber === hottestLine)
        ),
      });
    }
  }

  return {
    concepts,
    quizzes,
    lineStats,
    variableStats,
    nonEmptyLines,
    hottestLine,
  };
}
