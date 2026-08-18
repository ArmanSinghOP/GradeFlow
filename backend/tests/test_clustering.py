import pytest
import numpy as np
from app.clustering.cluster import compute_clusters, detect_bridge_essays, ClusterResult

def test_compute_clusters_basic():
    embeddings = np.random.rand(50, 1536).tolist()
    labels = compute_clusters(embeddings)
    assert len(labels) == 50
    for label in labels:
        assert isinstance(label, int)
        assert label >= 0

def test_compute_clusters_k_calculation():
    # 100 -> round(100/25) = 4
    embeddings_100 = np.random.rand(100, 1536).tolist()
    labels_100 = compute_clusters(embeddings_100)
    assert len(set(labels_100)) == 4

    # 25 -> max(1, round(25/25)) = 1
    embeddings_25 = np.random.rand(25, 1536).tolist()
    labels_25 = compute_clusters(embeddings_25)
    assert len(set(labels_25)) == 1

    # 200 -> round(200/25) = 8
    embeddings_200 = np.random.rand(200, 1536).tolist()
    labels_200 = compute_clusters(embeddings_200)
    assert len(set(labels_200)) == 8

def test_compute_clusters_small_batch():
    # 3 -> k must be 1 (since max(1, 0)) -> clamped to n = 3 -> 1
    embeddings_3 = np.random.rand(3, 1536).tolist()
    labels_3 = compute_clusters(embeddings_3)
    assert len(set(labels_3)) == 1

def test_detect_bridge_essays_returns_correct_length():
    embeddings = np.random.rand(50, 1536).tolist()
    labels = compute_clusters(embeddings)
    bridges = detect_bridge_essays(embeddings, labels)
    
    assert len(bridges) == 50
    for flag in bridges:
        assert isinstance(flag, bool)

def test_detect_bridge_essays_cap():
    embeddings = np.random.rand(100, 1536).tolist()
    labels = compute_clusters(embeddings)
    bridges = detect_bridge_essays(embeddings, labels)
    
    true_count = sum(bridges)
    assert true_count <= 20 # 20% cap

def test_cluster_result_dataclass():
    cr = ClusterResult(
        cluster_labels=[0, 1, 0],
        bridge_flags=[False, True, False],
        k=2,
        cluster_sizes={0: 2, 1: 1}
    )
    assert cr.k == 2
    assert cr.cluster_sizes[1] == 1
    assert cr.cluster_labels[1] == 1
    assert cr.bridge_flags[1] is True
