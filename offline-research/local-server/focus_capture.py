"""Capture the game window after briefly giving it focus.

The client pauses rendering while it is not the foreground window, so
PrintWindow returns a stale frame. Focus is handed back to the previously
active window straight after the capture.
"""
import argparse
import ctypes
import time
from ctypes import wintypes
from pathlib import Path

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

PW_RENDERFULLCONTENT = 2
DIB_RGB_COLORS = 0


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD), ('biWidth', wintypes.LONG), ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD), ('biBitCount', wintypes.WORD), ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD), ('biXPelsPerMeter', wintypes.LONG),
        ('biYPelsPerMeter', wintypes.LONG), ('biClrUsed', wintypes.DWORD), ('biClrImportant', wintypes.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [('bmiHeader', BITMAPINFOHEADER), ('bmiColors', wintypes.DWORD * 3)]


def find_window(title_part):
    found = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def callback(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        if length:
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            if title_part in buffer.value:
                found.append((hwnd, buffer.value))
        return True

    user32.EnumWindows(callback, 0)
    return found


def grab(hwnd):
    rect = wintypes.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    width, height = rect.right - rect.left, rect.bottom - rect.top
    window_dc = user32.GetWindowDC(hwnd)
    memory_dc = gdi32.CreateCompatibleDC(window_dc)
    bitmap = gdi32.CreateCompatibleBitmap(window_dc, width, height)
    gdi32.SelectObject(memory_dc, bitmap)
    ok = user32.PrintWindow(hwnd, memory_dc, PW_RENDERFULLCONTENT)
    info = BITMAPINFO()
    info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    info.bmiHeader.biWidth = width
    info.bmiHeader.biHeight = -height
    info.bmiHeader.biPlanes = 1
    info.bmiHeader.biBitCount = 32
    buffer = ctypes.create_string_buffer(width * height * 4)
    gdi32.GetDIBits(memory_dc, bitmap, 0, height, buffer, ctypes.byref(info), DIB_RGB_COLORS)
    gdi32.DeleteObject(bitmap)
    gdi32.DeleteDC(memory_dc)
    user32.ReleaseDC(hwnd, window_dc)
    return ok, width, height, buffer.raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--title', default='Ring of Elysium')
    parser.add_argument('--settle', type=float, default=0.7)
    args = parser.parse_args()
    windows = find_window(args.title)
    if not windows:
        raise SystemExit('no matching window')
    hwnd, title = windows[0]
    previous = user32.GetForegroundWindow()
    # SetForegroundWindow is refused for a background process; SwitchToThisWindow
    # still promotes the game so it renders a fresh frame.
    user32.SwitchToThisWindow(hwnd, True)
    time.sleep(args.settle)
    ok, width, height, raw = grab(hwnd)
    if previous and previous != hwnd:
        user32.SwitchToThisWindow(previous, True)
    from PIL import Image
    image = Image.frombytes('RGBA', (width, height), raw).convert('RGB')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    print(f'{title!r} hwnd={hwnd} printwindow={ok} {width}x{height} -> {args.output}')


if __name__ == '__main__':
    main()
