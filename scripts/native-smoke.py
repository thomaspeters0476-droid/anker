"""Capacitor WebView smoke via Chrome DevTools Protocol (adb forward 9222)."""
from __future__ import annotations

import asyncio
import json
import subprocess
import sys
import time
import urllib.request

import websockets

# Live-API hat oft Paywall enforced — Smoke prüft Intro-Exit, Shell, Settings, Paywall/Hauptfläche.


async def eval_js(ws, expression: str, n_holder: list[int]):
    n_holder[0] += 1
    n = n_holder[0]
    await ws.send(
        json.dumps(
            {
                "id": n,
                "method": "Runtime.evaluate",
                "params": {"expression": expression, "returnByValue": True},
            }
        )
    )
    while True:
        msg = json.loads(await ws.recv())
        if msg.get("id") == n:
            if "error" in msg:
                raise RuntimeError(msg["error"])
            return msg["result"]["result"].get("value")


def adb(*args: str) -> str:
    r = subprocess.run(["adb", *args], capture_output=True, text=True, check=False)
    return (r.stdout or "") + (r.stderr or "")


def launch(pkg: str) -> None:
    adb("shell", "am", "force-stop", pkg)
    adb("shell", "am", "start", "-n", f"{pkg}/.MainActivity")
    time.sleep(5)


def forward_devtools(pkg: str) -> None:
    pid = adb("shell", "pidof", pkg).strip().split()[0]
    if not pid:
        raise RuntimeError(f"no pid for {pkg}")
    adb("forward", "--remove", "tcp:9222")
    adb("forward", "tcp:9222", f"localabstract:webview_devtools_remote_{pid}")
    time.sleep(0.4)


STEPS = [
    (
        "skip_intro_if_present",
        """(() => {
          const intro = document.querySelector('.intro-screen');
          if (!intro) return { ok: true, detail: 'already-done' };
          const b = [...document.querySelectorAll('button')].find((x) =>
            /Überspringen|Skip/i.test(x.textContent || '')
          );
          if (!b) return { ok: false, detail: 'no-skip' };
          b.click();
          return { ok: true, detail: 'skipped' };
        })()""",
    ),
    (
        "after_intro_clean",
        """(() => {
          const hasIntro = !!document.querySelector('.intro-screen');
          const settingsOpen = !!document.querySelector(
            'details.settings-panel--from-gear[open]'
          );
          return {
            ok: !hasIntro && !settingsOpen,
            hasIntro,
            settingsOpen,
            snippet: document.body.innerText.slice(0, 220),
          };
        })()""",
    ),
    (
        "shell_or_paywall",
        """(() => {
          const text = document.body.innerText;
          const paywall = /Abo|Trial|Anmelden|Subscribe|Sign in/i.test(text)
            && !!document.querySelector('.paywall, [class*="paywall"]')
            || /mit Abo|Zum Freischalten|7 Tage Trial/i.test(text);
          const homeSchublade = /Jetzt dran|Reinwerfen|Zum Holen/i.test(text);
          const homeAnker = /Tagesanker/i.test(text) && (
            /BUDDY|Kapazität|Arbeit|Alltag|Fokus|Geistesblitz|Ruhe/i.test(text)
          );
          return {
            ok: paywall || homeSchublade || homeAnker,
            paywall,
            homeSchublade,
            homeAnker,
          };
        })()""",
    ),
    (
        "open_settings",
        """(() => {
          const g = [...document.querySelectorAll('button')].find((x) =>
            /Einstellungen|Settings/i.test(x.textContent || '')
            || /Einstellungen|Settings/i.test(x.getAttribute('aria-label') || '')
          );
          if (!g) return { ok: false, detail: 'no-gear' };
          g.click();
          return { ok: true, detail: 'clicked' };
        })()""",
    ),
    (
        "settings_open",
        """(() => {
          const open = !!document.querySelector('details.settings-panel--from-gear[open]')
            || !!document.querySelector('.settings-panel[open]')
            || !!document.querySelector('.shell-settings-panel')
            || /Geräte-Sync|Hilfe/i.test(document.body.innerText);
          return { ok: open };
        })()""",
    ),
    (
        "close_settings",
        """(() => {
          const okBtn = [...document.querySelectorAll('button')].find((x) =>
            /^OK$/i.test((x.textContent || '').trim())
          );
          if (okBtn) { okBtn.click(); return { ok: true, detail: 'ok' }; }
          const g = [...document.querySelectorAll('button')].find((x) =>
            /Einstellungen|Settings/i.test(x.textContent || '')
            || /Einstellungen|Settings/i.test(x.getAttribute('aria-label') || '')
          );
          if (g) { g.click(); return { ok: true, detail: 'gear' }; }
          return { ok: false, detail: 'no-close' };
        })()""",
    ),
    (
        "settings_closed",
        """(() => ({
          ok: !document.querySelector('details.settings-panel--from-gear[open]'),
        }))()""",
    ),
]


async def smoke(pkg: str) -> list[tuple[str, bool, object]]:
    launch(pkg)
    forward_devtools(pkg)
    pages = None
    for _ in range(40):
        try:
            pages = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
            if pages:
                break
        except Exception:
            await asyncio.sleep(0.25)
    if not pages:
        raise RuntimeError("no webview")

    results: list[tuple[str, bool, object]] = []
    n_holder = [0]
    async with websockets.connect(pages[0]["webSocketDebuggerUrl"]) as ws:
        for _ in range(50):
            ready = await eval_js(
                ws, "!!document.getElementById('root')?.childElementCount", n_holder
            )
            if ready:
                break
            await asyncio.sleep(0.2)

        for name, expr in STEPS:
            try:
                val = await eval_js(ws, expr, n_holder)
                await asyncio.sleep(0.5)
                ok = bool(val.get("ok")) if isinstance(val, dict) else bool(val)
                results.append((name, ok, val))
            except Exception as e:
                results.append((name, False, str(e)))
    return results


async def main() -> int:
    apps = [
        ("schublade", "de.tagesanker.schublade"),
        ("anker", "de.tagesanker.app"),
    ]
    if len(sys.argv) > 1:
        want = set(sys.argv[1:])
        apps = [a for a in apps if a[0] in want]

    failed = 0
    for product, pkg in apps:
        print(f"\n=== {product} ({pkg}) ===")
        if "package:" not in adb("shell", "pm", "path", pkg):
            print("SKIP — not installed")
            failed += 1
            continue
        # fresh intro each run
        adb("shell", "pm", "clear", pkg)
        try:
            rows = await smoke(pkg)
        except Exception as e:
            print("ERROR", e)
            failed += 1
            continue
        for name, ok, detail in rows:
            mark = "OK" if ok else "FAIL"
            if not ok:
                failed += 1
            print(f"  [{mark}] {name}: {json.dumps(detail, ensure_ascii=False)}")
    print(f"\nfailed_steps={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
