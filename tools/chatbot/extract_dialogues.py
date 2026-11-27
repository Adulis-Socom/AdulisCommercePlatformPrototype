"""Extract the scripted chatbot dialogue library (C-01..C-22, F-01..F-66, G-01..G-26) from the founder-review PDF.

Reads the PDF with pdftotext (poppler), parses every scenario with its source page, and writes
src/chatbot/dialogue-source.generated.ts. Nothing is invented: every string comes from the PDF; lines the parser cannot classify are
reported (and fail --check) instead of being dropped.

Usage: python tools/chatbot/extract_dialogues.py [--check]     (needs pdftotext on PATH; use the venv python)
"""
import hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / 'docs' / 'Adulis_Scripted_Chatbot_Dialogue_and_Taxonomy_Review_v1.pdf'
OUT = ROOT / 'src' / 'chatbot' / 'dialogue-source.generated.ts'
FIRST, LAST = 9, 61  # pages holding scenarios (C: 9-19, F: 20-54, G: 55-61)
ROLES = ('Buyer', 'Bot', 'UI', 'Seller', 'Operator')
HEAD = re.compile(r'^([CFG])-(\d\d) \| (.+)$')


def page_text(n):
    r = subprocess.run(['pdftotext', '-enc', 'UTF-8', '-f', str(n), '-l', str(n), '-layout', str(PDF), '-'], capture_output=True, check=True)
    return r.stdout.decode('utf-8')


def clean(lines):
    out = []
    for l in lines:
        s = l.strip()
        if not s or s.startswith('ADULIS / CHATBOT DIALOGUE LIBRARY') or re.search(r'INTERNAL REVIEW \| PROPOSED SCRIPTS', s):
            continue
        out.append(s)
    return out


def parse():
    scen, problems, cur, branch, mode = [], [], None, None, None
    for n in range(FIRST, LAST + 1):
        for s in clean(page_text(n).splitlines()):
            m = re.match(r'^0[567] (.+)$', s)
            if m and not HEAD.match(s):
                if s.startswith('06 '):
                    branch = m.group(1)
                continue
            if re.match(r'^(Detailed taxonomy dialogues|Universal scripted examples|Name-only categories)', s):
                continue
            h = HEAD.match(s)
            if h:
                cur = {'id': f'{h.group(1)}-{h.group(2)}', 'group': h.group(1), 'title': h.group(3), 'page': n, 'pageEnd': n,
                       'branch': (branch[len('Fashion / '):] if h.group(1) == 'F' and branch else None), 'context': '', 'turns': [],
                       'decision': '', 'ifMissing': '', 'additionalFields': [], 'whenAvailable': '', 'source': None,
                       'subjectText': '', 'intentText': ''}
                scen.append(cur)
                mode = 'pre'
                continue
            if cur is None:
                problems.append((n, s))
                continue
            cur['pageEnd'] = n
            role = next((r for r in ROLES if s.startswith(r + ' ') or s == r), None)
            if s.startswith('Decision / expected result:'):
                cur['decision'] = s[len('Decision / expected result:'):].strip(); mode = 'decision'; continue
            if s.startswith('When data is available:'):
                cur['whenAvailable'] = s[len('When data is available:'):].strip(); mode = 'when'; continue
            if s.startswith('If missing:'):
                cur['ifMissing'] = s[len('If missing:'):].strip(); mode = 'missing'; continue
            if s.startswith('Additional source fields'):
                cur['additionalFields'] = [s.split(':', 1)[1]]; mode = 'fields'; continue
            if s.startswith('Source:') and cur['group'] == 'F':
                cur['_src'] = s[len('Source:'):].strip(); mode = 'src'; continue
            if s.startswith('Subject:') and cur['group'] == 'F':
                cur['subjectText'] = s[len('Subject:'):].strip(); mode = 'subject'; continue
            if role and mode in ('pre', 'turn', 'src', 'subject'):
                cur['turns'].append({'role': role, 'text': s[len(role):].strip()}); mode = 'turn'; continue
            # continuation of the previous element
            if mode == 'turn': cur['turns'][-1]['text'] += ' ' + s
            elif mode == 'decision': cur['decision'] += ' ' + s
            elif mode == 'when': cur['whenAvailable'] += ' ' + s
            elif mode == 'missing': cur['ifMissing'] += ' ' + s
            elif mode == 'fields': cur['additionalFields'][0] += ' ' + s
            elif mode == 'src': cur['_src'] += ' ' + s
            elif mode == 'subject': cur['subjectText'] += ' ' + s
            elif mode == 'pre': cur['context'] = (cur['context'] + ' ' + s).strip()
            else: problems.append((n, s))
    for c in scen:
        if c['group'] == 'F':
            src = c.pop('_src', '')
            parts = [p.strip() for p in src.split('·')]
            c['source'] = {'workbook': parts[0] if parts else '', 'sheet': parts[1] if len(parts) > 1 else '',
                           'exampleCells': re.sub(r'^example cells\s*', '', parts[2]).split(', ') if len(parts) > 2 else []}
            m = re.match(r'^(.*?)\s+Intent:\s*(.*)$', c['subjectText'])
            if m:
                c['subjectText'], c['intentText'] = m.group(1).strip(), m.group(2).strip()
            c['additionalFields'] = [x.strip() for x in c['additionalFields'][0].split('·')] if c['additionalFields'] else []
    return scen, problems


HEADER = ('// GENERATED by tools/chatbot/extract_dialogues.py from the founder-review PDF. Do not edit: re-run the script (it checks the counts).\n'
          "import type { DialogueSource } from './types.ts'\n\nexport const DIALOGUE_SOURCE: DialogueSource = ")


def main():
    scen, problems = parse()
    counts = {g: sum(1 for c in scen if c['group'] == g) for g in 'CFG'}
    ids = [c['id'] for c in scen]
    ok = counts == {'C': 22, 'F': 66, 'G': 26} and not problems and len(set(ids)) == len(ids) == 114 and all(c['turns'] for c in scen)
    doc = {'source': {'file': PDF.name, 'sha256': hashlib.sha256(PDF.read_bytes()).hexdigest(), 'pages': 64}, 'counts': counts, 'scenarios': scen}
    text = HEADER + json.dumps(doc, ensure_ascii=False, indent=1) + ';\n'
    print('counts', counts, '| unclassified lines:', len(problems), '| ids unique:', len(set(ids)) == len(ids))
    for p in problems[:10]:
        print('  unclassified', p)
    if '--check' in sys.argv:
        sys.exit(0 if ok and OUT.read_text(encoding='utf-8') == text else 1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding='utf-8', newline='\n')
    print('wrote', OUT.relative_to(ROOT))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
