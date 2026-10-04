# Database Systems Lab Report: Indexing Performance Analysis

This report evaluates B-Tree index performance versus full table scans across sequential queries on 1,000,000 synthetic database records.

## Experimental Setup

Queries were executed on PostgreSQL 15 running on 8GB RAM with NVMe SSD storage.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 94821;
```

## Results and Findings

Without an index, average execution time was 84.2 ms. With a B-Tree index on customer_id, average query execution time decreased to 0.12 ms.

> Conclusion: Indexing provides a 700x speedup for point lookups on large tables.
