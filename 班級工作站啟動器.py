#!/usr/bin/env python3
"""Start the classroom workstation on its fixed local origin, then open it.

若工作站放在「示範檔案」資料夾內（同層有 01幹部設定 等程式資料夾），伺服器改以上一層為根目錄，
首頁的「最新獨立版」連結才開得到同層程式；網址來源仍是 http://127.0.0.1:8766，既有資料不受影響。
"""
import argparse
import functools
import http.server
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
ORIGIN = 'http://127.0.0.1:8766'
SIBLING_MARKERS = ('01幹部設定', '03打掃工作', '09德行評語')


def serve_root():
    parent = ROOT.parent
    if any((parent / name).is_dir() for name in SIBLING_MARKERS):
        return parent, ROOT.name + '/'
    return ROOT, ''


SERVE_DIR, PREFIX = serve_root()


def url(path):
    return ORIGIN + '/' + urllib.parse.quote(PREFIX + path)


HOME = url('index.html')
MARKER = url('共享整合版/entry.js')


def available():
    try:
        with urllib.request.urlopen(MARKER, timeout=1) as response:
            return b'CLASSROOM_WORKSTATION_PORTABLE_V1' in response.read(256)
    except Exception:
        return False


def stale_server():
    """舊版啟動器只服務工作站資料夾；偵測到時提示重新啟動。"""
    if not PREFIX:
        return False
    try:
        with urllib.request.urlopen(ORIGIN + '/' + urllib.parse.quote('共享整合版/entry.js'), timeout=1) as r:
            return b'CLASSROOM_WORKSTATION_PORTABLE_V1' in r.read(256)
    except Exception:
        return False


def stop_old_server():
    """只結束本啟動器自己開的舊服務（命令列含 班級工作站啟動器.py --serve），不動其他程式。"""
    try:
        pids = subprocess.run(['/usr/sbin/lsof', '-ti', 'tcp:8766', '-sTCP:LISTEN'], capture_output=True, text=True).stdout.split()
        stopped = False
        for pid in pids:
            cmd = subprocess.run(['/bin/ps', '-o', 'command=', '-p', pid], capture_output=True, text=True).stdout
            if '班級工作站啟動器.py' in cmd and '--serve' in cmd:
                subprocess.run(['/bin/kill', pid])
                stopped = True
        if stopped:
            for _ in range(30):
                if not stale_server():
                    return True
                time.sleep(.1)
        return False
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SERVE_DIR))
        http.server.ThreadingHTTPServer(('127.0.0.1', 8766), handler).serve_forever()
        return
    if args.check:
        print('工作站服務正常' if available() else '工作站尚未啟動')
        return 0 if available() else 1
    if not available():
        if stale_server() and not stop_old_server():
            print('偵測到舊版工作站服務仍在執行（只能開啟工作站資料夾）。')
            print('請重新開機後，再雙擊本啟動器。')
            input('按 Enter 關閉此視窗。')
            return 1
        log_path = pathlib.Path(tempfile.gettempdir()) / 'lssh-classroom-workstation.log'
        with log_path.open('ab') as log:
            subprocess.Popen([sys.executable, str(pathlib.Path(__file__).resolve()), '--serve'], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        for _ in range(30):
            if available():
                break
            time.sleep(.1)
    if not available():
        print('無法啟動工作站：8766 連接埠可能被其他程式使用。請關閉占用該連接埠的程式後重試。')
        input('按 Enter 關閉此視窗。')
        return 1
    subprocess.run(['/usr/bin/open', HOME], check=True)
    print('班級經營工作站已開啟：' + HOME)
    return 0


if __name__ == '__main__':
    sys.exit(main())
