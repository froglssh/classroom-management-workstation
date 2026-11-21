#!/usr/bin/env python3
"""由「示範檔案」各資料夾的獨立版程式，重新產生 共享整合版/<module>.html。

用法（在工作站資料夾執行）：
    python3 tools/sync_integrated.py            # 同步全部已支援的工具
    python3 tools/sync_integrated.py roles seats
    python3 tools/sync_integrated.py --check    # 只列出哪些整合版比獨立版舊
    python3 tools/sync_integrated.py --standalone   # 只更新「獨立程式/」（網站版最新獨立程式）

不加參數時：同步整合版，並把首頁目錄（共享整合版/tools-catalog.js）列出的最新獨立版程式、
使用說明與文件複製到「獨立程式/」，讓 GitHub Pages 網站也能開啟最新版。

前提：獨立版程式內已有 WS（共享整合版）模式：
    const WS = !!(window.Workspace && window.workspaceStorage);
主程式 <script> 會改成 type="text/workspace"，由 bridge.js 在共用名冊載入後執行。
轉換內容：CDN 套件改用 vendor/、移除 Google Fonts、加上 entry.js／core.js／bridge.js、
標題加「共享整合版｜」、使用說明連結改到 ../docs/<module>.html。
"""
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent          # 班級經營整合工作站/
DEMO = HERE.parent                                               # 示範檔案/
OUT = HERE / '共享整合版'

SOURCES = {
    'roles': '01幹部設定/班級幹部小老師選取獎勵程式(codex優化版).html',
    'seats': '02座位安排/座位選取抽籤程式(codex優化版).html',
    'cleaning': '03打掃工作/學生打掃抽籤系統（codex優化版）.html',
    'comments': '09德行評語/導師評語生成系統（codex優化版）.html',
}

BUNDLE = HERE / '獨立程式'
# 首頁目錄以外、程式或說明頁會連到的檔案（只放可公開的空白範本與教學資料）
BUNDLE_EXTRAS = [
    '11特選個申/app.js',
    '11特選個申/styles.css',
    '09德行評語/整批匯入/學生德性自評匯入範例表.xlsx',
    '09德行評語/整批匯入/學生德行自評表(空白)高一.docx',
    '09德行評語/整批匯入/學生德行自評表(空白)高二高三.docx',
    '09德行評語/0德行評語資料庫/高中導師德性評語優化 GPTs 系統設定提示詞.docx',
]

VENDOR = [
    (r'https://cdn\.jsdelivr\.net/npm/xlsx@[^"]+', 'vendor/xlsx.full.min.js'),
    (r'https://cdn\.jsdelivr\.net/npm/html2canvas@[^"]+', 'vendor/html2canvas.min.js'),
    (r'https://cdn\.jsdelivr\.net/npm/jspdf@[^"]+', 'vendor/jspdf.umd.min.js'),
    (r'https://cdn\.jsdelivr\.net/npm/jszip@[^"]+', 'vendor/jszip.min.js'),
    (r'https://cdn\.tailwindcss\.com[^"]*', 'vendor/tailwindcss.browser.js'),
]


def transform(module, src_rel, text):
    if 'const WS = !!(window.Workspace && window.workspaceStorage)' not in text:
        raise SystemExit(f'{src_rel} 尚未加入 WS（共享整合版）模式，無法同步。')
    for pattern, local in VENDOR:
        text = re.sub(pattern, local, text)
    if re.search(r'<script src="https?://', text):
        raise SystemExit(f'{src_rel} 仍有未對應到 vendor/ 的外部腳本：' + ', '.join(re.findall(r'<script src="(https?://[^"]+)"', text)))
    text = re.sub(r'\s*<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>', '', text)
    text = re.sub(r'<html([^>]*)>', lambda m: f'<!-- 由 {src_rel} 產生；請改原檔後執行 tools/sync_integrated.py 重新同步 -->\n<html{m.group(1)} data-module="{module}">', text, count=1)
    text = text.replace('<head>', '<head>\n<script src="entry.js?v=hub-20261121"></script>', 1)
    text = re.sub(r'<title>(?!共享整合版)', '<title>共享整合版｜', text, count=1)
    text = text.replace('</head>', '<script src="core.js"></script><script src="bridge.js?v=hub-20261121" defer></script>\n</head>', 1)
    # 使用說明連結（同資料夾的 *說明*.html）改到整合版說明
    text = re.sub(r'href="[^"/]*說明[^"/]*\.html"', f'href="../docs/{module}.html"', text)
    # 主程式：<body> 之後第一個沒有屬性的 <script>
    body = text.index('<body')
    m = re.compile(r'<script>').search(text, body)
    if not m:
        raise SystemExit(f'{src_rel} 找不到主程式 <script>')
    text = text[:m.start()] + '<script type="text/workspace">' + text[m.end():]
    return text


def catalog_files():
    text = (OUT / 'tools-catalog.js').read_text(encoding='utf-8')
    return [p for p in re.findall(r"(?:path|guide): '\.\./([^']+)'", text)]


def bundle_standalone():
    files = list(dict.fromkeys(catalog_files() + BUNDLE_EXTRAS))
    missing = [f for f in files if not (DEMO / f).is_file()]
    if missing:
        raise SystemExit('找不到檔案，請先修正 tools-catalog.js：\n  ' + '\n  '.join(missing))
    if BUNDLE.exists():
        shutil.rmtree(BUNDLE)   # 整個資料夾由本腳本產生，可放心重建
    for f in files:
        dst = BUNDLE / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(DEMO / f, dst)
    size = sum((BUNDLE / f).stat().st_size for f in files)
    print(f'已複製 {len(files)} 個檔案到 獨立程式/（{size / 1e6:.1f} MB）')


def main(argv):
    if '--standalone' in argv:
        bundle_standalone()
        return
    check = '--check' in argv
    names = [a for a in argv if not a.startswith('--')] or list(SOURCES)
    for name in names:
        if name not in SOURCES:
            raise SystemExit(f'未知工具：{name}（可用：{", ".join(SOURCES)}）')
        src = DEMO / SOURCES[name]
        dst = OUT / f'{name}.html'
        if check:
            stale = not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime
            print(f'{name:9s} {"需要同步" if stale else "已是最新"}  ← {SOURCES[name]}')
            continue
        dst.write_text(transform(name, SOURCES[name], src.read_text(encoding='utf-8')), encoding='utf-8')
        print(f'已同步 {name}.html ← {SOURCES[name]}')
    if not check and not [a for a in argv if not a.startswith('--')]:
        bundle_standalone()


if __name__ == '__main__':
    main(sys.argv[1:])
