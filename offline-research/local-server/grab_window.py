"""Capture the running game window as real presented pixels.

Two paths, in order:

1. PrintWindow(hwnd, dc, PW_RENDERFULLCONTENT) - renders the window's own content
   even when another app covers it, and without changing focus. Verified live on
   this build (snow map + HUD came through while a browser was on top).
2. Screen-DC BitBlt after SW_RESTORE/SetForegroundWindow - the older path. It
   only sees the game when the window is actually frontmost, so it is kept as a
   fallback and its result is still checked for blank/black.

Neither path uses SendInput. The client's own screenshot native 0xCE4AB0 only
reserves a filename in injected sessions, so it is not used.
"""
import ctypes, sys, time
from ctypes import wintypes
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
GDI32 = ctypes.windll.gdi32
USER32 = ctypes.windll.user32


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [("biSize", wintypes.DWORD), ("biWidth", wintypes.LONG),
                ("biHeight", wintypes.LONG), ("biPlanes", wintypes.WORD),
                ("biBitCount", wintypes.WORD), ("biCompression", wintypes.DWORD),
                ("biSizeImage", wintypes.DWORD), ("biXPelsPerMeter", wintypes.LONG),
                ("biYPelsPerMeter", wintypes.LONG), ("biClrUsed", wintypes.DWORD),
                ("biClrImportant", wintypes.DWORD)]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", wintypes.DWORD * 3)]


def game_window(pid=None):
    found = []
    enum = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

    def cb(handle, _):
        length = USER32.GetWindowTextLengthW(handle)
        if not length:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        USER32.GetWindowTextW(handle, buf, length + 1)
        if USER32.IsWindowVisible(handle) and ('Europa' in buf.value or 'Ring of Elysium' in buf.value):
            if pid is not None:
                owner = wintypes.DWORD()
                USER32.GetWindowThreadProcessId(handle, ctypes.byref(owner))
                if owner.value != pid:
                    return True
            found.append((handle, buf.value))
        return True

    USER32.EnumWindows(enum(cb), 0)
    return found[0] if found else (None, None)


def _read_bits(mem, bmp, w, h):
    info = BITMAPINFO()
    info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    info.bmiHeader.biWidth, info.bmiHeader.biHeight = w, -h   # top-down
    info.bmiHeader.biPlanes, info.bmiHeader.biBitCount = 1, 32
    buffer = ctypes.create_string_buffer(w * h * 4)
    got = GDI32.GetDIBits(mem, bmp, 0, h, buffer, ctypes.byref(info), 0)
    if not got:
        raise RuntimeError('GetDIBits returned 0')
    return Image.frombuffer('RGB', (w, h), buffer.raw, 'raw', 'BGRX', 0, 1)


def _print_window(handle, w, h):
    hdc = USER32.GetWindowDC(handle)
    mem = GDI32.CreateCompatibleDC(hdc)
    bmp = GDI32.CreateCompatibleBitmap(hdc, w, h)
    GDI32.SelectObject(mem, bmp)
    try:
        if not USER32.PrintWindow(handle, mem, 2):   # PW_RENDERFULLCONTENT
            return None
        return _read_bits(mem, bmp, w, h)
    finally:
        GDI32.SelectObject(mem, bmp)
        GDI32.DeleteDC(mem)
        GDI32.DeleteObject(bmp)
        USER32.ReleaseDC(handle, hdc)


def _screen_grab(handle, w, h):
    USER32.ShowWindow(handle, 9)          # SW_RESTORE
    USER32.SetForegroundWindow(handle)
    time.sleep(1.2)
    rect = wintypes.RECT()
    USER32.GetWindowRect(handle, ctypes.byref(rect))
    screen = USER32.GetDC(0)
    mem = GDI32.CreateCompatibleDC(screen)
    bmp = GDI32.CreateCompatibleBitmap(screen, w, h)
    GDI32.SelectObject(mem, bmp)
    try:
        SRCCOPY, CAPTUREBLT = 0x00CC0020, 0x00000002
        if not GDI32.BitBlt(mem, 0, 0, w, h, screen, rect.left, rect.top, SRCCOPY | CAPTUREBLT):
            raise RuntimeError('BitBlt failed')
        return _read_bits(mem, bmp, w, h)
    finally:
        GDI32.SelectObject(mem, bmp)
        GDI32.DeleteDC(mem)
        GDI32.DeleteObject(bmp)
        USER32.ReleaseDC(0, screen)


def grab(path, pid=None):
    handle, title = game_window(pid)
    if not handle:
        raise SystemExit('no game window found' + (f' for pid {pid}' if pid else ''))
    rect = wintypes.RECT()
    USER32.GetWindowRect(handle, ctypes.byref(rect))
    w, h = rect.right - rect.left, rect.bottom - rect.top
    if w < 50 or h < 50:
        raise SystemExit(f'window looks minimized: {w}x{h}')

    source, image = 'printwindow', None
    try:
        image = _print_window(handle, w, h)
    except Exception as e:
        print('PrintWindow failed:', e, flush=True)
    # A fully black or single-colour grab means the presentation path is not
    # visible to that method; fall back to the screen grab before reporting.
    if image is not None:
        extrema = image.convert('L').getextrema()
        if extrema[1] - extrema[0] < 6:
            image = None
    if image is None:
        source, image = 'screen', _screen_grab(handle, w, h)
    image.save(path)
    print(f'{path.name} {w}x{h} title={title} source={source}', flush=True)
    extrema = image.convert('L').getextrema()
    print('luminance range', extrema, 'blank' if extrema[1] - extrema[0] < 6 else 'content', flush=True)
    return path


if __name__ == '__main__':
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'screen.png'
    grab(out)
