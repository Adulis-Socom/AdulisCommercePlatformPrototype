# Background-removal experiment (prototype only)

A small local adapter that lets Seller Console > Products > Create/Edit Product > Media remove a photo's background
with real `rembg` inference. It is a research tool for the prototype, not part of any production system.

- Runs only on this computer (`127.0.0.1:8765`). Photos are never sent to an online service.
- The prototype works normally without it; the Media panel then says the adapter is not running.
- One admitted model: `u2netp` (see `models.json`). Models not in that file cannot run.
- The limits (10 MB, 16 megapixels, 60 s, one image at a time) are experiment defaults, not product policy.

## One-time setup (Windows, Python 3.11 to 3.13)

```
cd tools\bg-removal
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python setup_models.py
```

`setup_models.py` downloads the single checkpoint listed in `models.json` and checks its size and SHA-256.
The `.venv` and `models` folders are git-ignored.

## Start and stop

1. Start the adapter in its own terminal: `.venv\Scripts\python adapter.py`
   It prints a **token** for this run. The first start takes about 20 seconds while `rembg` loads.
2. Start the prototype (repo root): `pnpm dev` (open it at `http://127.0.0.1:8443` or `http://localhost:8443`).
3. Seller Console > Products > Create Product > Media: add a photo, select it, paste the token, press
   **Remove background**.
4. Stop the adapter with `Ctrl+C` in its terminal. A new token is created on every start.

Allowed web origins are ports 8443, 5173 and 4173 on `localhost` / `127.0.0.1`. To allow another port, start the
adapter with `ADAPTER_APP_PORTS=8443,9000` set.

## Tests

```
cd tools\bg-removal
.venv\Scripts\python -m unittest test_adapter -v
.venv\Scripts\python smoke.py <output folder>
```

`test_adapter` starts a real adapter. Everything in it is a refusal that must happen before inference, except
`test_actual_inference_returns_a_real_alpha_png`, which runs the model. `smoke.py` runs one real photograph
through the HTTP endpoint and writes the evidence files.

## What the adapter checks

Loopback-only binding; `Host` and `Origin` allowlists; a per-run token; no URL or file-path input; models limited to
`models.json`; checkpoint SHA-256 verified before each first load; JPEG, PNG or single-frame WebP only, checked by actually
decoding the image (size is read from the header first); one inference at a time (others get 429); a 60 second
response bound.

Known limit: after a timeout or Cancel the browser stops waiting, but native inference cannot be interrupted, so the
adapter stays busy until that image finishes (a few seconds at most for the admitted model). The prototype ignores
any late result.
