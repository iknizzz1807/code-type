// Syntax Highlighting Engine
import type { Token } from './types';

interface LangKeywords {
  kw: string[];
  builtin: string[];
}

const LANG_KEYWORDS: Record<string, LangKeywords> = {
  Python: {
    kw: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'async', 'await', 'global', 'nonlocal', 'assert', 'del'],
    builtin: ['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'any', 'all', 'min', 'max', 'sum', 'abs', 'round', 'open', 'super', 'self', '__init__', '__name__', '__main__']
  },
  Rust: {
    kw: ['fn', 'let', 'mut', 'const', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'where', 'async', 'await', 'move', 'ref', 'type', 'dyn', 'static', 'unsafe', 'extern'],
    builtin: ['println!', 'print!', 'format!', 'vec!', 'Some', 'None', 'Ok', 'Err', 'Box', 'Vec', 'String', 'Option', 'Result', 'Self', 'todo!', 'unimplemented!', 'assert!', 'assert_eq!', 'cfg!', 'dbg!']
  },
  TypeScript: {
    kw: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'interface', 'type', 'enum', 'import', 'export', 'from', 'default', 'new', 'this', 'super', 'extends', 'implements', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'of', 'in', 'typeof', 'instanceof', 'as', 'readonly', 'abstract', 'private', 'public', 'protected', 'static', 'void', 'null', 'undefined', 'true', 'false'],
    builtin: ['console', 'Promise', 'Array', 'Object', 'Map', 'Set', 'Date', 'Math', 'JSON', 'Error', 'RegExp', 'Number', 'String', 'Boolean', 'Symbol', 'Proxy', 'Reflect', 'setTimeout', 'setInterval', 'fetch', 'require', 'module', 'process']
  },
  Go: {
    kw: ['func', 'var', 'const', 'if', 'else', 'for', 'range', 'return', 'struct', 'interface', 'type', 'package', 'import', 'defer', 'go', 'chan', 'select', 'switch', 'case', 'default', 'break', 'continue', 'map', 'make', 'new', 'nil', 'true', 'false', 'append', 'len', 'cap', 'close', 'delete', 'copy', 'panic', 'recover'],
    builtin: ['fmt', 'log', 'os', 'io', 'net', 'http', 'strings', 'strconv', 'errors', 'context', 'sync', 'time', 'json', 'math', 'sort', 'bytes', 'bufio', 'regexp', 'reflect', 'testing']
  },
  C: {
    kw: ['int', 'void', 'char', 'float', 'double', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'struct', 'enum', 'union', 'typedef', 'extern', 'register', 'auto', 'volatile', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'goto', 'sizeof', 'NULL', 'true', 'false', '_Bool', '_Complex', '_Imaginary', 'inline', 'restrict'],
    builtin: ['printf', 'scanf', 'sprintf', 'fprintf', 'fopen', 'fclose', 'fread', 'fwrite', 'malloc', 'calloc', 'realloc', 'free', 'memcpy', 'memset', 'memmove', 'strlen', 'strcpy', 'strcat', 'strcmp', 'strncmp', 'strchr', 'strstr', 'exit', 'abort', 'atoi', 'atof', 'rand', 'srand', 'time', 'abs', 'fabs', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'FILE', 'EOF', 'stdin', 'stdout', 'stderr', 'size_t', 'ptrdiff_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t']
  },
  'C++': {
    kw: ['int', 'void', 'char', 'float', 'double', 'bool', 'long', 'short', 'unsigned', 'signed', 'const', 'static', 'class', 'struct', 'enum', 'union', 'namespace', 'using', 'template', 'typename', 'public', 'private', 'protected', 'virtual', 'override', 'auto', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'delete', 'try', 'catch', 'throw', 'nullptr', 'true', 'false', 'this', 'sizeof', 'typedef', 'extern', 'inline', 'constexpr', 'noexcept', 'final', 'explicit', 'include'],
    builtin: ['std', 'cout', 'cin', 'endl', 'vector', 'string', 'map', 'set', 'unordered_map', 'unordered_set', 'pair', 'make_pair', 'shared_ptr', 'unique_ptr', 'move', 'forward', 'begin', 'end', 'size', 'push_back', 'emplace_back', 'sort', 'find', 'erase', 'insert', 'printf', 'scanf', 'malloc', 'free', 'memcpy', 'strlen', 'strcmp']
  },
  Zig: {
    kw: ['fn', 'var', 'const', 'if', 'else', 'for', 'while', 'return', 'struct', 'enum', 'union', 'pub', 'comptime', 'inline', 'test', 'try', 'catch', 'orelse', 'unreachable', 'undefined', 'null', 'true', 'false', 'error', 'defer', 'errdefer', 'switch', 'break', 'continue', 'packed', 'extern', 'export', 'align', 'volatile', 'anytype'],
    builtin: ['std', 'debug', 'print', 'assert', 'mem', 'fmt', 'heap', 'fs', 'os', 'net', 'math', 'log', 'testing', 'expect', 'ArrayList', 'HashMap', 'AutoHashMap', 'allocator', 'GeneralPurposeAllocator', 'ArenaAllocator']
  },
};

export function tokenize(code: string, language: string): Token[] {
  const lang = LANG_KEYWORDS[language] || LANG_KEYWORDS['Python'];
  const kwSet = new Set(lang.kw);
  const builtinSet = new Set(lang.builtin);
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Strings
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i];
      const triple = code.slice(i, i + 3);
      if ((triple === '"""' || triple === "'''") && language === 'Python') {
        let j = i + 3;
        while (j < code.length && code.slice(j, j + 3) !== triple) j++;
        j += 3;
        tokens.push({ type: 'string', text: code.slice(i, j) });
        i = j;
        continue;
      }
      let j = i + 1;
      while (j < code.length && code[j] !== q && code[j] !== '\n') {
        if (code[j] === '\\') j++;
        j++;
      }
      if (j < code.length && code[j] === q) j++;
      tokens.push({ type: 'string', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Single-line comments
    if (code[i] === '#' || code.slice(i, i + 2) === '//') {
      let j = i;
      while (j < code.length && code[j] !== '\n') j++;
      tokens.push({ type: 'comment', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Multi-line comments
    if (code.slice(i, i + 2) === '/*') {
      let j = i + 2;
      while (j < code.length - 1 && code.slice(j, j + 2) !== '*/') j++;
      j += 2;
      tokens.push({ type: 'comment', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let j = i;
      if (code.slice(i, i + 2).match(/0[xXbB]/)) {
        j += 2;
        while (j < code.length && /[0-9a-fA-F_]/.test(code[j])) j++;
      } else {
        while (j < code.length && /[0-9._eE+\-]/.test(code[j])) j++;
      }
      while (j < code.length && /[a-zA-Z]/.test(code[j])) j++;
      tokens.push({ type: 'number', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Decorators
    if (code[i] === '@' && i + 1 < code.length && /[a-zA-Z_]/.test(code[i + 1])) {
      let j = i + 1;
      while (j < code.length && /[a-zA-Z0-9_.]/.test(code[j])) j++;
      tokens.push({ type: 'decorator', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$!?]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (kwSet.has(word)) tokens.push({ type: 'keyword', text: word });
      else if (builtinSet.has(word)) tokens.push({ type: 'builtin', text: word });
      else if (j < code.length && code[j] === '(') tokens.push({ type: 'function', text: word });
      else if (/^[A-Z]/.test(word)) tokens.push({ type: 'type', text: word });
      else tokens.push({ type: 'ident', text: word });
      i = j;
      continue;
    }

    // 3-char operators
    const op3 = code.slice(i, i + 3);
    if (['===', '!==', '<<=', '>>=', '...', '**='].includes(op3)) {
      tokens.push({ type: 'operator', text: op3 });
      i += 3;
      continue;
    }

    // 2-char operators
    const op2 = code.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '=>', '->', '::', '+=', '-=', '*=', '/=', '&&', '||', '<<', '>>', '**', '..', '??', '?.'].includes(op2)) {
      tokens.push({ type: 'operator', text: op2 });
      i += 2;
      continue;
    }

    // 1-char operators
    if ('=+-*/<>!&|^~%?.'.includes(code[i])) {
      tokens.push({ type: 'operator', text: code[i] });
      i++;
      continue;
    }

    // Brackets
    if ('()[]{}'.includes(code[i])) {
      tokens.push({ type: 'bracket', text: code[i] });
      i++;
      continue;
    }

    // Punctuation
    if (':;,'.includes(code[i])) {
      tokens.push({ type: 'punctuation', text: code[i] });
      i++;
      continue;
    }

    // Newline
    if (code[i] === '\n') {
      tokens.push({ type: 'newline', text: '\n' });
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(code[i])) {
      let j = i;
      while (j < code.length && /[ \t]/.test(code[j])) j++;
      tokens.push({ type: 'space', text: code.slice(i, j) });
      i = j;
      continue;
    }

    tokens.push({ type: 'plain', text: code[i] });
    i++;
  }

  return tokens;
}
