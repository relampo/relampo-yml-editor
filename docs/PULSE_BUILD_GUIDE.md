# Pulse: Ultra-Low-Noise Load Generation Build Guide

This document explains the architecture and business value of the Pulse load generation engine.

---

## 🏢 Business Perspective: Why Pulse?
*For Investors, Partners, and Stakeholders.*

### 1. Market Opportunity
Load testing is a multi-billion dollar market dominated by tools like K6 (Grafana), JMeter, and Gatling. However, these tools suffer from high resource overhead and "noise" that can distend performance results.

### 2. The Pulse Advantage: 40% Better Efficiency
Pulse is built for **Ultra-Low-Noise**. It generates more load with fewer servers.
- **Cost Reduction:** Reduces infrastructure costs for load testing by up to 40% compared to K6.
- **Accuracy:** Lower "jitter" and background noise ensure that performance spikes detected are from the application, not the load generator.
- **Scalability:** Processes 10K+ virtual users per core using a custom State Machine scheduler.

### 3. ROI and Value Proposition
Using Pulse allows organizations to validate extreme scale (Black Friday, product launches) with a fraction of the hardware budget of competitors.

---

## 🛠️ Technical Perspective: How it's Built
*For Performance Engineers, SREs, and Developers.*

### 1. High-Performance Architecture
Pulse is written in Go and leverages advanced concurrency patterns:
- **State Machine Scheduler:** Instead of the standard `goroutine-per-VU` model, Pulse uses an event-driven state machine to manage thousands of users with minimal context switching.
- **Zero-Copy Body Reading:** Efficiently processes large response bodies without full memory copies.
- **Adaptive Metrics Sampling:** At high RPS, Pulse intelligently samples metrics to prevent the aggregator from becoming a CPU bottleneck.

### 2. Built-in Optimizations
Pulse includes Phase 1-3 optimizations:
- **Object Pooling:** Reuses buffers and timers to reduce GC pressure.
- **String Interning:** Minimizes memory footprint for repetitive data.
- **Connection Warmup:** Pre-establishes TCP/TLS sessions to eliminate cold-start latency.

### 3. Extensible Specification (Relampo v1.1)
The Relampo specification allows for complex scenarios with:
- **Controllers:** `if`, `loop`, `retry`, `group`.
- **Think Time:** Global and local timers to simulate real user behavior.
- **Extractors & Assertions:** Comprehensive data extraction and validation pipeline.

---

*Generated for the Relampo YAML Editor ecosystem.*
