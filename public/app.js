const $ = (id) => document.getElementById(id);
const state = { token: null, asset: null };
let token = null, assetId = null;

function setStatus(msg, type = 'info') {
    const el = $("status");
    el.textContent = msg;
    el.className = type;
}

function log(msg, data) {
    const t = new Date().toISOString();
    console.log(`[${t}]`, msg, data ?? "");
    $("stamp").textContent = `build: ${t}`;
}
function showError(e) {
    console.error(e);
    const msg = typeof e === 'string' ? e : (e?.message || JSON.stringify(e));
    $("err").textContent = "Error: " + msg;
}

async function doLogin() {
    $("err").textContent = "";
    try {
        log("login:start", { u: $("user").value });

        setStatus("Logging in...", "info");

        const r = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: $("user").value,
                password: $("pass").value
            })
        });
        const text = await r.text();
        log("login:resp:text", text);
        let j; try { j = JSON.parse(text); } catch { throw new Error(`Bad JSON (status ${r.status})`); }
        if (!r.ok || !j.success) throw new Error(j?.error?.message || ("HTTP " + r.status));

        setStatus(`Logged in as ${j.username}`, "ok");

        token = j.data.token;
        // $("who").textContent = JSON.stringify(j, null, 2);
        $("upload").style.display = 'block';
        log("login:ok");
    } catch (e) {
        setStatus("Login failed", "error");
        showError(e);
    }
}

async function doUpload() {

    console.log("doUpload() triggered");
    const f = $("file").files[0];
    console.log("Selected file:", f);

    $("err").textContent = "";
    try {
        const f = $("file").files[0];
        if (!f) throw new Error("Pick a file first");
        const fd = new FormData();
        fd.append('file', f);

        console.log("📤 Uploading file:", f);

        setStatus("Uploading video...", "info");

        const r = await fetch('/api/v1/assets', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: fd
        });

        console.log("Upload response raw:", r);

        const j = await r.json();

        console.log("UPLOAD JSON:", j);

        if (!r.ok || !j.success) throw new Error(j?.error?.message || ("HTTP " + r.status));

        setStatus("Upload successful!", "ok");

        assetId = j.data.assetId;
        state.asset = {
            ...j.data,
            filename: $("file").files[0].name
        };

       //  $("asset").textContent = JSON.stringify(j, null, 2);

        $("process").style.display = 'block';
        const note = $("processNote");
        const btn = $("btnProcess");

        if (state.asset.filename?.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
            note.textContent = "This app only supports video uploads (e.g. .mp4, .mov, .avi, .mkv, .webm).";
            btn.disabled = false;
        } else {
            note.textContent = "Not a video file.";
            btn.disabled = true;
        }

        log("upload:ok", { assetId });
    } catch (e) {
        console.error("UPLOAD ERROR:", e);
        setStatus("Upload failed.", "error");
        showError(e);
    }
}

async function doProcess() {
    $("err").textContent = "";
    try {
        const body = {
            assetId,
            variants: +$("var").value,
            format: $("format").value
        };

        setStatus("Starting transcoding...", "info");

        const r = await fetch('/api/v1/jobs/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error(j?.error?.message || ("HTTP " + r.status));

        setStatus("Transcoding complete!", "ok");

        //$("job").textContent = JSON.stringify(j, null, 2);
        log("process:ok");
    } catch (e) {
        setStatus("Transcoding failed.", "error");
        showError(e);
    }
}

function previewFile() {
    const prev = $("uploadPreview");
    prev.innerHTML = "";
    const f = $("file").files[0];
    if (!f) return;

    if (f.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        img.style.maxWidth = "400px";
        img.onload = () => URL.revokeObjectURL(img.src);
        prev.append("Preview: ", img);
    } else if (f.type.startsWith("video/")) {
        const vid = document.createElement("video");
        vid.src = URL.createObjectURL(f);
        vid.controls = true;
        vid.style.maxWidth = "400px";
        vid.onloadeddata = () => URL.revokeObjectURL(vid.src);
        prev.append("Preview: ", vid);
    } else {
        prev.textContent = "Unsupported file type.";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    $("btnLogin").addEventListener('click', doLogin);
    $("btnUpload").addEventListener('click', doUpload);
    $("btnProcess").addEventListener('click', doProcess);
    $("file").addEventListener('change', previewFile);
    log("page:ready");
});

window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled rejection:", event.reason);
});

