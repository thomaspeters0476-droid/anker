"""Measure Capacitor cold start: am start -W + time to first UI in WebView."""
from __future__ import annotations

import asyncio
import json
import subprocess
import time
import urllib.request

import websockets


def adb(*args: str) -> str:
    return subprocess.run(
        ["adb", *args], capture_output=True, text=True, check=False
    ).stdout


async def cold_start(pkg: str) -> dict:
    adb("shell", "am", "force-stop", pkg)
    await asyncio.sleep(0.4)
    t0 = time.time()
    out = adb("shell", "am", "start", "-W", "-n", f"{pkg}/.MainActivity")
    total = None
    for line in out.splitlines():
        if line.startswith("TotalTime:"):
            total = int(line.split(":", 1)[1].strip())

    pid = adb("shell", "pidof", pkg).strip().split()
    if not pid:
        return {"error": "no pid", "am_total_ms": total}

    adb("forward", "--remove", "tcp:9223")
    adb("forward", "tcp:9223", f"localabstract:webview_devtools_remote_{pid[0]}")
    await asyncio.sleep(0.2)

    pages = None
    for _ in range(50):
        try:
            pages = json.load(urllib.request.urlopen("http://127.0.0.1:9223/json"))
            if pages:
                break
        except Exception:
            pass
        await asyncio.sleep(0.15)
    if not pages:
        return {"error": "no pages", "am_total_ms": total}

    n = 0

    async with websockets.connect(pages[0]["webSocketDebuggerUrl"]) as ws:

        async def ev(expr: str):
            nonlocal n
            n += 1
            await ws.send(
                json.dumps(
                    {
                        "id": n,
                        "method": "Runtime.evaluate",
                        "params": {"expression": expr, "returnByValue": True},
                    }
                )
            )
            while True:
                msg = json.loads(await ws.recv())
                if msg.get("id") == n:
                    return msg["result"]["result"].get("value")

        for _ in range(100):
            ready = await ev(
                "!!document.querySelector('.intro-screen, .brand-name, main .block, [class*=paywall]')"
            )
            if ready:
                break
            await asyncio.sleep(0.1)
        t1 = time.time()
        return {"am_total_ms": total, "to_ui_ms": int((t1 - t0) * 1000)}


async def main() -> None:
    for pkg in ("de.tagesanker.schublade", "de.tagesanker.app"):
        print(pkg, json.dumps(await cold_start(pkg)))


if __name__ == "__main__":
    asyncio.run(main())
