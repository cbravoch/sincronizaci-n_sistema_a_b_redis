"""
Benchmark para crear departamentos vía API de Laravel.
Objetivo: medir latencia y throughput generando N inserciones contra el endpoint REST.
Requiere: pip install requests
Ejemplo:
    python tests/perf_departments_api.py --api http://localhost:8000/api/departments --count 1000 --concurrency 20
"""

import argparse
import concurrent.futures
import time
import uuid
from typing import Dict, Tuple

import requests
import mysql.connector  # type: ignore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark de inserciones contra API Laravel")
    parser.add_argument("--api", default="http://localhost:8000/api/departments", help="URL del endpoint POST de creación")
    parser.add_argument("--count", type=int, default=1000, help="Cantidad de inserciones a ejecutar")
    parser.add_argument("--concurrency", type=int, default=10, help="Cantidad de hilos concurrentes")
    parser.add_argument("--timeout", type=float, default=5.0, help="Timeout por request en segundos")
    parser.add_argument("--token", default=None, help="Bearer token si el endpoint requiere auth")
    parser.add_argument("--start-id", type=int, default=1, help="Semilla para generar códigos únicos")
    parser.add_argument("--prefix", default="TEST-CC", help="Prefijo para cost_center_code en pruebas")
    parser.add_argument("--cleanup", action="store_true", help="Eliminar datos de prueba al finalizar en db-a y db-b")
    parser.add_argument("--db-a-host", default="host.docker.internal", help="Host de MySQL system_a")
    parser.add_argument("--db-a-port", type=int, default=3307, help="Puerto de MySQL system_a")
    parser.add_argument("--db-a-user", default="user")
    parser.add_argument("--db-a-password", default="pass")
    parser.add_argument("--db-a-name", default="system_a")
    parser.add_argument("--db-b-host", default="host.docker.internal", help="Host de MySQL system_b")
    parser.add_argument("--db-b-port", type=int, default=3308, help="Puerto de MySQL system_b")
    parser.add_argument("--db-b-user", default="user")
    parser.add_argument("--db-b-password", default="pass")
    parser.add_argument("--db-b-name", default="system_b")
    return parser.parse_args()


def build_payload(idx: int, start_id: int, prefix: str) -> Dict[str, str]:
    suffix = uuid.uuid4().hex[:8]
    return {
        "name": f"Perf Dept {idx}-{suffix}",
        "cost_center_code": f"{prefix}{start_id + idx:05d}",
    }


def send_request(session: requests.Session, url: str, payload: Dict[str, str], timeout: float) -> Tuple[int, float, str]:
    t0 = time.perf_counter()
    resp = session.post(url, json=payload, timeout=timeout)
    elapsed = time.perf_counter() - t0
    return resp.status_code, elapsed, resp.text


def cleanup_databases(prefix: str, args: argparse.Namespace) -> Dict[str, int]:
    deleted = {"db_a": 0, "db_b": 0}
    like_pattern = f"{prefix}%"

    conn_a = mysql.connector.connect(
        host=args.db_a_host,
        port=args.db_a_port,
        user=args.db_a_user,
        password=args.db_a_password,
        database=args.db_a_name,
    )
    cur_a = conn_a.cursor()
    cur_a.execute("DELETE FROM departments WHERE cost_center_code LIKE %s", (like_pattern,))
    deleted["db_a"] = cur_a.rowcount
    conn_a.commit()
    cur_a.close()
    conn_a.close()

    conn_b = mysql.connector.connect(
        host=args.db_b_host,
        port=args.db_b_port,
        user=args.db_b_user,
        password=args.db_b_password,
        database=args.db_b_name,
    )
    cur_b = conn_b.cursor()
    cur_b.execute("DELETE FROM departments WHERE cost_center_code LIKE %s", (like_pattern,))
    deleted["db_b"] = cur_b.rowcount
    conn_b.commit()
    cur_b.close()
    conn_b.close()

    return deleted


def main() -> None:
    args = parse_args()
    total = max(args.count, 0)
    workers = max(1, args.concurrency)
    headers = {"Content-Type": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    session = requests.Session()
    session.headers.update(headers)

    results = []

    def task(idx: int):
        payload = build_payload(idx, args.start_id, args.prefix)
        return send_request(session, args.api, payload, args.timeout)

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(task, i) for i in range(total)]
        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())
    elapsed = time.perf_counter() - t_start

    ok = [r for r in results if 200 <= r[0] < 300]
    failures = [r for r in results if r[0] < 200 or r[0] >= 300]

    avg_latency_ms = (sum(r[1] for r in results) / len(results) * 1000) if results else 0
    p50 = sorted(r[1] for r in results)[len(results) // 2] * 1000 if results else 0

    print(f"Total requests: {len(results)} in {elapsed:.3f}s")
    print(f"Success: {len(ok)} | Fail: {len(failures)}")
    print(f"Avg latency: {avg_latency_ms:.2f} ms | p50: {p50:.2f} ms")
    if failures:
        print("Ejemplos de errores (hasta 5):")
        for status, dur, body in failures[:5]:
            print(f"  status={status} time={dur*1000:.2f}ms body={body[:120]}")
    if args.cleanup:
        deleted = cleanup_databases(args.prefix, args)
        print(f"Limpieza completada: db-a={deleted['db_a']} filas, db-b={deleted['db_b']} filas")


if __name__ == "__main__":
    main()
