using System;
using System.Runtime.InteropServices;
// Usage: attach.exe <hwnd> <x> <y> <width> <height>  -- parks a window behind the desktop icons.
class P {
  delegate bool EP(IntPtr h, IntPtr l);
  [DllImport("user32")] static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32")] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
  [DllImport("user32")] static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr w, IntPtr l, uint f, uint t, out IntPtr r);
  [DllImport("user32")] static extern bool EnumWindows(EP p, IntPtr l);
  [DllImport("user32")] static extern IntPtr SetParent(IntPtr c, IntPtr p);
  [DllImport("user32")] static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f);
  static void Main(string[] a) {
    var h = (IntPtr)long.Parse(a[0]);
    int x = int.Parse(a[1]), y = int.Parse(a[2]), w = int.Parse(a[3]), ht = int.Parse(a[4]);
    var prog = FindWindow("Progman", null); IntPtr r;
    SendMessageTimeout(prog, 0x052C, IntPtr.Zero, IntPtr.Zero, 0, 1000, out r); // spawn the WorkerW layer
    IntPtr worker = IntPtr.Zero;
    EnumWindows((t, l) => {
      if (FindWindowEx(t, IntPtr.Zero, "SHELLDEF_DefView", null) != IntPtr.Zero)
        worker = FindWindowEx(IntPtr.Zero, t, "WorkerW", null);
      return true; }, IntPtr.Zero);
    if (worker != IntPtr.Zero) { SetParent(h, worker); SetWindowPos(h, IntPtr.Zero, x, y, w, ht, 0x14); }
    else { SetParent(h, prog); SetWindowPos(h, (IntPtr)1, x, y, w, ht, 0x10); } // newer Windows 11 layout: HWND_BOTTOM
  }
}
