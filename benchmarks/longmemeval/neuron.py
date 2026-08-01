import json
import subprocess
import tempfile
from pathlib import Path

from ..models import Document
from .base import MemoryProvider


class NeuronMemoryProvider(MemoryProvider):
    name = "neuron"
    description = (
        "Persistent, local-only hybrid semantic memory engine powered by SQLite WAL mode, "
        "FTS5 full-text indexing, and local BGE vector embeddings (Xenova/bge-small-en-v1.5) "
        "with Reciprocal Rank Fusion (RRF)."
    )
    kind = "local"
    link = "https://github.com/kovartravis/neuron"
    concurrency = 1

    def __init__(self):
        self._proc: subprocess.Popen | None = None
        self._req_id = 0
        self._temp_dir: str | None = None

    def _ensure_proc(self) -> subprocess.Popen:
        if self._proc is None or self._proc.poll() is not None:
            bridge_script = (
                Path(__file__).parents[3] / "scripts" / "neuron_bridge.mjs"
            ).resolve()
            if not bridge_script.exists():
                raise FileNotFoundError(f"Neuron bridge script not found at {bridge_script}")

            self._proc = subprocess.Popen(
                ["node", str(bridge_script)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
        return self._proc

    def _send(self, req: dict) -> dict:
        proc = self._ensure_proc()
        self._req_id += 1
        req["id"] = self._req_id
        line = json.dumps(req) + "\n"
        proc.stdin.write(line)
        proc.stdin.flush()

        resp_line = proc.stdout.readline()
        if not resp_line:
            err = proc.stderr.read() if proc.stderr else ""
            raise RuntimeError(f"Neuron bridge terminated unexpectedly. Stderr: {err}")

        resp = json.loads(resp_line)
        if resp.get("status") == "error":
            raise RuntimeError(f"Neuron error: {resp.get('error')}")
        return resp

    def prepare(self, store_dir: Path, unit_ids: set[str] | None = None, reset: bool = True) -> None:
        db_dir = store_dir / "neuron"
        db_dir.mkdir(parents=True, exist_ok=True)
        db_path = db_dir / "bench.sqlite"
        self._send({"action": "prepare", "dbPath": str(db_path)})

    def ingest(self, documents: list[Document]) -> None:
        if self._proc is None:
            if self._temp_dir is None:
                self._temp_dir = tempfile.mkdtemp(prefix="neuron_bench_")
            db_path = Path(self._temp_dir) / "bench.sqlite"
            self._send({"action": "prepare", "dbPath": str(db_path)})

        docs_payload = [
            {"id": doc.id, "content": doc.content, "user_id": doc.user_id}
            for doc in documents
        ]
        self._send({"action": "ingest", "documents": docs_payload})

    def retrieve(
        self,
        query: str,
        k: int = 10,
        user_id: str | None = None,
        query_timestamp: str | None = None,
    ) -> tuple[list[Document], dict | None]:
        if self._proc is None:
            if self._temp_dir is None:
                self._temp_dir = tempfile.mkdtemp(prefix="neuron_bench_")
            db_path = Path(self._temp_dir) / "bench.sqlite"
            self._send({"action": "prepare", "dbPath": str(db_path)})

        resp = self._send({
            "action": "retrieve",
            "query": query,
            "k": k,
            "user_id": user_id,
        })

        raw_docs = resp.get("documents", [])
        docs = [
            Document(id=d["id"], content=d["content"], user_id=d.get("user_id"))
            for d in raw_docs
        ]
        return docs, {"results": raw_docs}

    def cleanup(self) -> None:
        if self._proc is not None:
            try:
                self._send({"action": "cleanup"})
                self._proc.terminate()
            except Exception:
                pass
            self._proc = None
