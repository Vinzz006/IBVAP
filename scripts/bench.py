import os
import sys
import time
import psutil
import statistics
from pathlib import Path
from typing import List, Dict, Any
import numpy as np

# Ensure root is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import TEST_VIDEOS_DIR, settings
from backend.services.video_processor import VideoProcessor, camera_manager

def run_benchmark(num_cameras: int = 1, duration_seconds: float = 10.0) -> Dict[str, Any]:
    print(f"\n=======================================================")
    print(f"▶ RUNNING BENCHMARK: {num_cameras} CAMERA(S) FOR {duration_seconds}s")
    print(f"=======================================================")

    video_files = [
        "scenario_border_intrusion.mp4",
        "scenario_night_movement.mp4",
        "scenario_vehicle_checkpoint.mp4",
        "scenario_normal_patrol.mp4"
    ]

    process = psutil.Process(os.getpid())
    cpu_measurements = []
    ram_measurements = []

    processors = []
    for i in range(num_cameras):
        cam_id = f"BENCH-CAM-{i+1:02d}"
        video_name = video_files[i % len(video_files)]
        video_path = str(TEST_VIDEOS_DIR / video_name)
        proc = VideoProcessor(
            camera_id=cam_id,
            camera_name=f"Benchmark Camera {i+1}",
            location=f"Sector {chr(65+i)}",
            stream_url=video_path,
            zone_polygon=[[0.2, 0.4], [0.8, 0.4], [0.85, 0.9], [0.15, 0.9]]
        )
        processors.append(proc)

    # Warmup and start
    start_time = time.time()
    for proc in processors:
        proc.start()

    # Sampling loop
    while (time.time() - start_time) < duration_seconds:
        time.sleep(0.5)
        cpu_measurements.append(process.cpu_percent())
        ram_measurements.append(process.memory_info().rss / (1024 * 1024))

    # Stop all
    for proc in processors:
        proc.stop()

    fps_list = [p.latest_telemetry.get("fps", 0.0) for p in processors]
    avg_fps_per_cam = statistics.mean(fps_list) if fps_list else 0.0
    agg_fps = sum(fps_list)

    # Calculate stage averages across all processors
    combined_stages = {}
    for proc in processors:
        for stage, total_t in proc.stage_timings.items():
            cnt = max(1, proc.stage_counts.get(stage, 1))
            ms = (total_t / cnt) * 1000
            combined_stages.setdefault(stage, []).append(ms)

    stage_breakdown = {stage: round(statistics.mean(vals), 2) for stage, vals in combined_stages.items()}
    latencies = [p.latest_telemetry.get("latency_ms", 0.0) for p in processors if p.latest_telemetry.get("latency_ms", 0.0) > 0]
    
    mean_latency = round(statistics.mean(latencies), 2) if latencies else 0.0
    p95_latency = round(np.percentile(latencies, 95), 2) if latencies else mean_latency
    avg_cpu = round(statistics.mean(cpu_measurements), 1) if cpu_measurements else 0.0
    avg_ram = round(statistics.mean(ram_measurements), 1) if ram_measurements else 0.0

    print(f"\n--- Benchmark Results ({num_cameras} Cams) ---")
    print(f"• Avg FPS / Camera:   {avg_fps_per_cam:.1f} FPS")
    print(f"• Aggregate FPS:      {agg_fps:.1f} FPS")
    print(f"• Mean Latency:       {mean_latency:.1f} ms")
    print(f"• p95 Latency:        {p95_latency:.1f} ms")
    print(f"• Avg CPU Usage:      {avg_cpu:.1f} %")
    print(f"• Avg RAM Usage:      {avg_ram:.1f} MB")
    print("• Per-Stage Timing (ms):")
    for stg, ms in stage_breakdown.items():
        print(f"   - {stg.ljust(18)}: {ms:6.2f} ms")

    return {
        "num_cameras": num_cameras,
        "avg_fps_per_cam": avg_fps_per_cam,
        "agg_fps": agg_fps,
        "mean_latency": mean_latency,
        "p95_latency": p95_latency,
        "avg_cpu": avg_cpu,
        "avg_ram": avg_ram,
        "stage_breakdown": stage_breakdown
    }

def main():
    results = {}
    for nc in [1, 2, 4]:
        results[nc] = run_benchmark(num_cameras=nc, duration_seconds=8.0)

    print("\n=======================================================")
    print("SUMMARY OF BENCHMARK RUN")
    print("=======================================================")
    print(f"{'Cameras':<10} | {'FPS/Cam':<10} | {'Agg FPS':<10} | {'Mean Lat (ms)':<15} | {'p95 Lat (ms)':<15} | {'CPU %':<8} | {'RAM (MB)':<10}")
    print("-" * 85)
    for nc, r in results.items():
        print(f"{r['num_cameras']:<10} | {r['avg_fps_per_cam']:<10.1f} | {r['agg_fps']:<10.1f} | {r['mean_latency']:<15.1f} | {r['p95_latency']:<15.1f} | {r['avg_cpu']:<8.1f} | {r['avg_ram']:<10.1f}")

if __name__ == "__main__":
    main()
