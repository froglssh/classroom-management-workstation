#!/usr/bin/env python3
"""Start the classroom workstation on its fixed local origin, then open it."""
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
HOME = ORIGIN + '/index.html'
MARKER = ORIGIN + '/' + urllib.parse.quote('共享整合版/entry.js')

def available():
    try:
        with urllib.request.urlopen(MARKER, timeout=1) as response:
            return b'CLASSROOM_WORKSTATION_PORTABLE_V1' in response.read(256)
    except Exception:
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        http.server.ThreadingHTTPServer(('127.0.0.1', 8766), handler).serve_forever()
        return
    if args.check:
        print('工作站服務正常' if available() else '工作站尚未啟動')
        return 0 if available() else 1
    if not available():
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
    print('班級經營工作站已開啟。請從工作站建立名冊並進入各工具。')
    return 0

if __name__ == '__main__':
    sys.exit(main())
