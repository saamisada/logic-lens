import type {
  ArrayPointer,
  ExecutionStep,
  FunctionParamSpec,
  MemoryVariable,
  ProgramLanguage,
  TraceResult,
} from '@/src/types/algorithm';

type RuntimeVal =
  | number
  | string
  | boolean
  | null
  | RuntimeVal[]
  | { __dict: true; entries: Map<string, RuntimeVal> }
  | { __ptr: true; targetName: string; offset: number };

interface Scope {
  vars: Map<string, RuntimeVal>;
  types: Map<string, string>;
}

const MAX_STEPS = 420;
const MAX_CALL_DEPTH = 24;

function isDict(v: RuntimeVal): v is { __dict: true; entries: Map<string, RuntimeVal> } {
  return typeof v === 'object' && v !== null && '__dict' in v;
}

function isPtr(v: RuntimeVal): v is { __ptr: true; targetName: string; offset: number } {
  return typeof v === 'object' && v !== null && '__ptr' in v;
}

function formatVal(v: RuntimeVal): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : Number(v.toFixed(4)).toString();
  }
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) {
    return `[${v.map((item) => formatVal(item)).join(', ')}]`;
  }
  if (isDict(v)) {
    const parts = Array.from(v.entries.entries()).map(
      ([k, val]) => `${k}: ${formatVal(val)}`
    );
    return `{${parts.join(', ')}}`;
  }
  if (isPtr(v)) {
    return `&${v.targetName}[${v.offset}]`;
  }
  return String(v);
}

function formatRawForPrint(v: RuntimeVal): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : Number(v.toFixed(4)).toString();
  }
  return formatVal(v);
}

function inferType(v: RuntimeVal, declared?: string): string {
  if (declared) return declared;
  if (v === null) return 'null';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) return `list[${v.length}]`;
  if (isDict(v)) return 'dict';
  if (isPtr(v)) return 'int*';
  return 'var';
}

function cloneRuntimeVal(v: RuntimeVal): RuntimeVal {
  if (Array.isArray(v)) return v.map(cloneRuntimeVal);
  if (isDict(v)) {
    const copy = new Map<string, RuntimeVal>();
    v.entries.forEach((val, key) => copy.set(key, cloneRuntimeVal(val)));
    return { __dict: true, entries: copy };
  }
  if (isPtr(v)) return { ...v };
  return v;
}

class ControlSignal {
  constructor(
    public kind: 'return' | 'break' | 'continue',
    public value: RuntimeVal = null
  ) {}
}

class TraceError extends Error {
  constructor(
    message: string,
    public lineNumber: number
  ) {
    super(message);
  }
}

// ---------- Expression Tokenizer & Recursive Descent Evaluator ----------

type TokType = 'num' | 'str' | 'id' | 'op' | 'punc';
interface Tok {
  type: TokType;
  val: string;
}

function tokenizeExpr(expr: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  const twoCharOps = new Set([
    '==',
    '!=',
    '<=',
    '>=',
    '//',
    '**',
    '&&',
    '||',
    '++',
    '--',
  ]);

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // f-string prefix
    if ((ch === 'f' || ch === 'F') && (expr[i + 1] === '"' || expr[i + 1] === "'")) {
      const quote = expr[i + 1];
      i += 2;
      let str = '';
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          const esc = expr[i + 1];
          str += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
          i += 2;
        } else {
          str += expr[i++];
        }
      }
      i++;
      tokens.push({ type: 'str', val: `__FSTR__${str}` });
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          const esc = expr[i + 1];
          str += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
          i += 2;
        } else {
          str += expr[i++];
        }
      }
      i++;
      tokens.push({ type: 'str', val: str });
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      tokens.push({ type: 'num', val: numStr });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      tokens.push({ type: 'id', val: id });
      continue;
    }

    const two = expr.slice(i, i + 2);
    if (twoCharOps.has(two)) {
      tokens.push({ type: 'op', val: two });
      i += 2;
      continue;
    }

    if ('+-*/%<>=!&|'.includes(ch)) {
      tokens.push({ type: 'op', val: ch });
      i++;
      continue;
    }

    if ('()[]{},.:'.includes(ch)) {
      tokens.push({ type: 'punc', val: ch });
      i++;
      continue;
    }

    i++;
  }
  return tokens;
}

function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote: string | null = null;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      current += ch;
      if (ch === '\\' && i + 1 < text.length) {
        current += text[++i];
      } else if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
    } else if ('([{'.includes(ch)) {
      depth++;
      current += ch;
    } else if (')]}'.includes(ch)) {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      if (current.trim().length > 0) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    parts.push(current.trim());
  }
  return parts;
}

function splitTopLevelSemicolons(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote: string | null = null;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      current += ch;
      if (ch === '\\' && i + 1 < text.length) {
        current += text[++i];
      } else if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
    } else if ('([{'.includes(ch)) {
      depth++;
      current += ch;
    } else if (')]}'.includes(ch)) {
      depth--;
      current += ch;
    } else if (ch === ';' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) {
    parts.push(current.trim());
  }
  return parts;
}

// ---------- AST Statements ----------

interface PyFuncDef {
  name: string;
  params: string[];
  body: PyStmt[];
  line: number;
}

type PyStmt =
  | { kind: 'def'; line: number; func: PyFuncDef }
  | { kind: 'if'; line: number; branches: Array<{ cond: string | null; body: PyStmt[]; line: number }> }
  | { kind: 'for'; line: number; target: string; iterExpr: string; body: PyStmt[] }
  | { kind: 'while'; line: number; cond: string; body: PyStmt[] }
  | { kind: 'return'; line: number; expr: string | null }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }
  | { kind: 'simple'; line: number; text: string };

interface CFuncDef {
  returnType: string;
  name: string;
  params: Array<{ type: string; name: string; isArray: boolean; isPtr: boolean }>;
  body: CStmt[];
  line: number;
}

type CStmt =
  | { kind: 'block'; line: number; stmts: CStmt[] }
  | { kind: 'if'; line: number; cond: string; thenBranch: CStmt; elseBranch: CStmt | null }
  | { kind: 'for'; line: number; init: string; cond: string; update: string; body: CStmt }
  | { kind: 'while'; line: number; cond: string; body: CStmt }
  | { kind: 'doWhile'; line: number; cond: string; body: CStmt }
  | { kind: 'return'; line: number; expr: string | null }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }
  | { kind: 'simple'; line: number; text: string };

// ---------- Python Parser ----------

function stripPythonComment(line: string): string {
  let inQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '\\') {
        i++;
      } else if (ch === inQuote) {
        inQuote = null;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

function parsePython(source: string): { stmts: PyStmt[]; funcs: Map<string, PyFuncDef> } {
  const rawLines = source.split(/\r?\n/);
  const lines: Array<{ line: number; indent: number; text: string }> = [];

  for (let i = 0; i < rawLines.length; i++) {
    const noComment = stripPythonComment(rawLines[i]).replace(/\t/g, '  ');
    if (noComment.trim().length === 0) continue;
    const indent = noComment.search(/\S/);
    lines.push({
      line: i + 1,
      indent: indent === -1 ? 0 : indent,
      text: noComment.trim(),
    });
  }

  const funcs = new Map<string, PyFuncDef>();
  let cursor = 0;

  function parseBlock(minIndent: number): PyStmt[] {
    const block: PyStmt[] = [];
    while (cursor < lines.length && lines[cursor].indent >= minIndent) {
      const cur = lines[cursor];
      if (cur.text.startsWith('def ')) {
        const match = /^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*(.*)$/.exec(cur.text);
        if (!match) {
          throw new TraceError(`Invalid Python function definition: ${cur.text}`, cur.line);
        }
        const name = match[1];
        const params = match[2]
          .split(',')
          .map((p) => p.trim().split('=')[0].trim())
          .filter(Boolean);
        const inlineBody = match[3].trim();
        cursor++;
        let body: PyStmt[] = [];
        if (inlineBody) {
          body = [{ kind: 'simple', line: cur.line, text: inlineBody }];
        } else if (cursor < lines.length && lines[cursor].indent > cur.indent) {
          body = parseBlock(lines[cursor].indent);
        }
        const func: PyFuncDef = { name, params, body, line: cur.line };
        funcs.set(name, func);
        block.push({ kind: 'def', line: cur.line, func });
        continue;
      }

      if (cur.text.startsWith('if ') && cur.text.includes(':')) {
        const branches: Array<{ cond: string | null; body: PyStmt[]; line: number }> = [];
        const colonIdx = cur.text.lastIndexOf(':');
        const cond = cur.text.slice(3, colonIdx).trim();
        const inline = cur.text.slice(colonIdx + 1).trim();
        const baseIndent = cur.indent;
        cursor++;
        let body: PyStmt[] = [];
        if (inline) {
          body = [{ kind: 'simple', line: cur.line, text: inline }];
        } else if (cursor < lines.length && lines[cursor].indent > baseIndent) {
          body = parseBlock(lines[cursor].indent);
        }
        branches.push({ cond, body, line: cur.line });

        while (cursor < lines.length && lines[cursor].indent === baseIndent) {
          const next = lines[cursor];
          if (next.text.startsWith('elif ') && next.text.includes(':')) {
            const cIdx = next.text.lastIndexOf(':');
            const eCond = next.text.slice(5, cIdx).trim();
            const eInline = next.text.slice(cIdx + 1).trim();
            cursor++;
            let eBody: PyStmt[] = [];
            if (eInline) {
              eBody = [{ kind: 'simple', line: next.line, text: eInline }];
            } else if (cursor < lines.length && lines[cursor].indent > baseIndent) {
              eBody = parseBlock(lines[cursor].indent);
            }
            branches.push({ cond: eCond, body: eBody, line: next.line });
          } else if (/^else\s*:/.test(next.text)) {
            const cIdx = next.text.indexOf(':');
            const eInline = next.text.slice(cIdx + 1).trim();
            cursor++;
            let eBody: PyStmt[] = [];
            if (eInline) {
              eBody = [{ kind: 'simple', line: next.line, text: eInline }];
            } else if (cursor < lines.length && lines[cursor].indent > baseIndent) {
              eBody = parseBlock(lines[cursor].indent);
            }
            branches.push({ cond: null, body: eBody, line: next.line });
            break;
          } else {
            break;
          }
        }
        block.push({ kind: 'if', line: cur.line, branches });
        continue;
      }

      if (cur.text.startsWith('for ')) {
        const match = /^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):\s*(.*)$/.exec(cur.text);
        if (!match) {
          throw new TraceError(`Unsupported Python for-loop syntax: ${cur.text}`, cur.line);
        }
        const target = match[1];
        const iterExpr = match[2].trim();
        const inline = match[3].trim();
        cursor++;
        let body: PyStmt[] = [];
        if (inline) {
          body = [{ kind: 'simple', line: cur.line, text: inline }];
        } else if (cursor < lines.length && lines[cursor].indent > cur.indent) {
          body = parseBlock(lines[cursor].indent);
        }
        block.push({ kind: 'for', line: cur.line, target, iterExpr, body });
        continue;
      }

      if (cur.text.startsWith('while ')) {
        const match = /^while\s+(.+):\s*(.*)$/.exec(cur.text);
        if (!match) {
          throw new TraceError(`Invalid Python while-loop: ${cur.text}`, cur.line);
        }
        const cond = match[1].trim();
        const inline = match[2].trim();
        cursor++;
        let body: PyStmt[] = [];
        if (inline) {
          body = [{ kind: 'simple', line: cur.line, text: inline }];
        } else if (cursor < lines.length && lines[cursor].indent > cur.indent) {
          body = parseBlock(lines[cursor].indent);
        }
        block.push({ kind: 'while', line: cur.line, cond, body });
        continue;
      }

      if (cur.text === 'return' || cur.text.startsWith('return ')) {
        const expr = cur.text === 'return' ? null : cur.text.slice(7).trim();
        cursor++;
        block.push({ kind: 'return', line: cur.line, expr });
        continue;
      }

      if (cur.text === 'break') {
        cursor++;
        block.push({ kind: 'break', line: cur.line });
        continue;
      }

      if (cur.text === 'continue') {
        cursor++;
        block.push({ kind: 'continue', line: cur.line });
        continue;
      }

      cursor++;
      block.push({ kind: 'simple', line: cur.line, text: cur.text });
    }
    return block;
  }

  const stmts = parseBlock(0);
  return { stmts, funcs };
}

// ---------- C Parser ----------

interface CTok {
  val: string;
  line: number;
  kind: 'id' | 'num' | 'str' | 'sym';
}

function tokenizeC(source: string): { tokens: CTok[]; defines: Map<string, string> } {
  const defines = new Map<string, string>();
  const lines = source.split(/\r?\n/);
  const tokens: CTok[] = [];
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNo = lineIdx + 1;
    const raw = lines[lineIdx];
    const trimmed = raw.trim();

    if (!inBlockComment && trimmed.startsWith('#')) {
      const defMatch = /^#define\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/.exec(trimmed);
      if (defMatch) {
        defines.set(defMatch[1], defMatch[2].trim());
      }
      continue;
    }

    let i = 0;
    while (i < raw.length) {
      if (inBlockComment) {
        if (raw[i] === '*' && raw[i + 1] === '/') {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (raw[i] === '/' && raw[i + 1] === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (raw[i] === '/' && raw[i + 1] === '/') {
        break;
      }
      if (/\s/.test(raw[i])) {
        i++;
        continue;
      }

      if (raw[i] === '"' || raw[i] === "'") {
        const quote = raw[i];
        i++;
        let s = '';
        while (i < raw.length && raw[i] !== quote) {
          if (raw[i] === '\\' && i + 1 < raw.length) {
            const esc = raw[i + 1];
            s += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
            i += 2;
          } else {
            s += raw[i++];
          }
        }
        i++;
        tokens.push({ val: quote === '"' ? `"${s}"` : `'${s}'`, line: lineNo, kind: 'str' });
        continue;
      }

      if (/[0-9]/.test(raw[i])) {
        let num = '';
        while (i < raw.length && /[0-9.]/.test(raw[i])) num += raw[i++];
        tokens.push({ val: num, line: lineNo, kind: 'num' });
        continue;
      }

      if (/[A-Za-z_]/.test(raw[i])) {
        let id = '';
        while (i < raw.length && /[A-Za-z0-9_]/.test(raw[i])) id += raw[i++];
        const expanded = defines.get(id);
        if (expanded && /^[0-9]+(\.[0-9]+)?$/.test(expanded)) {
          tokens.push({ val: expanded, line: lineNo, kind: 'num' });
        } else {
          tokens.push({ val: id, line: lineNo, kind: 'id' });
        }
        continue;
      }

      const two = raw.slice(i, i + 2);
      if (
        ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%='].includes(
          two
        )
      ) {
        tokens.push({ val: two, line: lineNo, kind: 'sym' });
        i += 2;
        continue;
      }

      tokens.push({ val: raw[i], line: lineNo, kind: 'sym' });
      i++;
    }
  }

  return { tokens, defines };
}

function joinCTokens(toks: CTok[]): string {
  return toks
    .map((t, idx) => {
      if (idx === 0) return t.val;
      const prev = toks[idx - 1];
      if (
        t.val === '(' ||
        t.val === ')' ||
        t.val === '[' ||
        t.val === ']' ||
        t.val === ',' ||
        t.val === ';' ||
        prev.val === '(' ||
        prev.val === '[' ||
        t.val === '++' ||
        t.val === '--'
      ) {
        return t.val;
      }
      return ' ' + t.val;
    })
    .join('');
}

function parseC(source: string): { stmts: CStmt[]; funcs: Map<string, CFuncDef> } {
  const { tokens } = tokenizeC(source);
  const funcs = new Map<string, CFuncDef>();
  let pos = 0;

  const peek = (offset = 0) => tokens[pos + offset];

  function readParenGroup(): { inner: CTok[]; line: number } {
    if (peek()?.val !== '(') {
      throw new TraceError('Expected "(" in C statement', peek()?.line || 1);
    }
    const line = peek().line;
    pos++;
    let depth = 1;
    const inner: CTok[] = [];
    while (pos < tokens.length && depth > 0) {
      const t = tokens[pos++];
      if (t.val === '(') depth++;
      else if (t.val === ')') {
        depth--;
        if (depth === 0) break;
      }
      inner.push(t);
    }
    return { inner, line };
  }

  const C_TYPES = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'short', 'bool']);

  function isFuncStart(): boolean {
    if (!peek() || !C_TYPES.has(peek().val)) return false;
    let look = pos + 1;
    while (look < tokens.length && tokens[look].val === '*') look++;
    const nameTok = tokens[look];
    const openTok = tokens[look + 1];
    if (!nameTok || nameTok.kind !== 'id' || !openTok || openTok.val !== '(') {
      return false;
    }
    // Find matching ')'
    let d = 0;
    for (let j = look + 1; j < tokens.length; j++) {
      if (tokens[j].val === '(') d++;
      else if (tokens[j].val === ')') {
        d--;
        if (d === 0) {
          return tokens[j + 1]?.val === '{';
        }
      }
    }
    return false;
  }

  function parseBlock(): CStmt {
    const open = tokens[pos++];
    const stmts: CStmt[] = [];
    while (pos < tokens.length && peek()?.val !== '}') {
      stmts.push(parseStmt());
    }
    if (peek()?.val === '}') pos++;
    return { kind: 'block', line: open.line, stmts };
  }

  function parseStmt(): CStmt {
    const t = peek();
    if (!t) return { kind: 'simple', line: 1, text: '' };

    if (t.val === '{') {
      return parseBlock();
    }

    if (t.val === 'if') {
      const line = t.line;
      pos++;
      const { inner } = readParenGroup();
      const cond = joinCTokens(inner);
      const thenBranch = parseStmt();
      let elseBranch: CStmt | null = null;
      if (peek()?.val === 'else') {
        pos++;
        elseBranch = parseStmt();
      }
      return { kind: 'if', line, cond, thenBranch, elseBranch };
    }

    if (t.val === 'for') {
      const line = t.line;
      pos++;
      const { inner } = readParenGroup();
      const raw = joinCTokens(inner);
      const parts = splitTopLevelSemicolons(raw);
      const body = parseStmt();
      return {
        kind: 'for',
        line,
        init: parts[0] || '',
        cond: parts[1] || '1',
        update: parts[2] || '',
        body,
      };
    }

    if (t.val === 'while') {
      const line = t.line;
      pos++;
      const { inner } = readParenGroup();
      const body = parseStmt();
      return { kind: 'while', line, cond: joinCTokens(inner), body };
    }

    if (t.val === 'do') {
      const line = t.line;
      pos++;
      const body = parseStmt();
      if (peek()?.val === 'while') pos++;
      const { inner } = readParenGroup();
      if (peek()?.val === ';') pos++;
      return { kind: 'doWhile', line, cond: joinCTokens(inner), body };
    }

    if (t.val === 'return') {
      const line = t.line;
      pos++;
      const collected: CTok[] = [];
      while (pos < tokens.length && peek()?.val !== ';') {
        collected.push(tokens[pos++]);
      }
      if (peek()?.val === ';') pos++;
      return {
        kind: 'return',
        line,
        expr: collected.length > 0 ? joinCTokens(collected) : null,
      };
    }

    if (t.val === 'break') {
      const line = t.line;
      pos++;
      if (peek()?.val === ';') pos++;
      return { kind: 'break', line };
    }

    if (t.val === 'continue') {
      const line = t.line;
      pos++;
      if (peek()?.val === ';') pos++;
      return { kind: 'continue', line };
    }

    // Simple statement until ';'
    const line = t.line;
    const collected: CTok[] = [];
    let braceDepth = 0;
    while (pos < tokens.length) {
      const cur = tokens[pos];
      if (cur.val === '{') braceDepth++;
      else if (cur.val === '}') {
        if (braceDepth === 0) break;
        braceDepth--;
      } else if (cur.val === ';' && braceDepth === 0) {
        pos++;
        break;
      }
      collected.push(tokens[pos++]);
    }
    return { kind: 'simple', line, text: joinCTokens(collected) };
  }

  const topStmts: CStmt[] = [];

  while (pos < tokens.length) {
    if (isFuncStart()) {
      const line = peek().line;
      const returnType = tokens[pos++].val;
      while (peek()?.val === '*') pos++;
      const name = tokens[pos++].val;
      const { inner } = readParenGroup();
      const paramStr = joinCTokens(inner);
      const params: CFuncDef['params'] = [];
      if (paramStr.trim() && paramStr.trim() !== 'void') {
        for (const rawParam of splitTopLevelCommas(paramStr)) {
          const isArray = rawParam.includes('[');
          const isPtrParam = rawParam.includes('*');
          const cleaned = rawParam.replace(/\[[^\]]*\]/g, '').replace(/\*/g, ' ').trim();
          const parts = cleaned.split(/\s+/);
          const pName = parts[parts.length - 1];
          const pType = parts.slice(0, -1).join(' ') || 'int';
          params.push({ type: pType, name: pName, isArray, isPtr: isPtrParam });
        }
      }
      const block = parseBlock();
      const func: CFuncDef = {
        returnType,
        name,
        params,
        body: block.kind === 'block' ? block.stmts : [block],
        line,
      };
      funcs.set(name, func);
    } else {
      topStmts.push(parseStmt());
    }
  }

  return { stmts: topStmts, funcs };
}

// ---------- Core Execution Engine ----------

function detectParamDefaults(
  names: Array<{ name: string; hintArray?: boolean }>,
  overrides: Record<string, string>
): { specs: FunctionParamSpec[]; values: Map<string, RuntimeVal> } {
  const specs: FunctionParamSpec[] = [];
  const values = new Map<string, RuntimeVal>();

  const defaultArray = [29, 10, 14, 37, 13];
  const sortedDefaultArray = [11, 22, 34, 47, 58, 72];

  // Heuristic: if parameter list has target/key, use sorted array
  const hasTarget = names.some((p) => /target|key|search/i.test(p.name));

  for (const p of names) {
    const lower = p.name.toLowerCase();
    let kind: FunctionParamSpec['kind'] = 'number';
    let defVal = '5';

    if (
      p.hintArray ||
      ['arr', 'nums', 'data', 'a', 'list', 'vec', 'items'].includes(lower)
    ) {
      kind = 'array';
      defVal = (hasTarget ? sortedDefaultArray : defaultArray).join(', ');
    } else if (lower === 'n' || lower === 'len' || lower === 'size') {
      kind = 'number';
      const arrParam = names.find(
        (x) =>
          x.hintArray ||
          ['arr', 'nums', 'data', 'a', 'list', 'vec', 'items'].includes(
            x.name.toLowerCase()
          )
      );
      if (arrParam) {
        const overrideArr = overrides[arrParam.name];
        if (overrideArr) {
          const parsedCount = overrideArr
            .split(/[\s,]+/)
            .filter((s) => s.trim().length > 0).length;
          defVal = String(Math.max(1, parsedCount));
        } else {
          defVal = String(hasTarget ? sortedDefaultArray.length : defaultArray.length);
        }
      } else {
        defVal = '6';
      }
    } else if (/target|key/.test(lower)) {
      kind = 'number';
      defVal = '58';
    } else if (lower === 's' || lower === 'str' || lower === 'text') {
      kind = 'string';
      defVal = 'logiclens';
    }

    const userRaw = overrides[p.name] ?? defVal;
    specs.push({ name: p.name, kind, defaultValue: userRaw });

    if (kind === 'array') {
      const nums = userRaw
        .split(/[\s,]+/)
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isFinite(x));
      values.set(p.name, nums.length > 0 ? nums : [...defaultArray]);
    } else if (kind === 'string') {
      values.set(p.name, userRaw);
    } else {
      const num = Number(userRaw);
      values.set(p.name, Number.isFinite(num) ? num : 5);
    }
  }

  return { specs, values };
}

export function traceProgram(
  language: ProgramLanguage,
  source: string,
  paramOverrides: Record<string, string> = {}
): TraceResult {
  const codeLines = source.split(/\r?\n/);
  if (source.trim().length === 0) {
    return {
      ok: false,
      error: 'Paste or enter a Python or C program to trace.',
      codeLines,
      steps: [],
      detectedParams: [],
      metrics: {
        totalSteps: 0,
        maxLoopDepth: 0,
        comparisons: 0,
        writes: 0,
        estimatedComplexity: 'O(1)',
        detectedEntry: 'None',
      },
    };
  }

  try {
    const steps: ExecutionStep[] = [];
    const stdout: string[] = [];
    const scopes: Scope[] = [{ vars: new Map(), types: new Map() }];
    let prevSnapshot = new Map<string, string>();
    let prevArrayState: number[] = [];
    let prevDictState = new Map<string, number>();

    let comparisons = 0;
    let writes = 0;
    let currentLoopDepth = 0;
    let maxLoopDepth = 0;
    let truncated = false;
    let callDepth = 0;

    const pyFuncs = new Map<string, PyFuncDef>();
    const cFuncs = new Map<string, CFuncDef>();

    const lookupVar = (name: string): { scope: Scope; val: RuntimeVal } | null => {
      for (let i = scopes.length - 1; i >= 0; i--) {
        if (scopes[i].vars.has(name)) {
          return { scope: scopes[i], val: scopes[i].vars.get(name)! };
        }
      }
      return null;
    };

    const setVar = (name: string, val: RuntimeVal, declaredType?: string) => {
      writes++;
      for (let i = scopes.length - 1; i >= 0; i--) {
        if (scopes[i].vars.has(name)) {
          scopes[i].vars.set(name, val);
          if (declaredType) scopes[i].types.set(name, declaredType);
          return;
        }
      }
      const top = scopes[scopes.length - 1];
      top.vars.set(name, val);
      if (declaredType) top.types.set(name, declaredType);
    };

    const declareLocalVar = (name: string, val: RuntimeVal, declaredType?: string) => {
      writes++;
      const top = scopes[scopes.length - 1];
      top.vars.set(name, val);
      if (declaredType) top.types.set(name, declaredType);
    };

    const recordStep = (
      lineNumber: number,
      note: string,
      deepExplanation: string,
      comparedIndices?: number[],
      swappedIndices?: number[]
    ) => {
      if (steps.length >= MAX_STEPS) {
        truncated = true;
        throw new Error('__MAX_STEPS__');
      }

      // Collect visible variables from active scopes
      const mergedVars = new Map<string, { val: RuntimeVal; type: string }>();
      for (const sc of scopes) {
        sc.vars.forEach((val, key) => {
          mergedVars.set(key, { val, type: inferType(val, sc.types.get(key)) });
        });
      }

      const variables: MemoryVariable[] = [];
      const nextSnap = new Map<string, string>();

      // Identify primary array and optional dictionary
      let arrayState: number[] = [];
      let arrayLabel = 'arr[]';
      let foundNumericArray = false;
      let auxPairs: { key: string; value: number; updated?: boolean }[] | undefined;
      let auxLabel: string | undefined;

      mergedVars.forEach(({ val, type }, name) => {
        const formatted = formatVal(val);
        nextSnap.set(name, formatted);
        const changed = prevSnapshot.get(name) !== formatted;

        if (!foundNumericArray && Array.isArray(val)) {
          const allNums = val.every((x) => typeof x === 'number');
          if (allNums) {
            foundNumericArray = true;
            arrayLabel = language === 'C' ? `${name}[]` : name;
            arrayState = val.map((x) => Number(x));
          }
        }

        if (!auxPairs && isDict(val)) {
          auxLabel = name;
          const pairs: { key: string; value: number; updated?: boolean }[] = [];
          const nextDictSnap = new Map<string, number>();
          val.entries.forEach((v, k) => {
            const num = typeof v === 'number' ? v : 0;
            nextDictSnap.set(k, num);
            pairs.push({
              key: k,
              value: num,
              updated: prevDictState.get(k) !== num,
            });
          });
          prevDictState = nextDictSnap;
          auxPairs = pairs;
        }

        variables.push({
          name,
          value: formatted,
          type,
          updated: changed,
        });
      });

      // Automatically detect swapped indices if two elements changed between steps
      let autoSwapped = swappedIndices;
      if (!autoSwapped && foundNumericArray && prevArrayState.length === arrayState.length) {
        const changedIndices: number[] = [];
        for (let k = 0; k < arrayState.length; k++) {
          if (prevArrayState[k] !== arrayState[k]) {
            changedIndices.push(k);
          }
        }
        if (changedIndices.length > 0 && changedIndices.length <= 2) {
          autoSwapped = changedIndices;
        }
      }
      prevArrayState = [...arrayState];
      prevSnapshot = nextSnap;

      // Auto-attach index pointer badges for common loop/index integer variables
      const pointerNames = new Set([
        'i',
        'j',
        'k',
        'low',
        'high',
        'mid',
        'left',
        'right',
        'minidx',
        'min_idx',
        'min',
        'idx',
        'index',
        'l',
        'r',
        'p',
        'q',
      ]);
      const pointers: ArrayPointer[] = [];
      if (arrayState.length > 0) {
        mergedVars.forEach(({ val }, name) => {
          if (
            typeof val === 'number' &&
            Number.isInteger(val) &&
            val >= 0 &&
            val < arrayState.length &&
            pointerNames.has(name.toLowerCase())
          ) {
            pointers.push({ name, index: val });
          }
        });
      }

      steps.push({
        stepNumber: steps.length + 1,
        lineNumber: Math.max(1, Math.min(codeLines.length, lineNumber)),
        note,
        deepExplanation,
        arrayState,
        arrayLabel,
        pointers,
        comparedIndices,
        swappedIndices: autoSwapped,
        variables,
        stdout: [...stdout],
        auxiliaryPairs: auxPairs,
        auxiliaryLabel: auxLabel,
      });
    };

    // ---------- Shared Expression Evaluator ----------

    function evalExpr(exprText: string, lineNo: number): RuntimeVal {
      const toks = tokenizeExpr(exprText);
      let idx = 0;

      const peekTok = () => toks[idx];
      const nextTok = () => toks[idx++];

      function parseOr(): RuntimeVal {
        let left = parseAnd();
        while (
          peekTok() &&
          (peekTok().val === 'or' || peekTok().val === '||')
        ) {
          nextTok();
          const right = parseAnd();
          left = Boolean(left) || Boolean(right);
        }
        return left;
      }

      function parseAnd(): RuntimeVal {
        let left = parseNot();
        while (
          peekTok() &&
          (peekTok().val === 'and' || peekTok().val === '&&')
        ) {
          nextTok();
          const right = parseNot();
          left = Boolean(left) && Boolean(right);
        }
        return left;
      }

      function parseNot(): RuntimeVal {
        if (
          peekTok() &&
          (peekTok().val === 'not' || peekTok().val === '!')
        ) {
          nextTok();
          return !Boolean(parseNot());
        }
        return parseCompare();
      }

      function parseCompare(): RuntimeVal {
        let left = parseAddSub();
        const cmpOps = new Set(['==', '!=', '<', '<=', '>', '>=', 'in']);
        while (
          peekTok() &&
          (cmpOps.has(peekTok().val) ||
            (peekTok().val === 'not' && toks[idx + 1]?.val === 'in'))
        ) {
          comparisons++;
          let op = nextTok().val;
          if (op === 'not' && peekTok()?.val === 'in') {
            nextTok();
            op = 'not in';
          }
          const right = parseAddSub();
          if (op === '==') left = left === right;
          else if (op === '!=') left = left !== right;
          else if (op === '<') left = Number(left) < Number(right);
          else if (op === '<=') left = Number(left) <= Number(right);
          else if (op === '>') left = Number(left) > Number(right);
          else if (op === '>=') left = Number(left) >= Number(right);
          else if (op === 'in' || op === 'not in') {
            let found = false;
            if (isDict(right)) {
              found = right.entries.has(String(left));
            } else if (Array.isArray(right)) {
              found = right.includes(left);
            } else if (typeof right === 'string') {
              found = right.includes(String(left));
            }
            left = op === 'in' ? found : !found;
          }
        }
        return left;
      }

      function parseAddSub(): RuntimeVal {
        let left = parseMulDiv();
        while (
          peekTok() &&
          (peekTok().val === '+' || peekTok().val === '-')
        ) {
          const op = nextTok().val;
          const right = parseMulDiv();
          if (op === '+') {
            // C pointer arithmetic: arr + offset
            if (Array.isArray(left) && typeof right === 'number') {
              // Represent offset as pointer
              const arrName = findArrayVarName(left) || 'arr';
              left = { __ptr: true, targetName: arrName, offset: right };
            } else if (isPtr(left) && typeof right === 'number') {
              left = {
                __ptr: true,
                targetName: left.targetName,
                offset: left.offset + right,
              };
            } else if (typeof left === 'string' || typeof right === 'string') {
              left = String(left) + String(right);
            } else {
              left = Number(left) + Number(right);
            }
          } else {
            left = Number(left) - Number(right);
          }
        }
        return left;
      }

      function parseMulDiv(): RuntimeVal {
        let left = parsePower();
        while (
          peekTok() &&
          ['*', '/', '//', '%'].includes(peekTok().val)
        ) {
          const op = nextTok().val;
          const right = parsePower();
          if (op === '*') {
            left = Number(left) * Number(right);
          } else if (op === '/') {
            if (language === 'C' && Number.isInteger(left) && Number.isInteger(right)) {
              left = Math.trunc(Number(left) / Number(right));
            } else {
              left = Number(left) / Number(right);
            }
          } else if (op === '//') {
            left = Math.floor(Number(left) / Number(right));
          } else if (op === '%') {
            left = Number(left) % Number(right);
          }
        }
        return left;
      }

      function parsePower(): RuntimeVal {
        const left = parseUnary();
        if (peekTok()?.val === '**') {
          nextTok();
          const right = parsePower();
          return Math.pow(Number(left), Number(right));
        }
        return left;
      }

      function parseUnary(): RuntimeVal {
        if (peekTok()?.val === '-') {
          nextTok();
          return -Number(parseUnary());
        }
        if (peekTok()?.val === '+') {
          nextTok();
          return +Number(parseUnary());
        }
        if (peekTok()?.val === '*') {
          // C pointer dereference: *ptr or *(arr + i)
          nextTok();
          const target = parseUnary();
          if (isPtr(target)) {
            const found = lookupVar(target.targetName);
            if (found && Array.isArray(found.val)) {
              return found.val[target.offset] ?? 0;
            }
          }
          if (Array.isArray(target)) {
            return target[0] ?? 0;
          }
          return target;
        }
        if (peekTok()?.val === '&') {
          nextTok();
          const nameTok = peekTok();
          if (nameTok && nameTok.type === 'id') {
            nextTok();
            if (peekTok()?.val === '[') {
              nextTok();
              const indexVal = Number(parseOr());
              if (peekTok()?.val === ']') nextTok();
              return { __ptr: true, targetName: nameTok.val, offset: indexVal };
            }
            return { __ptr: true, targetName: nameTok.val, offset: 0 };
          }
        }
        return parsePostfix();
      }

      function parsePostfix(): RuntimeVal {
        let val = parsePrimary();

        while (peekTok()) {
          if (peekTok().val === '[') {
            nextTok();
            const keyVal = parseOr();
            if (peekTok()?.val === ']') nextTok();
            if (Array.isArray(val)) {
              let k = Number(keyVal);
              if (k < 0) k = val.length + k;
              val = val[k] ?? null;
            } else if (isDict(val)) {
              val = val.entries.get(String(keyVal)) ?? null;
            } else if (typeof val === 'string') {
              let k = Number(keyVal);
              if (k < 0) k = val.length + k;
              val = val[k] ?? '';
            }
          } else if (peekTok().val === '.') {
            nextTok();
            const method = nextTok()?.val || '';
            if (peekTok()?.val === '(') {
              nextTok();
              const args: RuntimeVal[] = [];
              while (peekTok() && peekTok().val !== ')') {
                args.push(parseOr());
                if (peekTok()?.val === ',') nextTok();
              }
              if (peekTok()?.val === ')') nextTok();

              if (Array.isArray(val)) {
                if (method === 'append') {
                  val.push(args[0] ?? null);
                  val = null;
                } else if (method === 'pop') {
                  val = val.pop() ?? null;
                }
              } else if (isDict(val)) {
                if (method === 'get') {
                  const key = String(args[0] ?? '');
                  val = val.entries.has(key)
                    ? val.entries.get(key)!
                    : (args[1] ?? null);
                }
              }
            }
          } else if (peekTok().val === '++' || peekTok().val === '--') {
            // Postfix handled in simple statements primarily; still support read
            nextTok();
          } else {
            break;
          }
        }
        return val;
      }

      function parsePrimary(): RuntimeVal {
        const t = peekTok();
        if (!t) return null;

        if (t.type === 'num') {
          nextTok();
          return Number(t.val);
        }

        if (t.type === 'str') {
          nextTok();
          if (t.val.startsWith('__FSTR__')) {
            const template = t.val.slice(8);
            return template.replace(/\{([^}]+)\}/g, (_, innerExpr) => {
              return formatRawForPrint(evalExpr(innerExpr, lineNo));
            });
          }
          return t.val;
        }

        if (t.val === '(') {
          nextTok();
          const v = parseOr();
          if (peekTok()?.val === ')') nextTok();
          return v;
        }

        if (t.val === '[') {
          nextTok();
          const items: RuntimeVal[] = [];
          while (peekTok() && peekTok().val !== ']') {
            items.push(parseOr());
            if (peekTok()?.val === ',') nextTok();
          }
          if (peekTok()?.val === ']') nextTok();
          return items;
        }

        if (t.val === '{') {
          nextTok();
          if (language === 'C') {
            const items: RuntimeVal[] = [];
            while (peekTok() && peekTok().val !== '}') {
              items.push(parseOr());
              if (peekTok()?.val === ',') nextTok();
            }
            if (peekTok()?.val === '}') nextTok();
            return items;
          }
          const entries = new Map<string, RuntimeVal>();
          while (peekTok() && peekTok().val !== '}') {
            const k = String(parseOr());
            if (peekTok()?.val === ':') nextTok();
            const v = parseOr();
            entries.set(k, v);
            if (peekTok()?.val === ',') nextTok();
          }
          if (peekTok()?.val === '}') nextTok();
          return { __dict: true, entries };
        }

        if (t.type === 'id') {
          nextTok();
          if (t.val === 'True' || t.val === 'true') return true;
          if (t.val === 'False' || t.val === 'false') return false;
          if (t.val === 'None' || t.val === 'NULL') return null;

          // Function call
          if (peekTok()?.val === '(') {
            nextTok();
            const args: RuntimeVal[] = [];
            while (peekTok() && peekTok().val !== ')') {
              args.push(parseOr());
              if (peekTok()?.val === ',') nextTok();
            }
            if (peekTok()?.val === ')') nextTok();
            return callFunction(t.val, args, lineNo);
          }

          const found = lookupVar(t.val);
          if (found) return found.val;
          return 0;
        }

        nextTok();
        return null;
      }

      return parseOr();
    }

    function findArrayVarName(arrRef: RuntimeVal[]): string | null {
      for (let i = scopes.length - 1; i >= 0; i--) {
        for (const [k, v] of scopes[i].vars.entries()) {
          if (v === arrRef) return k;
        }
      }
      return null;
    }

    function assignTarget(targetExpr: string, val: RuntimeVal, lineNo: number, op = '=') {
      const trimmed = targetExpr.trim();

      // Pointer dereference write: *(arr + i) or *ptr
      const derefMatch = /^\*\s*(.+)$/.exec(trimmed);
      if (derefMatch) {
        const ptrVal = evalExpr(derefMatch[1], lineNo);
        if (isPtr(ptrVal)) {
          const found = lookupVar(ptrVal.targetName);
          if (found && Array.isArray(found.val)) {
            writes++;
            found.val[ptrVal.offset] = val;
            return;
          }
        }
      }

      // Indexed target: arr[idx] or freq[key]
      const bracketIdx = trimmed.indexOf('[');
      if (bracketIdx !== -1 && trimmed.endsWith(']')) {
        const objName = trimmed.slice(0, bracketIdx).trim();
        const keyExpr = trimmed.slice(bracketIdx + 1, -1).trim();
        const found = lookupVar(objName);
        if (found) {
          const keyVal = evalExpr(keyExpr, lineNo);
          if (Array.isArray(found.val)) {
            const idxNum = Number(keyVal);
            let nextVal = val;
            if (op !== '=') {
              const cur = Number(found.val[idxNum] ?? 0);
              nextVal = applyCompoundOp(cur, Number(val), op);
            }
            writes++;
            found.val[idxNum] = nextVal;
            return;
          }
          if (isDict(found.val)) {
            const kStr = String(keyVal);
            let nextVal = val;
            if (op !== '=') {
              const cur = Number(found.val.entries.get(kStr) ?? 0);
              nextVal = applyCompoundOp(cur, Number(val), op);
            }
            writes++;
            found.val.entries.set(kStr, nextVal);
            return;
          }
        }
      }

      // Plain variable
      if (op !== '=') {
        const cur = Number(lookupVar(trimmed)?.val ?? 0);
        setVar(trimmed, applyCompoundOp(cur, Number(val), op));
      } else {
        setVar(trimmed, val);
      }
    }

    function applyCompoundOp(cur: number, rhs: number, op: string): number {
      if (op === '+=') return cur + rhs;
      if (op === '-=') return cur - rhs;
      if (op === '*=') return cur * rhs;
      if (op === '/=') return cur / rhs;
      if (op === '//=') return Math.floor(cur / rhs);
      if (op === '%=') return cur % rhs;
      return rhs;
    }

    function formatPrintf(fmt: string, args: RuntimeVal[]): string {
      let argIdx = 0;
      return fmt
        .replace(/%(\.\d+)?[difcs]/g, (spec) => {
          const val = args[argIdx++];
          if (val === undefined) return spec;
          if (spec.endsWith('f')) {
            const decMatch = /\.(\d+)/.exec(spec);
            const digits = decMatch ? Number(decMatch[1]) : 2;
            return Number(val).toFixed(digits);
          }
          if (spec.endsWith('d') || spec.endsWith('i')) {
            return String(Math.trunc(Number(val)));
          }
          return formatRawForPrint(val);
        })
        .replace(/\n$/, '');
    }

    function callFunction(name: string, args: RuntimeVal[], lineNo: number): RuntimeVal {
      if (name === 'len') {
        const a = args[0];
        if (Array.isArray(a) || typeof a === 'string') return a.length;
        if (isDict(a)) return a.entries.size;
        return 0;
      }
      if (name === 'int') return Math.trunc(Number(args[0] ?? 0));
      if (name === 'float') return Number(args[0] ?? 0);
      if (name === 'str') return formatRawForPrint(args[0] ?? '');
      if (name === 'abs') return Math.abs(Number(args[0] ?? 0));
      if (name === 'min') {
        const list = Array.isArray(args[0]) ? args[0] : args;
        return Math.min(...list.map(Number));
      }
      if (name === 'max') {
        const list = Array.isArray(args[0]) ? args[0] : args;
        return Math.max(...list.map(Number));
      }
      if (name === 'sum') {
        const list = Array.isArray(args[0]) ? args[0] : [];
        return list.reduce<number>((acc, x) => acc + Number(x), 0);
      }
      if (name === 'sorted') {
        const list = Array.isArray(args[0]) ? [...args[0]] : [];
        return list.sort((a, b) => Number(a) - Number(b));
      }
      if (name === 'range') {
        let start = 0;
        let stop = 0;
        let step = 1;
        if (args.length === 1) stop = Number(args[0]);
        else if (args.length === 2) {
          start = Number(args[0]);
          stop = Number(args[1]);
        } else if (args.length >= 3) {
          start = Number(args[0]);
          stop = Number(args[1]);
          step = Number(args[2]) || 1;
        }
        const out: number[] = [];
        if (step > 0) {
          for (let k = start; k < stop && out.length < 200; k += step) out.push(k);
        } else if (step < 0) {
          for (let k = start; k > stop && out.length < 200; k += step) out.push(k);
        }
        return out;
      }
      if (name === 'print') {
        const text = args.map(formatRawForPrint).join(' ');
        stdout.push(text);
        return null;
      }
      if (name === 'printf') {
        const fmt = String(args[0] ?? '');
        const text = formatPrintf(fmt, args.slice(1));
        if (text.length > 0) stdout.push(text);
        return null;
      }
      if (name === 'puts') {
        stdout.push(String(args[0] ?? ''));
        return null;
      }

      // User-defined Python function
      const pyFn = pyFuncs.get(name);
      if (pyFn) {
        if (callDepth >= MAX_CALL_DEPTH) {
          throw new TraceError(`Maximum call depth (${MAX_CALL_DEPTH}) reached in ${name}()`, lineNo);
        }
        callDepth++;
        const fnScope: Scope = { vars: new Map(), types: new Map() };
        pyFn.params.forEach((p, i) => {
          const argVal = args[i] ?? null;
          fnScope.vars.set(p, argVal);
          fnScope.types.set(p, inferType(argVal));
        });
        scopes.push(fnScope);
        recordStep(
          pyFn.line,
          `Enter ${name}(${pyFn.params.map((p, i) => `${p}=${formatVal(args[i] ?? null)}`).join(', ')}).`,
          `Stack frame created for ${name}().`
        );
        let ret: RuntimeVal = null;
        try {
          execPyBlock(pyFn.body);
        } catch (sig) {
          if (sig instanceof ControlSignal && sig.kind === 'return') {
            ret = sig.value;
          } else {
            scopes.pop();
            callDepth--;
            throw sig;
          }
        }
        scopes.pop();
        callDepth--;
        return ret;
      }

      // User-defined C function
      const cFn = cFuncs.get(name);
      if (cFn) {
        if (callDepth >= MAX_CALL_DEPTH) {
          throw new TraceError(`Maximum call depth (${MAX_CALL_DEPTH}) reached in ${name}()`, lineNo);
        }
        callDepth++;
        const fnScope: Scope = { vars: new Map(), types: new Map() };
        cFn.params.forEach((p, i) => {
          const argVal = args[i] ?? 0;
          fnScope.vars.set(p.name, argVal);
          fnScope.types.set(p.name, p.isArray ? 'int[]' : p.isPtr ? 'int*' : p.type);
        });
        scopes.push(fnScope);
        recordStep(
          cFn.line,
          `Enter ${name}(${cFn.params.map((p, i) => `${p.name}=${formatVal(args[i] ?? 0)}`).join(', ')}).`,
          `Call stack frame allocated for C function ${name}().`
        );
        let ret: RuntimeVal = 0;
        try {
          for (const st of cFn.body) execCStmt(st);
        } catch (sig) {
          if (sig instanceof ControlSignal && sig.kind === 'return') {
            ret = sig.value;
          } else {
            scopes.pop();
            callDepth--;
            throw sig;
          }
        }
        scopes.pop();
        callDepth--;
        return ret;
      }

      return null;
    }

    // ---------- Python Execution ----------

    function execPySimple(text: string, line: number) {
      // Check assignment (excluding ==, !=, <=, >=)
      const compoundMatch = /^(.+?)\s*(\+=|-=|\*=|\/\/=|\/=|%=)\s*(.+)$/.exec(text);
      if (compoundMatch) {
        const target = compoundMatch[1].trim();
        const op = compoundMatch[2];
        const rhs = evalExpr(compoundMatch[3], line);
        assignTarget(target, rhs, line, op);
        recordStep(
          line,
          `Update ${target} (${op} ${formatVal(rhs)}).`,
          `Evaluated right-hand side and updated ${target}.`
        );
        return;
      }

      // Plain assignment outside brackets/quotes
      let eqPos = -1;
      let depth = 0;
      let inQuote: string | null = null;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuote) {
          if (ch === '\\') i++;
          else if (ch === inQuote) inQuote = null;
          continue;
        }
        if (ch === '"' || ch === "'") inQuote = ch;
        else if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (
          ch === '=' &&
          depth === 0 &&
          text[i + 1] !== '=' &&
          text[i - 1] !== '!' &&
          text[i - 1] !== '<' &&
          text[i - 1] !== '>'
        ) {
          eqPos = i;
          break;
        }
      }

      if (eqPos !== -1) {
        const lhsRaw = text.slice(0, eqPos).trim();
        const rhsRaw = text.slice(eqPos + 1).trim();
        const lhsParts = splitTopLevelCommas(lhsRaw);
        const rhsParts = splitTopLevelCommas(rhsRaw);

        if (lhsParts.length > 1 && lhsParts.length === rhsParts.length) {
          const evaluatedRhs = rhsParts.map((r) => evalExpr(r, line));
          lhsParts.forEach((target, i) => assignTarget(target, evaluatedRhs[i], line));
          recordStep(
            line,
            `Assign ${lhsParts.map((l, i) => `${l} = ${formatVal(evaluatedRhs[i])}`).join(', ')}.`,
            `Simultaneous tuple unpacking evaluates all right-hand expressions before writing targets.`
          );
        } else {
          const val = evalExpr(rhsRaw, line);
          assignTarget(lhsRaw, val, line);
          recordStep(
            line,
            `Set ${lhsRaw} = ${formatVal(val)}.`,
            `Evaluated ${rhsRaw} and stored result in ${lhsRaw}.`
          );
        }
        return;
      }

      // Expression statement (e.g. print(...), seq.append(a))
      evalExpr(text, line);
      recordStep(
        line,
        `Executed ${text}.`,
        `Evaluated expression statement on line ${line}.`
      );
    }

    function execPyBlock(stmts: PyStmt[]) {
      for (const st of stmts) {
        if (st.kind === 'def') continue;

        if (st.kind === 'simple') {
          execPySimple(st.text, st.line);
          continue;
        }

        if (st.kind === 'return') {
          const val = st.expr ? evalExpr(st.expr, st.line) : null;
          setVar('return', val);
          recordStep(
            st.line,
            `Return ${formatVal(val)}.`,
            `Function returns ${formatVal(val)} to caller.`
          );
          throw new ControlSignal('return', val);
        }

        if (st.kind === 'break') {
          recordStep(st.line, 'Break out of loop.', 'Control exits the innermost loop.');
          throw new ControlSignal('break');
        }

        if (st.kind === 'continue') {
          recordStep(st.line, 'Continue to next iteration.', 'Jumps to next loop iteration.');
          throw new ControlSignal('continue');
        }

        if (st.kind === 'if') {
          let taken = false;
          for (const branch of st.branches) {
            if (branch.cond === null) {
              recordStep(branch.line, 'Enter else branch.', 'All prior conditions were false.');
              execPyBlock(branch.body);
              taken = true;
              break;
            }
            const ok = Boolean(evalExpr(branch.cond, branch.line));
            recordStep(
              branch.line,
              `Check ${branch.cond} -> ${ok ? 'True' : 'False'}.`,
              ok ? 'Condition evaluated true; entering branch.' : 'Condition evaluated false; skipping branch.'
            );
            if (ok) {
              execPyBlock(branch.body);
              taken = true;
              break;
            }
          }
          void taken;
          continue;
        }

        if (st.kind === 'for') {
          const iterable = evalExpr(st.iterExpr, st.line);
          const items = Array.isArray(iterable) ? iterable : [];
          currentLoopDepth++;
          maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth);
          try {
            for (const item of items) {
              setVar(st.target, item);
              recordStep(
                st.line,
                `Loop ${st.target} = ${formatVal(item)}.`,
                `Assigned next element from ${st.iterExpr} to ${st.target}.`
              );
              try {
                execPyBlock(st.body);
              } catch (sig) {
                if (sig instanceof ControlSignal && sig.kind === 'continue') continue;
                if (sig instanceof ControlSignal && sig.kind === 'break') break;
                throw sig;
              }
            }
          } finally {
            currentLoopDepth--;
          }
          continue;
        }

        if (st.kind === 'while') {
          currentLoopDepth++;
          maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth);
          try {
            while (true) {
              const ok = Boolean(evalExpr(st.cond, st.line));
              recordStep(
                st.line,
                `While ${st.cond} -> ${ok ? 'True' : 'False'}.`,
                ok ? 'Loop condition holds; executing body.' : 'Loop condition false; exiting while loop.'
              );
              if (!ok) break;
              try {
                execPyBlock(st.body);
              } catch (sig) {
                if (sig instanceof ControlSignal && sig.kind === 'continue') continue;
                if (sig instanceof ControlSignal && sig.kind === 'break') break;
                throw sig;
              }
            }
          } finally {
            currentLoopDepth--;
          }
        }
      }
    }

    // ---------- C Execution ----------

    function execCSimple(rawText: string, line: number, silent = false) {
      const subStmts = splitTopLevelSemicolons(rawText);
      for (const piece of subStmts) {
        const text = piece.trim();
        if (!text) continue;

        // C declaration: int a = 0, b = 1; or int arr[] = {1, 2, 3}; or int *p = arr;
        const declMatch = /^(int|float|double|char|long|short|bool)\s+(.+)$/.exec(text);
        if (declMatch) {
          const baseType = declMatch[1];
          const rest = declMatch[2];
          for (const item of splitTopLevelCommas(rest)) {
            const arrDecl = /^([A-Za-z_][A-Za-z0-9_]*)\s*\[[^\]]*\]\s*(?:=\s*(\{.*\}))?$/.exec(
              item.trim()
            );
            if (arrDecl) {
              const name = arrDecl[1];
              const val = arrDecl[2] ? evalExpr(arrDecl[2], line) : [];
              declareLocalVar(name, val, `${baseType}[]`);
              if (!silent) {
                recordStep(
                  line,
                  `Declare array ${name} = ${formatVal(val)}.`,
                  `Allocated contiguous ${baseType} array ${name} in memory.`
                );
              }
              continue;
            }

            const scalarDecl = /^(\*?\s*)([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*(.+))?$/.exec(
              item.trim()
            );
            if (scalarDecl) {
              const isPointer = scalarDecl[1].includes('*');
              const name = scalarDecl[2];
              let val: RuntimeVal = 0;
              if (scalarDecl[3]) {
                val = evalExpr(scalarDecl[3], line);
                if (isPointer && Array.isArray(val)) {
                  const arrName = findArrayVarName(val) || 'arr';
                  val = { __ptr: true, targetName: arrName, offset: 0 };
                }
              }
              declareLocalVar(name, val, isPointer ? `${baseType}*` : baseType);
              if (!silent) {
                recordStep(
                  line,
                  `Declare ${name} = ${formatVal(val)}.`,
                  `Initialized local ${isPointer ? 'pointer' : baseType} variable ${name}.`
                );
              }
            }
          }
          continue;
        }

        // Increment / decrement
        const incMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*(\+\+|--)$|^(\+\+|--)\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(
          text
        );
        if (incMatch) {
          const name = incMatch[1] || incMatch[4];
          const op = incMatch[2] || incMatch[3];
          const cur = Number(lookupVar(name)?.val ?? 0);
          const next = op === '++' ? cur + 1 : cur - 1;
          setVar(name, next);
          if (!silent) {
            recordStep(
              line,
              `${name}${op} -> ${next}.`,
              `${op === '++' ? 'Incremented' : 'Decremented'} ${name} to ${next}.`
            );
          }
          continue;
        }

        // Compound assignment
        const compMatch = /^(.+?)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/.exec(text);
        if (compMatch) {
          const target = compMatch[1].trim();
          const op = compMatch[2];
          const rhs = evalExpr(compMatch[3], line);
          assignTarget(target, rhs, line, op);
          if (!silent) {
            recordStep(
              line,
              `Update ${target} ${op} ${formatVal(rhs)}.`,
              `Applied compound assignment to ${target}.`
            );
          }
          continue;
        }

        // Plain assignment
        let eqPos = -1;
        let depth = 0;
        let inQuote: string | null = null;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (inQuote) {
            if (ch === '\\') i++;
            else if (ch === inQuote) inQuote = null;
            continue;
          }
          if (ch === '"' || ch === "'") inQuote = ch;
          else if ('([{'.includes(ch)) depth++;
          else if (')]}'.includes(ch)) depth--;
          else if (
            ch === '=' &&
            depth === 0 &&
            text[i + 1] !== '=' &&
            text[i - 1] !== '!' &&
            text[i - 1] !== '<' &&
            text[i - 1] !== '>'
          ) {
            eqPos = i;
            break;
          }
        }

        if (eqPos !== -1) {
          const lhs = text.slice(0, eqPos).trim();
          const rhs = text.slice(eqPos + 1).trim();
          const val = evalExpr(rhs, line);
          assignTarget(lhs, val, line);
          if (!silent) {
            recordStep(
              line,
              `Assign ${lhs} = ${formatVal(val)}.`,
              `Evaluated ${rhs} and stored into ${lhs}.`
            );
          }
          continue;
        }

        evalExpr(text, line);
        if (!silent) {
          recordStep(
            line,
            `Executed ${text}.`,
            `Evaluated C expression statement.`
          );
        }
      }
    }

    function execCStmt(st: CStmt) {
      if (st.kind === 'block') {
        scopes.push({ vars: new Map(), types: new Map() });
        try {
          for (const child of st.stmts) execCStmt(child);
        } finally {
          scopes.pop();
        }
        return;
      }

      if (st.kind === 'simple') {
        if (st.text) execCSimple(st.text, st.line);
        return;
      }

      if (st.kind === 'return') {
        const val = st.expr ? evalExpr(st.expr, st.line) : null;
        if (val !== null) setVar('return', val);
        recordStep(
          st.line,
          `Return ${val !== null ? formatVal(val) : 'void'}.`,
          `Returning from current C function.`
        );
        throw new ControlSignal('return', val);
      }

      if (st.kind === 'break') {
        recordStep(st.line, 'Break out of loop.', 'Control exits the loop.');
        throw new ControlSignal('break');
      }

      if (st.kind === 'continue') {
        recordStep(st.line, 'Continue loop.', 'Jumps to next loop cycle.');
        throw new ControlSignal('continue');
      }

      if (st.kind === 'if') {
        const ok = Boolean(evalExpr(st.cond, st.line));
        recordStep(
          st.line,
          `Check if (${st.cond}) -> ${ok ? 'true' : 'false'}.`,
          ok ? 'Condition true; entering if block.' : 'Condition false.'
        );
        if (ok) {
          execCStmt(st.thenBranch);
        } else if (st.elseBranch) {
          execCStmt(st.elseBranch);
        }
        return;
      }

      if (st.kind === 'for') {
        scopes.push({ vars: new Map(), types: new Map() });
        currentLoopDepth++;
        maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth);
        try {
          if (st.init.trim()) {
            execCSimple(st.init, st.line);
          }
          while (true) {
            const ok = Boolean(evalExpr(st.cond, st.line));
            recordStep(
              st.line,
              `For condition (${st.cond}) -> ${ok ? 'true' : 'false'}.`,
              ok ? 'Loop condition holds; entering body.' : 'Loop condition false; exiting loop.'
            );
            if (!ok) break;
            try {
              execCStmt(st.body);
            } catch (sig) {
              if (sig instanceof ControlSignal && sig.kind === 'break') break;
              if (!(sig instanceof ControlSignal && sig.kind === 'continue')) throw sig;
            }
            if (st.update.trim()) {
              execCSimple(st.update, st.line);
            }
          }
        } finally {
          currentLoopDepth--;
          scopes.pop();
        }
        return;
      }

      if (st.kind === 'while') {
        currentLoopDepth++;
        maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth);
        try {
          while (true) {
            const ok = Boolean(evalExpr(st.cond, st.line));
            recordStep(
              st.line,
              `While (${st.cond}) -> ${ok ? 'true' : 'false'}.`,
              ok ? 'Loop condition holds; executing body.' : 'While loop finished.'
            );
            if (!ok) break;
            try {
              execCStmt(st.body);
            } catch (sig) {
              if (sig instanceof ControlSignal && sig.kind === 'break') break;
              if (!(sig instanceof ControlSignal && sig.kind === 'continue')) throw sig;
            }
          }
        } finally {
          currentLoopDepth--;
        }
        return;
      }

      if (st.kind === 'doWhile') {
        currentLoopDepth++;
        maxLoopDepth = Math.max(maxLoopDepth, currentLoopDepth);
        try {
          while (true) {
            try {
              execCStmt(st.body);
            } catch (sig) {
              if (sig instanceof ControlSignal && sig.kind === 'break') break;
              if (!(sig instanceof ControlSignal && sig.kind === 'continue')) throw sig;
            }
            const ok = Boolean(evalExpr(st.cond, st.line));
            recordStep(
              st.line,
              `Do-while (${st.cond}) -> ${ok ? 'true' : 'false'}.`,
              ok ? 'Condition true; repeating loop.' : 'Condition false; exiting do-while.'
            );
            if (!ok) break;
          }
        } finally {
          currentLoopDepth--;
        }
      }
    }

    // ---------- Dispatch Python or C ----------

    let detectedParams: FunctionParamSpec[] = [];
    let detectedEntry = 'Top-Level Script';

    try {
      if (language === 'Python') {
        const parsed = parsePython(source);
        parsed.funcs.forEach((f, k) => pyFuncs.set(k, f));

        const topExecutable = parsed.stmts.filter((s) => s.kind !== 'def');
        if (topExecutable.length > 0) {
          detectedEntry = 'Top-Level Statements';
          execPyBlock(parsed.stmts);
        } else if (parsed.funcs.size > 0) {
          const firstFn = Array.from(parsed.funcs.values())[0];
          detectedEntry = `${firstFn.name}()`;
          const { specs, values } = detectParamDefaults(
            firstFn.params.map((name) => ({ name })),
            paramOverrides
          );
          detectedParams = specs;
          const args = firstFn.params.map((p) => cloneRuntimeVal(values.get(p) ?? 0));
          const res = callFunction(firstFn.name, args, firstFn.line);
          if (res !== null) {
            stdout.push(`${firstFn.name} returned ${formatVal(res)}`);
          }
        }
      } else {
        const parsed = parseC(source);
        parsed.funcs.forEach((f, k) => cFuncs.set(k, f));

        const mainFn = cFuncs.get('main');
        if (mainFn) {
          detectedEntry = 'main()';
          callFunction('main', [], mainFn.line);
        } else if (parsed.stmts.length > 0) {
          detectedEntry = 'Top-Level C Statements';
          for (const st of parsed.stmts) execCStmt(st);
        } else if (cFuncs.size > 0) {
          const firstFn = Array.from(cFuncs.values())[0];
          detectedEntry = `${firstFn.name}()`;
          const { specs, values } = detectParamDefaults(
            firstFn.params.map((p) => ({
              name: p.name,
              hintArray: p.isArray || p.isPtr,
            })),
            paramOverrides
          );
          detectedParams = specs;
          const args = firstFn.params.map((p) => cloneRuntimeVal(values.get(p.name) ?? 0));
          const res = callFunction(firstFn.name, args, firstFn.line);
          if (res !== null && firstFn.returnType !== 'void') {
            stdout.push(`${firstFn.name} returned ${formatVal(res)}`);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === '__MAX_STEPS__') {
        // Gracefully keep collected steps up to MAX_STEPS
      } else if (err instanceof ControlSignal) {
        // Top-level return
      } else {
        throw err;
      }
    }

    const estimatedComplexity =
      maxLoopDepth === 0
        ? 'O(1)'
        : maxLoopDepth === 1
          ? source.includes('/ 2') || source.includes('// 2')
            ? 'O(log n)'
            : 'O(n)'
          : `O(n^${maxLoopDepth})`;

    return {
      ok: true,
      codeLines,
      steps,
      detectedParams,
      truncated,
      metrics: {
        totalSteps: steps.length,
        maxLoopDepth,
        comparisons,
        writes,
        estimatedComplexity,
        detectedEntry,
      },
    };
  } catch (err) {
    if (err instanceof TraceError) {
      return {
        ok: false,
        error: err.message,
        errorLine: err.lineNumber,
        codeLines,
        steps: [],
        detectedParams: [],
        metrics: {
          totalSteps: 0,
          maxLoopDepth: 0,
          comparisons: 0,
          writes: 0,
          estimatedComplexity: 'O(1)',
          detectedEntry: 'Error',
        },
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to parse program.',
      codeLines,
      steps: [],
      detectedParams: [],
      metrics: {
        totalSteps: 0,
        maxLoopDepth: 0,
        comparisons: 0,
        writes: 0,
        estimatedComplexity: 'O(1)',
        detectedEntry: 'Error',
      },
    };
  }
}
